'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  FiCreditCard,
  FiDollarSign,
  FiShield,
  FiActivity,
  FiCheck,
  FiX,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiRefreshCw,
  FiServer,
  FiSettings,
  FiEye,
  FiEyeOff,
  FiGlobe,
  FiLock,
  FiCheckCircle,
  FiAlertTriangle,
  FiPlay,
  FiLayers,
  FiArrowRight,
  FiExternalLink,
  FiHome,
  FiBookOpen,
  FiFileText,
  FiUserCheck,
  FiSearch,
  FiInfo,
  FiSliders
} from 'react-icons/fi';

const GATEWAY_STYLES = {
  bkash: {
    name: 'bKash',
    color: '#e2136e',
    bgLight: 'bg-pink-50 dark:bg-pink-950/20',
    border: 'border-pink-200 dark:border-pink-900/50',
    text: 'text-pink-700 dark:text-pink-400',
    badge: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300'
  },
  nagad: {
    name: 'Nagad',
    color: '#f7941d',
    bgLight: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-900/50',
    text: 'text-amber-700 dark:text-amber-400',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
  },
  stripe: {
    name: 'Stripe',
    color: '#635bff',
    bgLight: 'bg-indigo-50 dark:bg-indigo-950/20',
    border: 'border-indigo-200 dark:border-indigo-900/50',
    text: 'text-indigo-700 dark:text-indigo-400',
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300'
  },
  sslcommerz: {
    name: 'SSLCommerz',
    color: '#0067b8',
    bgLight: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-900/50',
    text: 'text-blue-700 dark:text-blue-400',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
  },
  paddle: {
    name: 'Paddle',
    color: '#00d68f',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/20',
    border: 'border-emerald-200 dark:border-emerald-900/50',
    text: 'text-emerald-700 dark:text-emerald-400',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
  },
  sonali_gateway: {
    name: 'Sonali Gateway',
    color: '#007a3d',
    bgLight: 'bg-teal-50 dark:bg-teal-950/20',
    border: 'border-teal-200 dark:border-teal-900/50',
    text: 'text-teal-700 dark:text-teal-400',
    badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
  },
  surjopay: {
    name: 'Shurjopay',
    color: '#ff5e00',
    bgLight: 'bg-orange-50 dark:bg-orange-950/20',
    border: 'border-orange-200 dark:border-orange-900/50',
    text: 'text-orange-700 dark:text-orange-400',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
  },
  eps: {
    name: 'EPS Payment',
    color: '#1070e5',
    bgLight: 'bg-sky-50 dark:bg-sky-950/20',
    border: 'border-sky-200 dark:border-sky-900/50',
    text: 'text-sky-700 dark:text-sky-400',
    badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300'
  }
};

const TASK_ICONS = {
  residential_fees: <FiHome className="w-4 h-4 text-rose-500" />,
  education_fees: <FiBookOpen className="w-4 h-4 text-indigo-500" />,
  exam_fees: <FiFileText className="w-4 h-4 text-emerald-500" />,
  admission_fees: <FiUserCheck className="w-4 h-4 text-amber-500" />,
  other_fees: <FiDollarSign className="w-4 h-4 text-cyan-500" />
};

export default function ConfigurePaymentsPage() {
  const params = useParams();
  const domain = params?.domain || '';

  // Main Data States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts' | 'routing' | 'simulator' | 'catalog'
  const [gateways, setGateways] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [feePurposes, setFeePurposes] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [websiteCurrency, setWebsiteCurrency] = useState('BDT');
  const [metrics, setMetrics] = useState({
    totalAccounts: 0,
    activeAccounts: 0,
    sandboxAccounts: 0,
    liveAccounts: 0,
    assignedRoutes: 0,
    totalRoutes: 5
  });
  const [recentTransactions, setRecentTransactions] = useState([]);

  // Toast / Feedback State
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', text: '' }

  // Filter States for Accounts Directory
  const [filterGateway, setFilterGateway] = useState('all');
  const [filterEnv, setFilterEnv] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State: Create / Edit Account
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [formData, setFormData] = useState({
    gateway_code: 'bkash',
    account_name: '',
    account_number: '',
    environment: 'sandbox',
    currency: 'BDT',
    credentials: {},
    is_active: true,
    is_default: false,
    notes: ''
  });
  const [showSecrets, setShowSecrets] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);

  // Routing State for Tab 2
  const [routingForm, setRoutingForm] = useState({});
  const [savingRoute, setSavingRoute] = useState(null);

  // Simulator State for Tab 3
  const [simTask, setSimTask] = useState('residential_fees');
  const [simHostelId, setSimHostelId] = useState('');
  const [simAmount, setSimAmount] = useState('1500');
  const [simPayerName, setSimPayerName] = useState('Rahim Ahmed');
  const [simPayerPhone, setSimPayerPhone] = useState('01712345678');
  const [simResult, setSimResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  // Auto-clear Toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load Main Data
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/configure/payments`);
      const data = await res.json();
      if (data.success) {
        if (data.website_currency) {
          setWebsiteCurrency(data.website_currency);
        }
        setGateways(data.gateways || []);
        setAccounts(data.accounts || []);
        setAssignments(data.assignments || []);
        setFeePurposes(data.fee_purposes || []);
        setHostels(data.hostels || []);
        setMetrics(data.metrics || {});
        setRecentTransactions(data.recentTransactions || []);

        // Initialize Routing Form state from current assignments
        const initialRouting = {};
        (data.fee_purposes || []).forEach(fp => {
          const matched = (data.assignments || []).find(a => a.purpose === fp.code && (!a.hostel_id || a.hostel_id === null));
          initialRouting[fp.code] = {
            gateway_account_id: matched?.gateway_account_id ? String(matched.gateway_account_id) : '',
            fallback_gateway_account_id: matched?.fallback_gateway_account_id ? String(matched.fallback_gateway_account_id) : '',
            is_active: matched ? Boolean(matched.is_active) : true,
            title: matched?.title || fp.label,
            description: matched?.description || fp.description
          };
        });

        // Initialize per-hostel routes
        (data.hostels || []).forEach(h => {
          const matched = (data.assignments || []).find(a => a.purpose === 'residential_fees' && Number(a.hostel_id) === Number(h.id));
          const key = `residential_fees_hostel_${h.id}`;
          initialRouting[key] = {
            assignment_id: matched?.id || null,
            gateway_account_id: matched?.gateway_account_id ? String(matched.gateway_account_id) : '',
            fallback_gateway_account_id: matched?.fallback_gateway_account_id ? String(matched.fallback_gateway_account_id) : '',
            is_active: matched ? Boolean(matched.is_active) : true,
            title: matched?.title || `${h.name} Fees`,
            description: matched?.description || `Residential hall fees for ${h.name}`
          };
        });
        setRoutingForm(initialRouting);
      } else {
        setToast({ type: 'error', text: data.error || 'Failed to load payment configuration.' });
      }
    } catch (err) {
      setToast({ type: 'error', text: 'Network error loading payment gateways.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (domain) {
      loadData();
    }
  }, [domain]);

  // Selected Gateway Schema in Modal
  const activeGatewayObj = useMemo(() => {
    return gateways.find(g => g.code === formData.gateway_code) || gateways[0];
  }, [gateways, formData.gateway_code]);

  // Filtered Accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const matchGateway = filterGateway === 'all' || acc.gateway_code === filterGateway;
      const matchEnv = filterEnv === 'all' || acc.environment === filterEnv;
      const matchSearch =
        !searchQuery ||
        acc.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (acc.account_number && acc.account_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (acc.gateway_name && acc.gateway_name.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchGateway && matchEnv && matchSearch;
    });
  }, [accounts, filterGateway, filterEnv, searchQuery]);

  // Open Create Modal
  const handleOpenCreateModal = (gwCode = 'bkash') => {
    setModalMode('create');
    setEditingAccountId(null);
    setTestResult(null);
    const chosenGw = gateways.find(g => g.code === gwCode);
    const supported = Array.isArray(chosenGw?.supported_currencies) ? chosenGw.supported_currencies : ['BDT'];
    const initialCurrency = supported.includes(websiteCurrency) ? websiteCurrency : supported[0];
    setFormData({
      gateway_code: gwCode,
      account_name: '',
      account_number: '',
      environment: 'sandbox',
      currency: initialCurrency,
      credentials: {},
      is_active: true,
      is_default: false,
      notes: ''
    });
    setShowSecrets({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (acc) => {
    setModalMode('edit');
    setEditingAccountId(acc.id);
    setTestResult(null);
    setFormData({
      gateway_code: acc.gateway_code,
      account_name: acc.account_name,
      account_number: acc.account_number || '',
      environment: acc.environment || 'sandbox',
      currency: acc.currency || 'BDT',
      credentials: acc.credentials || {},
      is_active: Boolean(acc.is_active),
      is_default: Boolean(acc.is_default),
      notes: acc.notes || ''
    });
    setShowSecrets({});
    setIsModalOpen(true);
  };

  // Handle Input Changes in Modal
  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCredentialChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      credentials: {
        ...prev.credentials,
        [key]: value
      }
    }));
  };

  const toggleSecretVisibility = (key) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Test Gateway Connection (Inside Modal or Card)
  const handleTestConnection = async (targetAccountId = null, inlineData = null) => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const payload = inlineData || (targetAccountId ? { id: targetAccountId } : {
        gateway_code: formData.gateway_code,
        environment: formData.environment,
        credentials: formData.credentials
      });

      const res = await fetch(`/api/${domain}/staff/panel/configure/payments/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setTestResult(data);
      if (data.success) {
        setToast({ type: 'success', text: `Connection Verified: ${data.message}` });
      } else {
        setToast({ type: 'error', text: `Test Failed: ${data.message || data.error}` });
      }
    } catch (err) {
      setTestResult({ success: false, message: err.message });
      setToast({ type: 'error', text: 'Error executing gateway ping test.' });
    } finally {
      setTestingConnection(false);
    }
  };

  // Save Account (Create or Update)
  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!formData.account_name.trim()) {
      setToast({ type: 'error', text: 'Account Nickname/Label is required.' });
      return;
    }

    setActionLoading(true);
    try {
      const url = `/api/${domain}/staff/panel/configure/payments`;
      const method = modalMode === 'create' ? 'POST' : 'PUT';
      const payload = {
        ...formData,
        id: editingAccountId
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', text: data.message });
        setIsModalOpen(false);
        await loadData();
      } else {
        setToast({ type: 'error', text: data.error || 'Failed to save account.' });
      }
    } catch (err) {
      setToast({ type: 'error', text: 'Failed to communicate with server.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Account Active / Inactive
  const handleToggleAccountActive = async (acc) => {
    try {
      const res = await fetch(`/api/${domain}/staff/panel/configure/payments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: acc.id,
          is_active: !acc.is_active
        })
      });
      const data = await res.json();
      if (data.success) {
        setToast({
          type: 'success',
          text: `Account '${acc.account_name}' is now ${!acc.is_active ? 'Active' : 'Disabled'}.`
        });
        setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, is_active: !acc.is_active } : a));
      } else {
        setToast({ type: 'error', text: data.error || 'Failed to toggle status.' });
      }
    } catch (err) {
      setToast({ type: 'error', text: 'Error updating account status.' });
    }
  };

  // Delete Account
  const handleDeleteAccount = async (acc) => {
    if (!confirm(`Are you sure you want to delete gateway account "${acc.account_name}"? Any task routing assigned to this account will be unlinked.`)) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/configure/payments?id=${acc.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', text: data.message });
        await loadData();
      } else {
        setToast({ type: 'error', text: data.error || 'Failed to delete account.' });
      }
    } catch (err) {
      setToast({ type: 'error', text: 'Error deleting gateway account.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Route Assignment Change in Form
  const handleRoutingFieldChange = (key, field, value) => {
    setRoutingForm(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  // Save Route Assignment for a Task (or specific Residential Hall)
  const handleSaveRoute = async (key, purposeCode, hostelId = null) => {
    const routeData = routingForm[key];
    if (!routeData || !routeData.gateway_account_id) {
      setToast({ type: 'error', text: 'Please select a primary gateway account.' });
      return;
    }

    setSavingRoute(key);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/configure/payments/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: purposeCode,
          hostel_id: hostelId ? parseInt(hostelId, 10) : null,
          gateway_account_id: parseInt(routeData.gateway_account_id, 10),
          fallback_gateway_account_id: routeData.fallback_gateway_account_id ? parseInt(routeData.fallback_gateway_account_id, 10) : null,
          is_active: Boolean(routeData.is_active),
          title: routeData.title,
          description: routeData.description
        })
      });
      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', text: data.message });
        await loadData();
      } else {
        setToast({ type: 'error', text: data.error || 'Failed to save task routing.' });
      }
    } catch (err) {
      setToast({ type: 'error', text: 'Error saving route assignment.' });
    } finally {
      setSavingRoute(null);
    }
  };

  // Reset hostel-specific route to fall back to All Halls default
  const handleResetHostelRoute = async (assignmentId, hostelName) => {
    if (!window.confirm(`Revert "${hostelName}" to using the All Halls default payment account?`)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/configure/payments/assign?id=${assignmentId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', text: data.message });
        await loadData();
      } else {
        setToast({ type: 'error', text: data.error || 'Failed to revert hostel route.' });
      }
    } catch (err) {
      setToast({ type: 'error', text: 'Error reverting hostel route.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Run Simulator
  const handleRunSimulator = async (e) => {
    e.preventDefault();
    setSimulating(true);
    setSimResult(null);
    try {
      const res = await fetch(`/api/${domain}/fees/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: simTask,
          hostel_id: (simTask === 'residential_fees' && simHostelId) ? parseInt(simHostelId, 10) : undefined,
          amount: parseFloat(simAmount) || 100,
          currency: websiteCurrency || 'BDT',
          invoice_ref: `SIM-INV-${Date.now().toString().slice(-6)}`,
          payer: {
            name: simPayerName,
            phone: simPayerPhone
          }
        })
      });
      const data = await res.json();
      setSimResult(data);
      if (data.success) {
        setToast({ type: 'success', text: `Simulation successful! Routed via ${data.gateway?.name}.` });
      } else {
        setToast({ type: 'error', text: data.error || 'Simulation failed.' });
      }
    } catch (err) {
      setToast({ type: 'error', text: 'Simulator network error.' });
      setSimResult({ success: false, error: err.message });
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="w-full space-y-5 pb-12 font-sans antialiased text-slate-800 dark:text-slate-200">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-xl text-xs font-medium border animate-in slide-in-from-top-3 ${
          toast.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700'
            : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-700'
        }`}>
          {toast.type === 'success' ? <FiCheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <FiAlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75 cursor-pointer">
            <FiX className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Interactive Metric Ribbons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Accounts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4 shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">
              Gateway Accounts
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FiCreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {metrics.totalAccounts || accounts.length}
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {metrics.activeAccounts} Active
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Multi-account instances enabled</p>
        </div>

        {/* Live Gateways */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4 shadow-xs relative overflow-hidden group hover:border-emerald-300 dark:hover:border-emerald-800 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">
              Production (Live)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FiShield className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {metrics.liveAccounts}
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Real Payments
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Active collection accounts</p>
        </div>

        {/* Sandbox Gateways */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4 shadow-xs relative overflow-hidden group hover:border-amber-300 dark:hover:border-amber-800 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">
              Sandbox Testbeds
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <FiServer className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {metrics.sandboxAccounts}
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Simulated
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Safe staging & testing mode</p>
        </div>

        {/* Portal Base Currency */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4 shadow-xs relative overflow-hidden group hover:border-indigo-300 dark:hover:border-indigo-800 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">
              Portal Currency
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FiDollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {websiteCurrency}
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-mono">
              Base Unit
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Institution billing standard</p>
        </div>

        {/* Fee Routing Coverage */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4 shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">
              Task Routing
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <FiSliders className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {metrics.assignedRoutes} / {metrics.totalRoutes}
            </span>
            <span className="text-xs font-medium text-sky-600 dark:text-sky-400">
              {Math.round((metrics.assignedRoutes / (metrics.totalRoutes || 1)) * 100)}% Mapped
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Residential, Tuition, Exam, etc.</p>
        </div>
      </div>

      {/* Main Tabs Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'accounts'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FiCreditCard className="w-3.5 h-3.5" />
            <span>Gateway Accounts ({accounts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('routing')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'routing'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FiSliders className="w-3.5 h-3.5" />
            <span>Task & Fee Routing Matrix</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono">
              Core
            </span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'simulator'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FiPlay className="w-3.5 h-3.5" />
            <span>Sandbox & Checkout Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'catalog'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FiLayers className="w-3.5 h-3.5" />
            <span>Gateways Guide (8 Supported)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition cursor-pointer disabled:opacity-50"
            title="Refresh Data"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => handleOpenCreateModal('bkash')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <FiPlus className="w-4 h-4" />
            <span>Add Gateway Account</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: GATEWAY ACCOUNTS DIRECTORY
         ========================================================================= */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative w-full max-w-sm">
                <FiSearch className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by nickname, merchant number, or gateway..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400"
                />
              </div>

              <select
                value={filterGateway}
                onChange={(e) => setFilterGateway(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <option value="all">All Gateways</option>
                {gateways.map(g => (
                  <option key={g.code} value={g.code}>{g.name}</option>
                ))}
              </select>

              <select
                value={filterEnv}
                onChange={(e) => setFilterEnv(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <option value="all">All Environments</option>
                <option value="live">Live Production</option>
                <option value="sandbox">Sandbox Testbed</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 font-mono">
              Showing {filteredAccounts.length} of {accounts.length} accounts
            </div>
          </div>

          {/* Accounts Grid */}
          {loading && accounts.length === 0 ? (
            <div className="py-20 flex justify-center items-center">
              <div className="loader loader-md" />
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <FiCreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No Payment Accounts Found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No gateway accounts matched your filter criteria. Click the button below to add your first gateway account (bKash, Nagad, Stripe, SSLCommerz, etc.).
              </p>
              <button
                onClick={() => handleOpenCreateModal('bkash')}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition cursor-pointer"
              >
                Configure First Gateway
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredAccounts.map((acc) => {
                const style = GATEWAY_STYLES[acc.gateway_code] || {
                  name: acc.gateway_name,
                  bgLight: 'bg-slate-50 dark:bg-slate-800',
                  border: 'border-slate-200 dark:border-slate-700',
                  text: 'text-slate-700',
                  badge: 'bg-slate-100 text-slate-700'
                };

                // Find assigned routes for this account
                const assignedTasks = assignments.filter(as => String(as.gateway_account_id) === String(acc.id));

                return (
                  <div
                    key={acc.id}
                    className={`bg-white dark:bg-slate-900 border ${style.border} rounded-xl p-4 shadow-2xs hover:shadow-md transition flex flex-col justify-between space-y-3 relative`}
                  >
                    {/* Header */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${style.badge}`}>
                            {style.name}
                          </span>
                          {acc.environment === 'live' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              LIVE
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              SANDBOX
                            </span>
                          )}
                        </div>

                        {/* Toggle Active Switch */}
                        <button
                          onClick={() => handleToggleAccountActive(acc)}
                          className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                            acc.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                          title={acc.is_active ? 'Click to disable' : 'Click to enable'}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform ${
                              acc.is_active ? 'left-4.5' : 'left-1'
                            }`}
                          />
                        </button>
                      </div>

                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white mt-2.5 truncate" title={acc.account_name}>
                        {acc.account_name}
                      </h4>

                      {acc.account_number && (
                        <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                          <span>Wallet/No:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{acc.account_number}</span>
                        </p>
                      )}

                      {acc.notes && (
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-1" title={acc.notes}>
                          {acc.notes}
                        </p>
                      )}
                    </div>

                    {/* Masked Credentials Overview */}
                    <div className="bg-slate-50 dark:bg-slate-950/60 rounded-lg p-2.5 border border-slate-100 dark:border-slate-800/80 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold">
                        <span>Configured Keys</span>
                        <span className="font-mono text-slate-500">{acc.currency}</span>
                      </div>
                      <div className="space-y-1">
                        {Object.entries(acc.credentials || {}).map(([k, v]) => {
                          if (k.endsWith('_is_masked')) return null;
                          return (
                            <div key={k} className="flex items-center justify-between font-mono">
                              <span className="text-slate-500 truncate max-w-[100px]">{k}:</span>
                              <span className="text-slate-700 dark:text-slate-300 truncate max-w-[150px] text-right font-medium">
                                {typeof v === 'string' && v.length > 20 ? `${v.slice(0, 10)}...` : String(v || 'N/A')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Active Assigned Tasks */}
                    {assignedTasks.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        <span className="text-[10px] text-slate-400">Assigned Tasks:</span>
                        {assignedTasks.map(t => (
                          <span
                            key={t.id}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          >
                            {TASK_ICONS[t.purpose] || <FiCheck className="w-3 h-3 text-indigo-500" />}
                            {t.purpose.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions Toolbar */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 gap-2">
                      <button
                        onClick={() => handleTestConnection(acc.id)}
                        disabled={testingConnection}
                        className="px-2.5 py-1 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition cursor-pointer"
                      >
                        <FiRefreshCw className={`w-3 h-3 ${testingConnection ? 'animate-spin' : ''}`} />
                        <span>Ping Test</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(acc)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition cursor-pointer"
                          title="Edit credentials & settings"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteAccount(acc)}
                          className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 transition cursor-pointer"
                          title="Delete account"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: TASK & FEE ROUTING MATRIX
         ========================================================================= */}
      {activeTab === 'routing' && (
        <div className="space-y-4">
          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 rounded-xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center shrink-0 mt-0.5">
              <FiSliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-indigo-900 dark:text-indigo-300">
                Granular Task-to-Gateway Fee Routing Matrix
              </h3>
              <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-0.5">
                Staff can assign different gateway accounts for specific fees (Residential / Hostel fees, Tuition / Education fees, Examination fees, Admission fees). If multiple accounts exist for the same gateway (e.g. 2 bKash numbers), you can designate distinct accounts for each department or fee category!
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {feePurposes.map(purpose => {
              const currentRoute = routingForm[purpose.code] || {
                gateway_account_id: '',
                fallback_gateway_account_id: '',
                is_active: true
              };

              const assignedAccount = accounts.find(a => String(a.id) === String(currentRoute.gateway_account_id));
              const fallbackAccount = accounts.find(a => String(a.id) === String(currentRoute.fallback_gateway_account_id));

              return (
                <div
                  key={purpose.code}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        {TASK_ICONS[purpose.code] || <FiDollarSign className="w-5 h-5 text-indigo-500" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {purpose.label}
                          </h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {purpose.code}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {purpose.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        assignedAccount
                          ? assignedAccount.environment === 'live'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {assignedAccount ? `Routes to: ${assignedAccount.account_name} (${assignedAccount.environment.toUpperCase()})` : 'Unassigned / Default Fallback'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Primary Gateway Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {purpose.code === 'residential_fees' ? 'All Residential Halls Default Primary Account' : 'Primary Gateway Account'} <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={currentRoute.gateway_account_id}
                        onChange={(e) => handleRoutingFieldChange(purpose.code, 'gateway_account_id', e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">-- Choose Account --</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            [{acc.gateway_name}] {acc.account_name} ({acc.currency || websiteCurrency}) - {acc.environment.toUpperCase()}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {purpose.code === 'residential_fees'
                          ? 'Standard fallback account used by all residential halls unless a specific hall override is assigned below.'
                          : `All student and invoice payments for ${purpose.label} will be directed to this account.`}
                      </p>
                    </div>

                    {/* Fallback Gateway Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Fallback Backup Gateway (Optional)
                      </label>
                      <select
                        value={currentRoute.fallback_gateway_account_id}
                        onChange={(e) => handleRoutingFieldChange(purpose.code, 'fallback_gateway_account_id', e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">-- None (No Fallback) --</option>
                        {accounts
                          .filter(acc => String(acc.id) !== String(currentRoute.gateway_account_id))
                          .map(acc => (
                            <option key={acc.id} value={acc.id}>
                              [{acc.gateway_name}] {acc.account_name} ({acc.currency || websiteCurrency}) - {acc.environment.toUpperCase()}
                            </option>
                          ))}
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Used automatically if primary account is toggled inactive or unavailable.
                      </p>
                    </div>
                  </div>

                  {/* Route Actions & Toggle */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={currentRoute.is_active}
                        onChange={(e) => handleRoutingFieldChange(purpose.code, 'is_active', e.target.checked)}
                        className="rounded text-indigo-600 cursor-pointer"
                      />
                      <span>Active Route (Allow Student Checkout)</span>
                    </label>

                    <button
                      onClick={() => handleSaveRoute(purpose.code, purpose.code, null)}
                      disabled={savingRoute === purpose.code}
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {savingRoute === purpose.code ? (
                        <div className="loader loader-sm loader-white" />
                      ) : (
                        <>
                          <FiCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Update {purpose.label} Default Routing</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* If Residential Fees: Multi-Hall Granular Routing Section */}
                  {purpose.code === 'residential_fees' && (
                    <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FiHome className="w-4 h-4 text-rose-500" />
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Residential Halls Department Granular Routing
                          </h5>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Optionally assign dedicated payment accounts per hall, or leave on default
                        </span>
                      </div>

                      {hostels.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2.5">
                          <FiInfo className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>No residential halls have been created for this institution yet. Once you add halls in Hostel Management, you can configure dedicated payment accounts for each individual hall here.</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3.5">
                          {hostels.map(h => {
                            const key = `residential_fees_hostel_${h.id}`;
                            const hallRoute = routingForm[key] || {
                              gateway_account_id: '',
                              fallback_gateway_account_id: '',
                              is_active: true
                            };
                            const hallAssignedAcc = accounts.find(a => String(a.id) === String(hallRoute.gateway_account_id));
                            const hasCustomAssignment = Boolean(hallRoute.assignment_id && hallRoute.gateway_account_id);

                            return (
                              <div
                                key={h.id}
                                className={`rounded-xl p-4 border transition ${
                                  hasCustomAssignment
                                    ? 'bg-indigo-50/30 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/50'
                                    : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800'
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
                                      {h.name.charAt(0)}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                                          {h.name}
                                        </span>
                                        {h.type && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 font-medium">
                                            {h.type}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Capacity: {h.capacity || 'N/A'} beds • Monthly Fee: {h.monthly_fee ? `${h.monthly_fee} ${websiteCurrency}` : 'N/A'}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                      hasCustomAssignment
                                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                        : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                    }`}>
                                      {hasCustomAssignment
                                        ? `Dedicated Account: ${hallAssignedAcc?.account_name || 'Configured'} (${hallAssignedAcc?.environment?.toUpperCase() || ''})`
                                        : assignedAccount
                                          ? `Inheriting Default: ${assignedAccount.account_name}`
                                          : 'Inherits Default (Unassigned)'}
                                    </span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                      Hall Dedicated Primary Account
                                    </label>
                                    <select
                                      value={hallRoute.gateway_account_id}
                                      onChange={(e) => handleRoutingFieldChange(key, 'gateway_account_id', e.target.value)}
                                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                                    >
                                      <option value="">-- Inherit All Halls Default Account --</option>
                                      {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                          [{acc.gateway_name}] {acc.account_name} ({acc.currency || websiteCurrency}) - {acc.environment.toUpperCase()}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                      Hall Fallback Account (Optional)
                                    </label>
                                    <select
                                      value={hallRoute.fallback_gateway_account_id}
                                      onChange={(e) => handleRoutingFieldChange(key, 'fallback_gateway_account_id', e.target.value)}
                                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                                    >
                                      <option value="">-- None (No Fallback) --</option>
                                      {accounts
                                        .filter(acc => String(acc.id) !== String(hallRoute.gateway_account_id))
                                        .map(acc => (
                                          <option key={acc.id} value={acc.id}>
                                            [{acc.gateway_name}] {acc.account_name} ({acc.currency || websiteCurrency}) - {acc.environment.toUpperCase()}
                                          </option>
                                        ))}
                                    </select>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200/50 dark:border-slate-800/50">
                                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600 dark:text-slate-400">
                                    <input
                                      type="checkbox"
                                      checked={hallRoute.is_active}
                                      onChange={(e) => handleRoutingFieldChange(key, 'is_active', e.target.checked)}
                                      className="rounded text-indigo-600 cursor-pointer"
                                    />
                                    <span>Active Hall Route</span>
                                  </label>

                                  <div className="flex items-center gap-2">
                                    {hallRoute.assignment_id && (
                                      <button
                                        type="button"
                                        onClick={() => handleResetHostelRoute(hallRoute.assignment_id, h.name)}
                                        disabled={actionLoading}
                                        className="px-3 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer font-medium"
                                      >
                                        Revert to Default
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleSaveRoute(key, 'residential_fees', h.id)}
                                      disabled={savingRoute === key || !hallRoute.gateway_account_id}
                                      className="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                    >
                                      {savingRoute === key ? (
                                        <div className="loader loader-sm loader-white" />
                                      ) : (
                                        <>
                                          <FiCheck className="w-3.5 h-3.5" />
                                          <span>Save {h.name} Account</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: SANDBOX & CHECKOUT SIMULATOR
         ========================================================================= */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Simulator Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <FiPlay className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Payment Checkout Simulator
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Test task resolution, fee routing, and generate real/sandbox checkout payloads.
                </p>
              </div>
            </div>

            <form onSubmit={handleRunSimulator} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Task / Fee Category
                </label>
                <select
                  value={simTask}
                  onChange={(e) => setSimTask(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                >
                  {feePurposes.map(fp => (
                    <option key={fp.code} value={fp.code}>{fp.label} ({fp.code})</option>
                  ))}
                </select>
              </div>

              {simTask === 'residential_fees' && hostels.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Residential Hall / Department
                  </label>
                  <select
                    value={simHostelId}
                    onChange={(e) => setSimHostelId(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="">-- All Halls Default (No Specific Hall) --</option>
                    {hostels.map(h => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.type || 'Hall'})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Test whether fees route to this specific hall's account or the institution's default residential account.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Test Amount ({websiteCurrency})
                </label>
                <input
                  type="number"
                  value={simAmount}
                  onChange={(e) => setSimAmount(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  placeholder="1500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Student / Payer Name
                  </label>
                  <input
                    type="text"
                    value={simPayerName}
                    onChange={(e) => setSimPayerName(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payer Mobile
                  </label>
                  <input
                    type="text"
                    value={simPayerPhone}
                    onChange={(e) => setSimPayerPhone(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={simulating}
                className="w-full py-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {simulating ? (
                  <div className="loader loader-sm loader-white" />
                ) : (
                  <>
                    <FiPlay className="w-3.5 h-3.5" />
                    <span>Simulate Payment Checkout</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Simulator Result View */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Route Resolution & Response
                </h3>
                {simResult?.gateway && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    simResult.gateway.environment === 'live'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {simResult.gateway.environment} MODE
                  </span>
                )}
              </div>

              {simResult ? (
                <div className="space-y-3 mt-3">
                  {simResult.success ? (
                    <>
                      <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg p-3 text-emerald-900 dark:text-emerald-300 text-xs space-y-1">
                        <div className="font-semibold flex items-center gap-1.5">
                          <FiCheckCircle className="w-4 h-4 text-emerald-600" />
                          <span>Routing Succeeded</span>
                        </div>
                        <p>{simResult.message}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <span className="text-[10px] text-slate-400 block uppercase">Gateway</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{simResult.gateway?.name}</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <span className="text-[10px] text-slate-400 block uppercase">Account</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{simResult.gateway?.account_name}</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <span className="text-[10px] text-slate-400 block uppercase">Transaction Ref</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{simResult.transaction_id}</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <span className="text-[10px] text-slate-400 block uppercase">Gateway Ref</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{simResult.gateway_reference}</span>
                        </div>
                      </div>

                      {simResult.checkout_url && (
                        <div className="pt-2">
                          <a
                            href={simResult.checkout_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition cursor-pointer"
                          >
                            <span>Open Checkout URL</span>
                            <FiExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg p-3 text-rose-800 dark:text-rose-300 text-xs">
                      <div className="font-semibold flex items-center gap-1.5">
                        <FiAlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Checkout Route Failure</span>
                      </div>
                      <p className="mt-1">{simResult.error || 'Unable to route payment.'}</p>
                    </div>
                  )}

                  {/* JSON Inspector */}
                  <details className="text-[11px] font-mono text-slate-600 dark:text-slate-400 pt-2 cursor-pointer">
                    <summary className="hover:underline">View Raw JSON Response</summary>
                    <pre className="p-2.5 bg-slate-900 text-emerald-400 rounded-lg mt-1 overflow-x-auto text-[10px]">
                      {JSON.stringify(simResult, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <FiServer className="w-8 h-8 mx-auto stroke-1" />
                  <p className="text-xs">No simulation executed yet.</p>
                  <p className="text-[11px] text-slate-500">
                    Fill the form on the left and run a checkout simulation to view live routing.
                  </p>
                </div>
              )}
            </div>

            {/* Recent Audit Log Snippet */}
            {recentTransactions.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Recent Ledger Transactions
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {recentTransactions.slice(0, 4).map(tx => (
                    <div key={tx.id} className="flex items-center justify-between text-[11px] p-1.5 rounded bg-slate-50 dark:bg-slate-800/50">
                      <span className="font-mono text-slate-700 dark:text-slate-300">{tx.transaction_id}</span>
                      <span className="text-slate-500">{tx.purpose}</span>
                      <span className="font-semibold text-slate-900 dark:text-white font-mono">{tx.amount} {tx.currency}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: 8 GATEWAYS CATALOG & DOCS
         ========================================================================= */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {gateways.map(gw => {
              const style = GATEWAY_STYLES[gw.code] || {
                color: '#3b82f6',
                border: 'border-slate-200 dark:border-slate-800',
                badge: 'bg-slate-100 text-slate-800'
              };

              const configuredCount = accounts.filter(a => a.gateway_code === gw.code).length;

              return (
                <div
                  key={gw.code}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:shadow-md transition space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${style.badge}`}>
                        {gw.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {configuredCount} {configuredCount === 1 ? 'Account' : 'Accounts'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {gw.name}
                    </h4>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3">
                      {gw.description}
                    </p>

                    <div className="pt-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        Supported Currencies:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {(gw.supported_currencies || ['BDT']).map(c => (
                          <span key={c} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    {gw.website_url && (
                      <a
                        href={gw.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <span>Portal</span>
                        <FiExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    <button
                      onClick={() => handleOpenCreateModal(gw.code)}
                      className="px-2.5 py-1 rounded text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition cursor-pointer flex items-center gap-1"
                    >
                      <FiPlus className="w-3 h-3" />
                      <span>Add Account</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          CREATE / EDIT GATEWAY ACCOUNT MODAL
         ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {modalMode === 'create' ? 'Add Gateway Account' : `Edit Account: ${formData.account_name}`}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Multiple accounts of the same gateway are supported for different campuses or fee tasks.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Gateway Provider Selector (If create mode) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Select Gateway Provider <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Portal Base Currency: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{websiteCurrency}</strong>
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {gateways.map(gw => {
                    const isSelected = formData.gateway_code === gw.code;
                    const supportedList = Array.isArray(gw.supported_currencies) ? gw.supported_currencies.map(c => String(c).toUpperCase().trim()) : ['BDT'];
                    const isCurrencySupported = supportedList.includes(String(websiteCurrency || 'BDT').toUpperCase().trim());
                    return (
                      <button
                        key={gw.code}
                        type="button"
                        disabled={modalMode === 'edit'}
                        onClick={() => {
                          handleFormChange('gateway_code', gw.code);
                          const supported = Array.isArray(gw.supported_currencies) ? gw.supported_currencies.map(c => String(c).toUpperCase().trim()) : ['BDT'];
                          const currentBase = String(websiteCurrency || 'BDT').toUpperCase().trim();
                          const initialCurrency = supported.includes(currentBase) ? currentBase : supported[0];
                          handleFormChange('currency', initialCurrency);
                          setTestResult(null);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer relative ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                        } ${modalMode === 'edit' ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-1 font-bold text-xs truncate">
                          <span className="truncate">{gw.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-medium ${
                            isCurrencySupported
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {isCurrencySupported ? websiteCurrency : '≠ Currency'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block mt-0.5">
                          {gw.category}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Account Label & Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Account Nickname / Label <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.account_name}
                    onChange={(e) => handleFormChange('account_name', e.target.value)}
                    placeholder="e.g. Hostel bKash Account #1"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Helpful name to identify this account in the routing dropdown.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Merchant Number / Wallet ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.account_number}
                    onChange={(e) => handleFormChange('account_number', e.target.value)}
                    placeholder="01XXXXXXXXX or Merchant Code"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Environment Mode: Sandbox vs Live & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    System Environment <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleFormChange('environment', 'sandbox')}
                      className={`py-2 px-3 rounded-lg border text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        formData.environment === 'sandbox'
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <FiServer className="w-3.5 h-3.5" />
                      <span>Sandbox (Test)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleFormChange('environment', 'live')}
                      className={`py-2 px-3 rounded-lg border text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        formData.environment === 'live'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <FiShield className="w-3.5 h-3.5" />
                      <span>Live (Real)</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {formData.environment === 'live'
                      ? 'Transactions will process real bank/MFS payments.'
                      : 'Mock test transactions safely without real bank deductions.'}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Billing Currency <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Base: <strong className="text-indigo-600 dark:text-indigo-400">{websiteCurrency}</strong>
                    </span>
                  </div>
                  <select
                    value={formData.currency}
                    onChange={(e) => handleFormChange('currency', e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                  >
                    {Array.isArray(activeGatewayObj?.supported_currencies) && activeGatewayObj.supported_currencies.length > 0 ? (
                      activeGatewayObj.supported_currencies.map(curr => (
                        <option key={curr} value={curr}>
                          {curr} {curr === websiteCurrency ? '(Matches Portal Base)' : ''}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="BDT">BDT (Bangladeshi Taka)</option>
                        <option value="USD">USD (United States Dollar)</option>
                      </>
                    )}
                  </select>

                  {/* Currency Compatibility Warning Notice */}
                  {activeGatewayObj && Array.isArray(activeGatewayObj.supported_currencies) && !activeGatewayObj.supported_currencies.includes(websiteCurrency) && (
                    <div className="mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px] flex items-start gap-1.5">
                      <FiAlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        <strong>Notice:</strong> {activeGatewayObj.name} does not natively support your portal base currency (<span className="font-mono font-bold">{websiteCurrency}</span>). Supported: {activeGatewayObj.supported_currencies.join(', ')}.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Gateway Credentials Section */}
              <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FiLock className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{activeGatewayObj?.name || formData.gateway_code} API Credentials</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formData.environment.toUpperCase()} Endpoint
                  </span>
                </div>

                {Array.isArray(activeGatewayObj?.credential_schema) && activeGatewayObj.credential_schema.length > 0 ? (
                  activeGatewayObj.credential_schema.map(field => {
                    const isSecret = Boolean(field.secret);
                    const isVisible = showSecrets[field.key];
                    const val = formData.credentials[field.key] || '';

                    return (
                      <div key={field.key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {field.label} {field.required && <span className="text-rose-500">*</span>}
                          </label>
                          {isSecret && (
                            <button
                              type="button"
                              onClick={() => toggleSecretVisibility(field.key)}
                              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                            >
                              {isVisible ? <FiEyeOff className="w-3 h-3" /> : <FiEye className="w-3 h-3" />}
                              <span>{isVisible ? 'Hide' : 'Show'}</span>
                            </button>
                          )}
                        </div>

                        {field.type === 'textarea' ? (
                          <textarea
                            rows={3}
                            value={val}
                            onChange={(e) => handleCredentialChange(field.key, e.target.value)}
                            placeholder={field.placeholder || ''}
                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                          />
                        ) : (
                          <input
                            type={isSecret && !isVisible ? 'password' : 'text'}
                            value={val}
                            onChange={(e) => handleCredentialChange(field.key, e.target.value)}
                            placeholder={field.placeholder || ''}
                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                          />
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400">No credential schema defined for this gateway.</p>
                )}

                {/* Inline Test Credentials Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleTestConnection()}
                    disabled={testingConnection}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <FiRefreshCw className={`w-3 h-3 ${testingConnection ? 'animate-spin' : ''}`} />
                    <span>Validate & Test These Credentials</span>
                  </button>

                  {testResult && (
                    <div className={`mt-2 p-2.5 rounded-lg text-xs border ${
                      testResult.success
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                    }`}>
                      {testResult.message}
                    </div>
                  )}
                </div>
              </div>

              {/* Status and Notes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => handleFormChange('is_active', e.target.checked)}
                      className="rounded text-indigo-600 cursor-pointer"
                    />
                    <span>Account Active (Enabled for processing payments)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.is_default}
                      onChange={(e) => handleFormChange('is_default', e.target.checked)}
                      className="rounded text-indigo-600 cursor-pointer"
                    />
                    <span>Set as Default Gateway Account</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Internal Notes / Comments
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                    placeholder="e.g. Registered with Branch 04 for hostel collections"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            {(() => {
              const supportedList = Array.isArray(activeGatewayObj?.supported_currencies) ? activeGatewayObj.supported_currencies.map(c => String(c).toUpperCase().trim()) : ['BDT'];
              const isCurIncompatible = !supportedList.includes(String(websiteCurrency || 'BDT').toUpperCase().trim());
              return (
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-500">
                    {isCurIncompatible ? (
                      <span className="text-rose-600 font-semibold flex items-center gap-1">
                        <FiAlertTriangle className="w-3.5 h-3.5" />
                        Incompatible with portal base currency ({websiteCurrency})
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-medium flex items-center gap-1">
                        <FiCheckCircle className="w-3.5 h-3.5" />
                        Compatible with {websiteCurrency} billing
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAccount}
                      disabled={actionLoading || isCurIncompatible}
                      className="px-5 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading ? (
                        <div className="loader loader-sm loader-white" />
                      ) : isCurIncompatible ? (
                        <span>Unsupported Currency</span>
                      ) : (
                        <span>{modalMode === 'create' ? 'Create Gateway Account' : 'Save Changes'}</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
