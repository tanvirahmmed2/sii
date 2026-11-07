'use client';

import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiUsers, FiTruck, FiBox, FiPlus, FiTrash2, FiRefreshCw, FiPhone, FiAlertCircle } from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import Loader from 'src/component/common/Loader';

export default function ParentTransportInventoryStaffPage() {
  const { website, getApiEndpoint } = useContext(TenantWebsiteContext);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('parents'); 
  const [data, setData] = useState({ parents: [], routes: [], vehicles: [], inventory_items: [] });

  const [isParentModalOpen, setIsParentModalOpen] = useState(false);
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentOccupation, setParentOccupation] = useState('');
  const [submittingParent, setSubmittingParent] = useState(false);

  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [startLoc, setStartLoc] = useState('');
  const [endLoc, setEndLoc] = useState('');
  const [fareAmount, setFareAmount] = useState('');
  const [submittingRoute, setSubmittingRoute] = useState(false);

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [itemCategory, setItemCategory] = useState('stationery');
  const [itemUnit, setItemUnit] = useState('pcs');
  const [itemPrice, setItemPrice] = useState('');
  const [itemStock, setItemStock] = useState(10);
  const [submittingItem, setSubmittingItem] = useState(false);

  const apiEndpoint = useMemo(() => getApiEndpoint('staff/panel/parent-transport-inventory'), [getApiEndpoint]);

  const fetchData = useCallback(async (showToast = false) => {
    if (!apiEndpoint) return;
    try {
      if (showToast) setRefreshing(true);
      const res = await axios.get(apiEndpoint);
      if (res.data?.success) {
        setData(res.data);
        if (showToast) toast.success('Records refreshed');
      } else {
        toast.error(res.data?.error || 'Failed to load records');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Error connecting to service');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiEndpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateParent = async (e) => {
    e.preventDefault();
    if (!parentName.trim() || !parentPhone.trim()) return;
    setSubmittingParent(true);
    try {
      const res = await axios.post(apiEndpoint, {
        action: 'create_parent',
        name: parentName.trim(),
        phone: parentPhone.trim(),
        email: parentEmail.trim(),
        occupation: parentOccupation.trim(),
      });
      if (res.data?.success) {
        toast.success('Parent account registered');
        setIsParentModalOpen(false);
        setParentName('');
        setParentPhone('');
        fetchData();
      } else {
        toast.error(res.data?.error || 'Failed to register parent');
      }
    } catch (err) {
      toast.error('Error saving parent');
    } finally {
      setSubmittingParent(false);
    }
  };

  const handleCreateRoute = async (e) => {
    e.preventDefault();
    if (!routeName.trim() || !startLoc.trim() || !endLoc.trim()) return;
    setSubmittingRoute(true);
    try {
      const res = await axios.post(apiEndpoint, {
        action: 'create_route',
        route_name: routeName.trim(),
        start_location: startLoc.trim(),
        end_location: endLoc.trim(),
        fare_amount: fareAmount,
      });
      if (res.data?.success) {
        toast.success('Transport route created');
        setIsRouteModalOpen(false);
        setRouteName('');
        setStartLoc('');
        setEndLoc('');
        fetchData();
      } else {
        toast.error(res.data?.error || 'Failed to create route');
      }
    } catch (err) {
      toast.error('Error creating route');
    } finally {
      setSubmittingRoute(false);
    }
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    setSubmittingItem(true);
    try {
      const res = await axios.post(apiEndpoint, {
        action: 'create_inventory_item',
        name: itemName.trim(),
        item_code: itemCode.trim(),
        category: itemCategory,
        unit: itemUnit,
        unit_price: itemPrice,
        initial_stock: itemStock,
      });
      if (res.data?.success) {
        toast.success('Inventory item cataloged');
        setIsItemModalOpen(false);
        setItemName('');
        fetchData();
      } else {
        toast.error(res.data?.error || 'Failed to add item');
      }
    } catch (err) {
      toast.error('Error adding item');
    } finally {
      setSubmittingItem(false);
    }
  };

  const handleDeleteParent = async (parentId) => {
    if (!confirm('Are you sure you want to remove this parent account?')) return;
    try {
      const res = await axios.delete(`${apiEndpoint}?parent_id=${parentId}`);
      if (res.data?.success) {
        toast.success('Parent deleted');
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to delete parent');
    }
  };

  if (loading) {
    return <Loader message="Loading Parent Portal, Transit & Inventory Control..." />;
  }

  const { parents, routes, vehicles, inventory_items } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FiUsers className="text-primary" /> Parent Portal, Transport & Inventory
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage multi-sibling parent access, school bus routes & passenger allocation, plus institutional asset inventory.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <FiRefreshCw className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          {activeTab === 'parents' && (
            <button
              onClick={() => setIsParentModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition shadow-sm"
            >
              <FiPlus /> New Parent Account
            </button>
          )}
          {activeTab === 'transport' && (
            <button
              onClick={() => setIsRouteModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition shadow-sm"
            >
              <FiPlus /> New Transit Route
            </button>
          )}
          {activeTab === 'inventory' && (
            <button
              onClick={() => setIsItemModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition shadow-sm"
            >
              <FiPlus /> Add Inventory Item
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('parents')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === 'parents'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiUsers /> Parents & Siblings ({parents.length})
        </button>
        <button
          onClick={() => setActiveTab('transport')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === 'transport'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiTruck /> School Bus Transit ({routes.length} Routes)
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === 'inventory'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiBox /> Campus Inventory ({inventory_items.length} Items)
        </button>
      </div>

      {activeTab === 'parents' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3">Guardian Name</th>
                  <th className="px-6 py-3">Phone</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Occupation</th>
                  <th className="px-6 py-3">Linked Siblings</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {parents.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                      No parent accounts registered yet. Click &quot;New Parent Account&quot; to allow guardians to monitor siblings.
                    </td>
                  </tr>
                ) : (
                  parents.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{p.name}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <FiPhone className="text-xs" /> {p.phone}
                      </td>
                      <td className="px-6 py-4 text-xs">{p.email || 'None'}</td>
                      <td className="px-6 py-4 text-xs">{p.occupation || 'Guardian'}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-100 text-purple-800">
                          {p.linked_children_count || 0} Students
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDeleteParent(p.id)} className="text-red-500 hover:text-red-700">
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'transport' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Active Bus Routes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {routes.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-sm">
                No transport transit routes defined.
              </div>
            ) : (
              routes.map((r) => (
                <div key={r.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{r.route_name}</span>
                    <span className="text-emerald-600 font-bold text-sm">৳ {parseFloat(r.fare_amount).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-500">{r.start_location} ➔ {r.end_location}</p>
                  <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800">
                    <span>{r.student_passengers || 0} Allocated Students</span>
                    <span className="text-primary font-semibold">Active Bus</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3">Item Name</th>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Unit Cost</th>
                  <th className="px-6 py-3">In-Stock Balance</th>
                  <th className="px-6 py-3">Alert Threshold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {inventory_items.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                      No inventory assets registered.
                    </td>
                  </tr>
                ) : (
                  inventory_items.map((i) => {
                    const isLow = parseInt(i.current_stock || 0, 10) <= i.min_stock_alert;
                    return (
                      <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{i.name}</td>
                        <td className="px-6 py-4 font-mono text-xs">{i.item_code || 'N/A'}</td>
                        <td className="px-6 py-4 text-xs capitalize">{i.category}</td>
                        <td className="px-6 py-4 text-xs">৳ {parseFloat(i.unit_price).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                            isLow ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {i.current_stock || 0} {i.unit}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">Alert at &le; {i.min_stock_alert}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isParentModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Register Parent / Guardian</h3>
            <form onSubmit={handleCreateParent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Md. Shahidul Islam"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="01700000000"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="parent@gmail.com"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsParentModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingParent}
                  className="px-4 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-dark"
                >
                  {submittingParent ? 'Saving...' : 'Register Parent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isRouteModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Create Bus Transit Route</h3>
            <form onSubmit={handleCreateRoute} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Route Name</label>
                <input
                  type="text"
                  placeholder="e.g. Route A: Uttara - Campus"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Start Location</label>
                  <input
                    type="text"
                    placeholder="Uttara Sector 7"
                    value={startLoc}
                    onChange={(e) => setStartLoc(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">End Location</label>
                  <input
                    type="text"
                    placeholder="Main Campus"
                    value={endLoc}
                    onChange={(e) => setEndLoc(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Monthly Fare (BDT)</label>
                <input
                  type="number"
                  placeholder="1500"
                  value={fareAmount}
                  onChange={(e) => setFareAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRouteModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRoute}
                  className="px-4 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-dark"
                >
                  {submittingRoute ? 'Saving...' : 'Save Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Catalog Inventory Item</h3>
            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Item Name</label>
                <input
                  type="text"
                  placeholder="e.g. Science Lab Microscope Standard"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Item Code</label>
                  <input
                    type="text"
                    placeholder="LAB-MIC-01"
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="stationery">Stationery</option>
                    <option value="electronics">Electronics</option>
                    <option value="furniture">Furniture</option>
                    <option value="sports">Sports Gear</option>
                    <option value="laboratory">Laboratory</option>
                    <option value="uniform">Uniform</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Unit Price (BDT)</label>
                  <input
                    type="number"
                    placeholder="1200"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Initial Stock Count</label>
                  <input
                    type="number"
                    value={itemStock}
                    onChange={(e) => setItemStock(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingItem}
                  className="px-4 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-dark"
                >
                  {submittingItem ? 'Saving...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

