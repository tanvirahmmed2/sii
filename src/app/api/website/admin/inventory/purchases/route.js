import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET Purchase Orders
export async function GET() {
  try {
    const result = await query(`
      SELECT p.*, s.name AS supplier_name
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      ORDER BY p.purchase_date DESC, p.id DESC
    `);

    // Fetch individual items for each purchase
    const purchases = [];
    for (const row of result.rows) {
      const itemsRes = await query(`
        SELECT pi.*, i.name AS item_name, i.code AS item_code
        FROM purchase_items pi
        JOIN inventory_items i ON pi.inventory_item_id = i.id
        WHERE pi.purchase_id = $1
      `, [row.id]);
      purchases.push({
        ...row,
        items: itemsRes.rows
      });
    }

    return NextResponse.json({
      success: true,
      paylod: { purchases }
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST Log New Purchase Order (Admin only)
// This will:
// 1. Create a purchase order in `purchases`.
// 2. Add purchase line items to `purchase_items`.
// 3. For each item:
//    a. Increase `total_quantity` and `available_quantity` in `inventory_items`.
//    b. Log a `stock_movements` record.
// 4. Log a general transaction record in `payment_transactions` (Debit for purchase).
export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { supplier_id, purchase_date, paid_amount, remarks, items } = await request.json();

    if (!supplier_id || !purchase_date || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Supplier, date, and line items array are required.' }, { status: 400 });
    }

    // 1. Calculate total purchase amount
    let totalAmount = 0;
    for (const it of items) {
      const q = parseInt(it.quantity, 10);
      const price = parseFloat(it.unit_price);
      if (isNaN(q) || q <= 0 || isNaN(price) || price < 0) {
        return NextResponse.json({ success: false, error: 'Quantity and unit price must be positive numbers.' }, { status: 400 });
      }
      totalAmount += q * price;
    }

    const parsedPaid = parseFloat(paid_amount) || 0;
    let paymentStatus = 'Unpaid';
    if (parsedPaid >= totalAmount) {
      paymentStatus = 'Paid';
    } else if (parsedPaid > 0) {
      paymentStatus = 'Partially Paid';
    }

    // 2. Create purchase order
    const purchaseNo = `PO-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const purchaseRes = await query(`
      INSERT INTO purchases (supplier_id, purchase_number, purchase_date, total_amount, paid_amount, payment_status, remarks)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [supplier_id, purchaseNo, purchase_date, totalAmount, parsedPaid, paymentStatus, remarks?.trim() || null]);

    const purchase = purchaseRes.rows[0];

    // 3. Process line items
    for (const it of items) {
      const q = parseInt(it.quantity, 10);
      const price = parseFloat(it.unit_price);
      const lineTotal = q * price;

      // a. Insert purchase_item
      await query(`
        INSERT INTO purchase_items (purchase_id, inventory_item_id, quantity, unit_price, total_price)
        VALUES ($1, $2, $3, $4, $5)
      `, [purchase.id, it.inventory_item_id, q, price, lineTotal]);

      // b. Update stock quantity
      await query(`
        UPDATE inventory_items SET
          total_quantity = total_quantity + $1,
          available_quantity = available_quantity + $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [q, it.inventory_item_id]);

      // c. Log stock_movements
      await query(`
        INSERT INTO stock_movements (inventory_item_id, quantity, movement_type, reference_id, movement_date, remarks)
        VALUES ($1, $2, 'Purchase', $3, $4, $5)
      `, [it.inventory_item_id, q, purchase.id, purchase_date, `Stock purchase order: ${purchaseNo}`]);
    }

    // 4. Log general debit transaction in general ledger
    const transactionNo = `TXN-INV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    await query(`
      INSERT INTO payment_transactions (
        transaction_number, payment_method, amount, transaction_type, category, 
        reference_id, status, remarks, payment_date
      ) VALUES ($1, 'Cash', $2, 'Debit', 'Purchase', $3, 'Success', $4, $5)
    `, [
      transactionNo,
      parsedPaid, // only record actual out-of-pocket cash paid as debit transaction
      purchase.id,
      `Inventory purchase order payment for: ${purchaseNo}`,
      new Date(purchase_date)
    ]);

    return NextResponse.json({
      success: true,
      message: 'Purchase order logged successfully, inventory stock updated.',
      paylod: { purchase }
    });
  } catch (error) {
    console.error('Error logging purchase order:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
