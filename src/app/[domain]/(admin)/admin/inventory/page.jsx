'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiGrid, FiPlus, FiUsers, FiShoppingBag, FiTruck, FiActivity, FiTrash2, FiFileText } from 'react-icons/fi';

const InventoryPage = () => {
  const [activeTab, setActiveTab] = useState('items');
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form toggles
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showLogPurchase, setShowLogPurchase] = useState(false);

  // Forms
  const [supplierForm, setSupplierForm] = useState({ name: '', contact_name: '', phone: '', email: '', address: '' });
  const [itemForm, setItemForm] = useState({ category_id: '', name: '', code: '', description: '', unit: 'Pcs' });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [purchaseForm, setPurchaseForm] = useState({
    supplier_id: '',
    purchase_date: new Date().toISOString().split('T')[0],
    paid_amount: '',
    remarks: '',
    items: [{ inventory_item_id: '', quantity: '', unit_price: '' }]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const catRes = await fetch('/api/admin/inventory/categories');
      const catData = await catRes.json();
      if (catRes.ok) setCategories(catData.paylod.categories || []);

      const itemsRes = await fetch('/api/admin/inventory/items');
      const itemsData = await itemsRes.json();
      if (itemsRes.ok) setItems(itemsData.paylod.items || []);

      const supRes = await fetch('/api/admin/inventory/suppliers');
      const supData = await supRes.json();
      if (supRes.ok) setSuppliers(supData.paylod.suppliers || []);

      const purRes = await fetch('/api/admin/inventory/purchases');
      const purData = await purRes.json();
      if (purRes.ok) setPurchases(purData.paylod.purchases || []);

      const movRes = await fetch('/api/admin/inventory/movements');
      const movData = await movRes.json();
      if (movRes.ok) setMovements(movData.paylod.movements || []);
    } catch (err) {
      toast.error('Failed to load inventory assets database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSupplierSubmit = async (e) => {
    e.preventDefault();
    if (!supplierForm.name || !supplierForm.phone) {
      toast.error('Supplier name and contact phone are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/inventory/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Supplier registered successfully!');
        setShowAddSupplier(false);
        setSupplierForm({ name: '', contact_name: '', phone: '', email: '', address: '' });
        fetchData();
      } else {
        throw new Error(data.error || 'Failed to register supplier.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    if (!itemForm.category_id || !itemForm.name || !itemForm.code) {
      toast.error('Category, name, and unique item code are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/inventory/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Inventory item registered successfully!');
        setShowAddItem(false);
        setItemForm({ category_id: '', name: '', code: '', description: '', unit: 'Pcs' });
        fetchData();
      } else {
        throw new Error(data.error || 'Failed to register item.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!categoryForm.name) {
      toast.error('Category name is required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/inventory/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Category registered successfully!');
        setShowAddCategory(false);
        setCategoryForm({ name: '', description: '' });
        fetchData();
      } else {
        throw new Error(data.error || 'Failed to register category.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    if (!purchaseForm.supplier_id || !purchaseForm.purchase_date || purchaseForm.items.length === 0) {
      toast.error('Supplier, date, and line items are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/inventory/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(purchaseForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Purchase order logged, inventory updated!');
        setShowLogPurchase(false);
        setPurchaseForm({
          supplier_id: '',
          purchase_date: new Date().toISOString().split('T')[0],
          paid_amount: '',
          remarks: '',
          items: [{ inventory_item_id: '', quantity: '', unit_price: '' }]
        });
        fetchData();
      } else {
        throw new Error(data.error || 'Failed to log purchase order.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPurchaseLine = () => {
    setPurchaseForm((p) => ({
      ...p,
      items: [...p.items, { inventory_item_id: '', quantity: '', unit_price: '' }]
    }));
  };

  const handleRemovePurchaseLine = (index) => {
    setPurchaseForm((p) => ({
      ...p,
      items: p.items.filter((_, i) => i !== index)
    }));
  };

  const handleLineItemChange = (index, field, value) => {
    const updatedLines = [...purchaseForm.items];
    updatedLines[index][field] = value;
    setPurchaseForm((p) => ({ ...p, items: updatedLines }));
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FiShoppingBag className="text-primary animate-pulse" /> Asset Inventory & Supplier Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage inventory item stocks, suppliers directories, purchases orders logging, and track audit stock trails.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowLogPurchase(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-xs"
          >
            <FiPlus /> Log Purchase PO
          </button>
          <button
            onClick={() => setShowAddItem(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-850 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-xs"
          >
            <FiPlus /> Register Item
          </button>
          <button
            onClick={() => setShowAddSupplier(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-xs"
          >
            <FiPlus /> Add Supplier
          </button>
          <button
            onClick={() => setShowAddCategory(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-xs"
          >
            <FiPlus /> New Category
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 gap-1.5 flex-wrap">
        <button
          onClick={() => setActiveTab('items')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'items'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Stock Items ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'suppliers'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Suppliers Directory ({suppliers.length})
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'purchases'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Purchase Orders ({purchases.length})
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'movements'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Stock Movements Audit ({movements.length})
        </button>
      </div>

      {loading ? (
        <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-slate-400">Loading inventory data...</span>
        </div>
      ) : (
        <>
          {/* Stock Items Tab */}
          {activeTab === 'items' && (
            <div className="bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
                <FiGrid className="text-slate-500" />
                <h2 className="text-base font-bold text-slate-800">Inventory Stock Directory</h2>
              </div>

              {items.length === 0 ? (
                <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
                  <span className="text-slate-350 text-5xl mb-3">📦</span>
                  <h3 className="text-sm font-bold text-slate-600">Inventory Empty</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
                    No items registered in stocks. Add stock categories and register your inventory item lists using buttons above.
                  </p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Item Details</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Code</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Total Quantity</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Available Stock</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((it) => (
                        <tr key={it.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-bold text-slate-800">{it.name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{it.description}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-primary bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded">
                              {it.code}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-600 font-semibold">
                            {it.category_name}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-700 font-bold">
                            {it.total_quantity}
                          </td>
                          <td className="px-6 py-4 text-xs">
                            <span className={`font-bold px-2 py-0.5 rounded ${
                              it.available_quantity > 5
                                ? 'text-green-600 bg-green-50'
                                : 'text-amber-600 bg-amber-50'
                            }`}>
                              {it.available_quantity}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400 font-semibold">{it.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Suppliers Tab */}
          {activeTab === 'suppliers' && (
            <div className="bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
                <FiUsers className="text-slate-500" />
                <h2 className="text-base font-bold text-slate-800">Registered Suppliers Directory</h2>
              </div>

              {suppliers.length === 0 ? (
                <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
                  <span className="text-slate-350 text-5xl mb-3">🏢</span>
                  <h3 className="text-sm font-bold text-slate-600">No Suppliers</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
                    No suppliers logged. Register supply partners to create purchase orders directly.
                  </p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Company</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Contact Person</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Phone</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {suppliers.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-4 text-sm font-bold text-slate-800">{s.name}</td>
                          <td className="px-6 py-4 text-xs text-slate-600">{s.contact_name || 'N/A'}</td>
                          <td className="px-6 py-4 text-xs text-slate-700 font-bold">{s.phone}</td>
                          <td className="px-6 py-4 text-xs text-slate-500">{s.email || 'N/A'}</td>
                          <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">{s.address || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Purchases Tab */}
          {activeTab === 'purchases' && (
            <div className="bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
                <FiTruck className="text-slate-500" />
                <h2 className="text-base font-bold text-slate-800">Purchase Orders & Supply Receipts</h2>
              </div>

              {purchases.length === 0 ? (
                <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
                  <span className="text-slate-350 text-5xl mb-3">🧾</span>
                  <h3 className="text-sm font-bold text-slate-600">No Purchases Logged</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
                    No supply purchase histories recorded. Click "Log Purchase PO" to check stocks.
                  </p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">PO Number</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Supplier</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Items Ordered</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tally</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Paid</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {purchases.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-primary bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded">
                              {p.purchase_number}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-600">
                            {new Date(p.purchase_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-700 font-semibold">{p.supplier_name}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-0.5">
                              {p.items?.map((it, i) => (
                                <span key={i} className="text-[10px] text-slate-500">
                                  • {it.item_name} (x{it.quantity})
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-800 font-bold">৳{parseFloat(p.total_amount).toFixed(2)}</td>
                          <td className="px-6 py-4 text-right text-xs text-primary font-bold">৳{parseFloat(p.paid_amount).toFixed(2)}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              p.payment_status === 'Paid'
                                ? 'bg-green-50 text-green-600 border border-green-100'
                                : p.payment_status === 'Partially Paid'
                                ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                : 'bg-red-50 text-red-600 border border-red-100'
                            }`}>
                              {p.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Movements Tab */}
          {activeTab === 'movements' && (
            <div className="bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
                <FiActivity className="text-slate-500" />
                <h2 className="text-base font-bold text-slate-800">Stock Movements History Log</h2>
              </div>

              {movements.length === 0 ? (
                <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
                  <span className="text-slate-350 text-5xl mb-3">📈</span>
                  <h3 className="text-sm font-bold text-slate-600">Movement Log Empty</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
                    No stock issues or incoming audit movements registered yet.
                  </p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Item</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Movement type</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Quantity Flow</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Audit Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {movements.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-bold text-slate-800">{m.item_name}</p>
                              <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-1 rounded">{m.item_code}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-600">
                            {new Date(m.movement_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded ${
                              m.movement_type === 'Purchase'
                                ? 'text-green-600 bg-green-50'
                                : 'text-primary bg-emerald-50'
                            }`}>
                              {m.movement_type}
                            </span>
                          </td>
                          <td className={`px-6 py-4 text-xs font-bold ${
                            m.quantity >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {m.quantity >= 0 ? `+${m.quantity}` : m.quantity}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500 max-w-sm truncate" title={m.remarks}>
                            {m.remarks}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplier && (
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl w-full max-w-md animate-scale-up">
            <h3 className="text-base font-bold text-slate-850 border-b border-slate-50 pb-2 mb-4">Register Supplier</h3>
            <form onSubmit={handleSupplierSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Company / Supplier Name *</label>
                <input
                  type="text"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Person</label>
                  <input
                    type="text"
                    value={supplierForm.contact_name}
                    onChange={(e) => setSupplierForm((p) => ({ ...p, contact_name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Phone *</label>
                  <input
                    type="text"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Email</label>
                <input
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mailing Address</label>
                <textarea
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm((p) => ({ ...p, address: e.target.value }))}
                  rows={2.5}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSupplier(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-60"
                >
                  Add Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddItem && (
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl w-full max-w-md animate-scale-up">
            <h3 className="text-base font-bold text-slate-850 border-b border-slate-50 pb-2 mb-4">Register Inventory Item</h3>
            <form onSubmit={handleItemSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Item Category *</label>
                <select
                  value={itemForm.category_id}
                  onChange={(e) => setItemForm((p) => ({ ...p, category_id: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
                >
                  <option value="">Select a category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Item Name *</label>
                <input
                  type="text"
                  value={itemForm.name}
                  onChange={(e) => setItemForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unique Item Code *</label>
                  <input
                    type="text"
                    value={itemForm.code}
                    onChange={(e) => setItemForm((p) => ({ ...p, code: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stock Unit *</label>
                  <input
                    type="text"
                    value={itemForm.unit}
                    onChange={(e) => setItemForm((p) => ({ ...p, unit: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2.5}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddItem(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-850 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-60"
                >
                  Register Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddCategory && (
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl w-full max-w-sm animate-scale-up">
            <h3 className="text-base font-bold text-slate-850 border-b border-slate-50 pb-2 mb-4">Add Inventory Category</h3>
            <form onSubmit={handleCategorySubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category Name *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2.5}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategory(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-600 bg-amber-600 text-white rounded-xl text-xs font-semibold cursor-pointer hover:bg-amber-700 disabled:opacity-60"
                >
                  Log Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLogPurchase && (
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-scale-up">
            <h3 className="text-base font-bold text-slate-850 border-b border-slate-50 pb-2 mb-4">Log Purchase Invoice</h3>
            <form onSubmit={handlePurchaseSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Supplier *</label>
                  <select
                    value={purchaseForm.supplier_id}
                    onChange={(e) => setPurchaseForm((p) => ({ ...p, supplier_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-primary"
                  >
                    <option value="">Select supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Purchase Date *</label>
                  <input
                    type="date"
                    value={purchaseForm.purchase_date}
                    onChange={(e) => setPurchaseForm((p) => ({ ...p, purchase_date: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-primary"
                  />
                </div>
              </div>

              {/* Purchase lines items */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-slate-50 pb-1 mb-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order Line Items *</label>
                  <button
                    type="button"
                    onClick={handleAddPurchaseLine}
                    className="text-[10px] font-bold text-primary bg-emerald-50 hover:bg-emerald-50 px-2 py-0.5 rounded cursor-pointer"
                  >
                    + Add Item Row
                  </button>
                </div>

                {purchaseForm.items.map((line, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6 flex flex-col">
                      <select
                        value={line.inventory_item_id}
                        onChange={(e) => handleLineItemChange(i, 'inventory_item_id', e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white"
                      >
                        <option value="">Select Item...</option>
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>{it.name} ({it.code})</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2 flex flex-col">
                      <input
                        type="number"
                        value={line.quantity}
                        onChange={(e) => handleLineItemChange(i, 'quantity', e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white"
                      />
                    </div>

                    <div className="col-span-3 flex flex-col">
                      <input
                        type="number"
                        step="0.01"
                        value={line.unit_price}
                        onChange={(e) => handleLineItemChange(i, 'unit_price', e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white"
                      />
                    </div>

                    <div className="col-span-1 text-center">
                      {purchaseForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePurchaseLine(i)}
                          className="text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer"
                        >
                          X
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-1">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount Paid ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchaseForm.paid_amount}
                    onChange={(e) => setPurchaseForm((p) => ({ ...p, paid_amount: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Remarks / Invoice Code</label>
                  <input
                    type="text"
                    value={purchaseForm.remarks}
                    onChange={(e) => setPurchaseForm((p) => ({ ...p, remarks: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-4 border-t border-slate-50 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLogPurchase(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-60"
                >
                  Log Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
