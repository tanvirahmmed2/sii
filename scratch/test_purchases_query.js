import { queryDb } from '../src/lib/database/db.js';

async function main() {
  const res = await queryDb(
    `SELECT pu.*, 
            p.name AS package_name, 
            p.slug AS package_slug, 
            COALESCE(p.max_websites, 1) AS max_websites,
            COALESCE(p.max_websites, 1) AS max_portfolios,
            pay.id AS payment_id,
            pay.status AS payment_status, 
            pay.transaction_id,
            pay.payment_method,
            pay.currency AS payment_currency,
            pay.amount AS payment_amount,
            pay.payment_date,
            pay.created_at AS payment_created_at
     FROM purchases pu
     LEFT JOIN packages p ON pu.package_id = p.id
     LEFT JOIN payments pay ON pay.purchase_id = pu.id
     WHERE pu.creator_id = 2
     ORDER BY pu.id DESC`
  );
  console.log('Purchases for creator 2:', JSON.stringify(res.rows, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
