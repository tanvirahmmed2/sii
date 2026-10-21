'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FiEdit2, FiTrash2, FiSettings } from 'react-icons/fi';

const GATEWAY_NAMES = {
  bkash: 'bKash',
  nagad: 'Nagad',
  stripe: 'Stripe',
  paypal: 'PayPal',
  sslcommerz: 'SSLCommerz',
  paddle: 'Paddle',
  sonali_gateway: 'Sonali Gateway',
  eps: 'EPS Payment',
  surjopay: 'Shurjopay',
  razorpay: 'Razorpay'
};

export default function ConfigurePaymentsPage() {
  const params = useParams();
  const domain = params?.domain || '';

  // Main Data States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts' | 'routing' | 'simulator' | 'currencies' | 'catalog'
  const [gateways, setGateways] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [feePurposes, setFeePurposes] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [websiteCurrency, setWebsiteCurrency] = useState('BDT');
  const [portalCurrencies, setPortalCurrencies] = useState([]);
  const [metrics, setMetrics] = useState({
    totalAccounts: 0,
    activeAccounts: 0,
    sandboxAccounts: 0,
    liveAccounts: 0,
    assignedRoutes: 0,
    totalRoutes: 5
  });

  // Inline Toast / Feedback State
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', text: '' }

  // Filter States for Accounts Directory
  const [filterGateway, setFilterGateway] = useState('all');
  const [filterEnv, setFilterEnv] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [gatewayFilterType, setGatewayFilterType] = useState('all'); // 'all' | 'compatible'

  // INLINE Account Form State (NO POPUP)
  const [isAccountFormOpen, setIsAccountFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' | 'edit'
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
  const [testingAccountId, setTestingAccountId] = useState(null);

  // Routing State for Tab 2
  const [routingForm, setRoutingForm] = useState({});
  const [savingRoute, setSavingRoute] = useState(null);

  // INLINE Currency Form State (NO POPUP)
  const [isCurrencyFormOpen, setIsCurrencyFormOpen] = useState(false);
  const [currencyFormMode, setCurrencyFormMode] = useState('create'); // 'create' | 'edit'
  const [currencyForm, setCurrencyForm] = useState({
    code: '',
    name: '',
    symbol: '',
    exchange_rate: '1.0',
    is_base_currency: false,
    is_active: true
  });
  const [savingCurrency, setSavingCurrency] = useState(false);

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
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Apply Config Data to State
  const applyConfigData = useCallback((data) => {
    if (!data) return;
    if (data.website_currency) {
      setWebsiteCurrency(data.website_currency);
    }
    setGateways(data.gateways || []);
    setAccounts(data.accounts || []);
    setAssignments(data.assignments || []);
    setFeePurposes(data.fee_purposes || []);
    setHostels(data.hostels || []);
    setPortalCurrencies(data.currencies || []);
    setMetrics(data.metrics || {});

    // Initialize Routing Form state
    const initialRouting = {};
    (data.fee_purposes || []).forEach(fp => {
      const matched = (data.assignments || []).find(a => a.purpose === fp.code && (!a.hostel_id || a.hostel_id === null));
      initialRouting[fp.code] = {
        gateway_account_id: matched?.gateway_account_id ? String(matched.gateway_account_id) : '',
        fallback_gateway_account_id: matched?.fallback_gateway_account_id ? String(matched.fallback_gateway_account_id) : '',
        is_active: matched ? Boolean(matched.is_active) : true,
        allow_student_portal: matched?.allow_student_portal !== undefined ? Boolean(matched.allow_student_portal) : true,
        allow_public_checkout: matched?.allow_public_checkout !== undefined ? Boolean(matched.allow_public_checkout) : true,
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
        allow_student_portal: matched?.allow_student_portal !== undefined ? Boolean(matched.allow_student_portal) : true,
        allow_public_checkout: matched?.allow_public_checkout !== undefined ? Boolean(matched.allow_public_checkout) : true,
        title: matched?.title || `${h.name} Fees`,
        description: matched?.description || `Residential hall fees for ${h.name}`
      };
    });
    setRoutingForm(initialRouting);
  }, []);

  // Reload Main Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/configure/payments`);
      const data = await res.json();
      if (data.success) {
        applyConfigData(data);
      } else {
        setToast({ type: 'error', text: data.error || 'Failed to load payment configuration.' });
      }
    } catch {
      setToast({ type: 'error', text: 'Network error loading payment gateways.' });
    } finally {
      setLoading(false);
    }
  }, [domain, applyConfigData]);

  // Initial Data Fetch
  useEffect(() => {
    let active = true;
    async function loadInitialData() {
      try {
        const res = await fetch(`/api/${domain}/staff/panel/configure/payments`);
        const data = await res.json();
        if (active) {
          if (data.success) {
            applyConfigData(data);
          } else {
            setToast({ type: 'error', text: data.error || 'Failed to load payment configuration.' });
          }
        }
      } catch {
        if (active) {
          setToast({ type: 'error', text: 'Network error loading payment gateways.' });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (domain) {
      loadInitialData();
    }

    return () => {
      active = false;
    };
  }, [domain, applyConfigData]);

  // Selected Gateway Schema
  const activeGatewayObj = useMemo(() => {
    return gateways.find(g => g.code === formData.gateway_code) || gateways[0];
  }, [gateways, formData.gateway_code]);

  // Count gateways supporting current institution base currency
  const compatibleGatewaysCount = useMemo(() => {
    return gateways.filter(gw => {
      const supported = Array.isArray(gw.supported_currencies) ? gw.supported_currencies : ['BDT'];
      return supported.includes(websiteCurrency);
    }).length;
  }, [gateways, websiteCurrency]);

  // Gateways displayed in the create/edit account form based on filter
  const displayedFormGateways = useMemo(() => {
    if (gatewayFilterType === 'compatible') {
      return gateways.filter(gw => {
        const supported = Array.isArray(gw.supported_currencies) ? gw.supported_currencies : ['BDT'];
        return supported.includes(websiteCurrency);
      });
    }
    return gateways;
  }, [gateways, gatewayFilterType, websiteCurrency]);

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

  // Open Inline Account Form for Create
  const handleOpenCreateAccount = (gwCode = 'bkash') => {
    setFormMode('create');
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
    setIsAccountFormOpen(true);
    setActiveTab('accounts');
  };

  // Open Inline Account Form for Edit
  const handleOpenEditAccount = (acc) => {
    setFormMode('edit');
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
    setIsAccountFormOpen(true);
    setActiveTab('accounts');
  };

  const handleCloseAccountForm = () => {
    setIsAccountFormOpen(false);
    setEditingAccountId(null);
    setTestResult(null);
  };

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

  // Test Gateway Connection
  const handleTestConnection = async (targetAccountId = null, inlineData = null) => {
    const testingKey = targetAccountId || 'form';
    setTestingAccountId(testingKey);
    setTestResult(null);
    try {
      const payload = inlineData || (targetAccountId ? { id: targetAccountId } : {
        id: formMode === 'edit' ? editingAccountId : undefined,
        gateway_code: formData.gateway_code,
        environment: formData.environment,
        currency: formData.currency,
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
      setTestingAccountId(null);
    }
  };

  // Save Account
  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!formData.account_name.trim()) {
      setToast({ type: 'error', text: 'Account Nickname/Label is required.' });
      return;
    }

    const supportedList = Array.isArray(activeGatewayObj?.supported_currencies)
      ? activeGatewayObj.supported_currencies
      : ['BDT'];
    if (!supportedList.includes(formData.currency)) {
      setToast({
        type: 'error',
        text: `Currency '${formData.currency}' is not supported by ${activeGatewayObj?.name || 'Gateway'}. Supported: ${supportedList.join(', ')}.`
      });
      return;
    }

    setActionLoading(true);
    try {
      const url = `/api/${domain}/staff/panel/configure/payments`;
      const method = formMode === 'create' ? 'POST' : 'PUT';
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
        setIsAccountFormOpen(false);
        await loadData();
      } else {
        setToast({ type: 'error', text: data.error || 'Failed to save account.' });
      }
    } catch {
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
    } catch {
      setToast({ type: 'error', text: 'Error updating account status.' });
    }
  };

  // Delete Account
  const handleDeleteAccount = async (acc) => {
    if (!confirm(`Are you sure you want to delete gateway account "${acc.account_name}"?`)) {
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
    } catch {
      setToast({ type: 'error', text: 'Error deleting gateway account.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Route Assignment Change
  const handleRoutingFieldChange = (key, field, value) => {
    setRoutingForm(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  // Save Route Assignment
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
          allow_student_portal: routeData.allow_student_portal !== false,
          allow_public_checkout: routeData.allow_public_checkout !== false,
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
    } catch {
      setToast({ type: 'error', text: 'Error saving route assignment.' });
    } finally {
      setSavingRoute(null);
    }
  };

  // Reset hostel-specific route
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
    } catch {
      setToast({ type: 'error', text: 'Error reverting hostel route.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Open Inline Currency Form for Create
  const handleOpenCreateCurrency = () => {
    setCurrencyFormMode('create');
    setCurrencyForm({
      code: '',
      name: '',
      symbol: '',
      exchange_rate: '1.0',
      is_base_currency: false,
      is_active: true
    });
    setIsCurrencyFormOpen(true);
  };

  // Open Inline Currency Form for Edit
  const handleOpenEditCurrency = (cur) => {
    setCurrencyFormMode('edit');
    setCurrencyForm({
      id: cur.id,
      code: cur.code,
      name: cur.name,
      symbol: cur.symbol || '',
      exchange_rate: String(cur.exchange_rate || '1.0'),
      is_base_currency: Boolean(cur.is_base_currency),
      is_active: Boolean(cur.is_active)
    });
    setIsCurrencyFormOpen(true);
  };

  // Save Currency
  const handleSaveCurrency = async (e) => {
    if (e) e.preventDefault();
    if (!currencyForm.code.trim()) {
      setToast({ type: 'error', text: 'Currency code is required (e.g. USD, EUR, BDT).' });
      return;
    }

    setSavingCurrency(true);
    try {
      const method = currencyFormMode === 'edit' ? 'PUT' : 'POST';
      const res = await fetch(`/api/${domain}/staff/panel/configure/payments/currencies`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...currencyForm,
          code: currencyForm.code.toUpperCase().trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', text: data.message });
        if (data.currencies) setPortalCurrencies(data.currencies);
        if (currencyForm.is_base_currency) {
          setWebsiteCurrency(currencyForm.code.toUpperCase().trim());
        }
        setIsCurrencyFormOpen(false);
        setCurrencyForm({
          code: '',
          name: '',
          symbol: '',
          exchange_rate: '1.0',
          is_base_currency: false,
          is_active: true
        });
        await loadData();
      } else {
        setToast({ type: 'error', text: data.error || 'Failed to save currency.' });
      }
    } catch {
      setToast({ type: 'error', text: 'Network error saving currency.' });
    } finally {
      setSavingCurrency(false);
    }
  };

  // Toggle Currency Active Status
  const handleToggleCurrencyActive = async (cur) => {
    if (cur.is_base_currency) {
      setToast({ type: 'error', text: 'Cannot deactivate the primary base currency.' });
      return;
    }
    try {
      const res = await fetch(`/api/${domain}/staff/panel/configure/payments/currencies`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cur.id,
          is_active: !cur.is_active
        })
      });
      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', text: data.message });
        if (data.currencies) setPortalCurrencies(data.currencies);
      } else {
        setToast({ type: 'error', text: data.error || 'Failed to update currency.' });
      }
    } catch {
      setToast({ type: 'error', text: 'Network error updating currency.' });
    }
  };

  // Set Currency as Base
  const handleSetBaseCurrency = async (cur) => {
    if (cur.is_base_currency) return;
    if (!window.confirm(`Set ${cur.code} (${cur.name}) as primary base currency?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/${domain}/staff/panel/configure/payments/currencies`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cur.id,
          is_base_currency: true
        })
      });
      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', text: `${cur.code} is now the primary base currency.` });
        setWebsiteCurrency(cur.code);
        if (data.currencies) setPortalCurrencies(data.currencies);
        await loadData();
      } else {
        setToast({ type: 'error', text: data.error || 'Failed to set base currency.' });
      }
    } catch {
      setToast({ type: 'error', text: 'Network error setting base currency.' });
    }
  };

  // Delete Currency
  const handleDeleteCurrency = async (cur) => {
    if (cur.is_base_currency) {
      setToast({ type: 'error', text: 'Cannot delete primary base currency.' });
      return;
    }
    if (!window.confirm(`Delete currency "${cur.code}" (${cur.name}) from institution table?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/${domain}/staff/panel/configure/payments/currencies?id=${cur.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', text: data.message });
        if (data.currencies) setPortalCurrencies(data.currencies);
      } else {
        setToast({ type: 'error', text: data.error || 'Failed to delete currency.' });
      }
    } catch {
      setToast({ type: 'error', text: 'Network error deleting currency.' });
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
    <div className="w-full space-y-4 font-sans text-slate-800 dark:text-slate-200">
      {/* 5.1 Page Header with Actions */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">Payment Gateway Configuration</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage multi-account gateway credentials, institutional currency standards, and fee routing rules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={() => handleOpenCreateAccount('bkash')}
            className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition"
          >
            + Add Gateway Account
          </button>
        </div>
      </div>

      {/* Inline Toast / Notification Banner (NO POPUP) */}
      {toast && (
        <div className={`w-full p-3 rounded-md text-xs font-medium border flex items-center justify-between ${
          toast.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
            : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
        }`}>
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs font-medium hover:underline cursor-pointer ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metric Cards (High Density) */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5 space-y-1">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Gateway Accounts</div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-semibold text-slate-900 dark:text-white font-mono">
              {metrics.totalAccounts || accounts.length}
            </span>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              {metrics.activeAccounts} Active
            </span>
          </div>
          <div className="text-[10px] text-slate-400">Multi-instance accounts</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5 space-y-1">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Production (Live)</div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-semibold text-slate-900 dark:text-white font-mono">
              {metrics.liveAccounts}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
              Live
            </span>
          </div>
          <div className="text-[10px] text-slate-400">Real fee collection</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5 space-y-1">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Sandbox Testbed</div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-semibold text-slate-900 dark:text-white font-mono">
              {metrics.sandboxAccounts}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
              Simulated
            </span>
          </div>
          <div className="text-[10px] text-slate-400">Staging environment</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5 space-y-1">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Base Currency</div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-semibold text-slate-900 dark:text-white font-mono">
              {websiteCurrency}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
              Base
            </span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>{portalCurrencies.length} currencies active</span>
            <Link href="settings" className="text-primary hover:underline font-medium">
              Change in Settings →
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5 space-y-1 col-span-2 sm:col-span-1">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Task Routing</div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-semibold text-slate-900 dark:text-white font-mono">
              {metrics.assignedRoutes} / {metrics.totalRoutes}
            </span>
            <span className="text-[10px] font-medium text-slate-500">
              {Math.round((metrics.assignedRoutes / (metrics.totalRoutes || 1)) * 100)}% Mapped
            </span>
          </div>
          <div className="text-[10px] text-slate-400">Tuition, hostel, exams</div>
        </div>
      </div>

      {/* Main Tabs Navigation Bar */}
      <div className="w-full flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('accounts')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer shrink-0 ${
            activeTab === 'accounts'
              ? 'bg-primary text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Gateway Accounts ({accounts.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('routing')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer shrink-0 ${
            activeTab === 'routing'
              ? 'bg-primary text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Task & Fee Routing
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('simulator')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer shrink-0 ${
            activeTab === 'simulator'
              ? 'bg-primary text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Checkout Simulator
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('currencies')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer shrink-0 ${
            activeTab === 'currencies'
              ? 'bg-primary text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Currencies Table ({portalCurrencies.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer shrink-0 ${
            activeTab === 'catalog'
              ? 'bg-primary text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Gateways Guide
        </button>
      </div>

      {/* =========================================================================
          TAB 1: GATEWAY ACCOUNTS (WITH INLINE FORM - NO POPUP)
         ========================================================================= */}
      {activeTab === 'accounts' && (
        <div className="w-full space-y-4">
          {/* INLINE ACCOUNT FORM (EXPANDS IN PAGE WHEN ADDING OR EDITING) */}
          {isAccountFormOpen && (
            <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-4 animate-in fade-in duration-150">
              <div className="w-full flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {formMode === 'create' ? 'Add Gateway Account' : `Edit Account: ${formData.account_name}`}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Configure payment credentials, environment, and currency binding.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseAccountForm}
                  className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSaveAccount} className="space-y-4">
                {/* Gateway Provider Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Gateway Provider *
                    </label>
                    <div className="flex items-center gap-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setGatewayFilterType('all')}
                        className={`px-2 py-0.5 rounded cursor-pointer transition ${
                          gatewayFilterType === 'all'
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-medium'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        All Providers ({gateways.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setGatewayFilterType('compatible')}
                        className={`px-2 py-0.5 rounded cursor-pointer transition ${
                          gatewayFilterType === 'compatible'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        Compatible with {websiteCurrency} ({compatibleGatewaysCount})
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-10 gap-2">
                    {displayedFormGateways.map(gw => {
                      const isSelected = formData.gateway_code === gw.code;
                      const supported = Array.isArray(gw.supported_currencies) ? gw.supported_currencies : ['BDT'];
                      const isCompatible = supported.includes(websiteCurrency);

                      return (
                        <button
                          key={gw.code}
                          type="button"
                          disabled={formMode === 'edit'}
                          onClick={() => {
                            handleFormChange('gateway_code', gw.code);
                            const initialCurrency = supported.includes(websiteCurrency) ? websiteCurrency : supported[0];
                            handleFormChange('currency', initialCurrency);
                            setTestResult(null);
                          }}
                          className={`p-2.5 rounded-md border text-center transition cursor-pointer text-xs font-medium flex flex-col justify-between ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                          } ${formMode === 'edit' ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          <div>
                            <div className="truncate">{gw.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 uppercase">
                              {supported.slice(0, 2).join(', ')}
                            </div>
                          </div>
                          <div className="mt-1 flex justify-center">
                            {isCompatible ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                ✓ {websiteCurrency}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                Alt
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Informative Notice if selected provider operates in an alternate currency */}
                  {Array.isArray(activeGatewayObj?.supported_currencies) &&
                    !activeGatewayObj.supported_currencies.includes(websiteCurrency) && (
                      <div className="mt-2 p-2.5 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                        <span className="font-bold shrink-0">Currency Notice:</span>
                        <span>
                          <strong>{activeGatewayObj?.name}</strong> processes transactions in{' '}
                          <strong>{activeGatewayObj.supported_currencies.join(', ')}</strong>, while your institution portal base currency is{' '}
                          <strong>{websiteCurrency}</strong>. Payments through this gateway will settle in {formData.currency}.
                        </span>
                      </div>
                    )}
                </div>

                {/* Account Label & Number */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Account Nickname / Label *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Primary bKash Merchant, Admission Stripe"
                      value={formData.account_name}
                      onChange={(e) => handleFormChange('account_name', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Account / Wallet / Merchant Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 01700000000 or Merchant ID"
                      value={formData.account_number}
                      onChange={(e) => handleFormChange('account_number', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Currency (website_currencies) *
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => handleFormChange('currency', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white font-mono cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                    >
                      {portalCurrencies.map(c => {
                        const supportedList = Array.isArray(activeGatewayObj?.supported_currencies) ? activeGatewayObj.supported_currencies : ['BDT'];
                        const isSupported = supportedList.includes(c.code);
                        return (
                          <option key={c.code} value={c.code} disabled={!isSupported}>
                            {c.code} ({c.name}) {c.is_base_currency ? '— Base' : ''} {!isSupported ? `(Unsupported by ${activeGatewayObj?.name || 'Gateway'})` : '(Supported)'}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Environment Mode */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Environment Mode *</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                      <input
                        type="radio"
                        name="environment"
                        value="sandbox"
                        checked={formData.environment === 'sandbox'}
                        onChange={() => handleFormChange('environment', 'sandbox')}
                        className="text-primary cursor-pointer"
                      />
                      <span>Sandbox (Testbed)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                      <input
                        type="radio"
                        name="environment"
                        value="live"
                        checked={formData.environment === 'live'}
                        onChange={() => handleFormChange('environment', 'live')}
                        className="text-primary cursor-pointer"
                      />
                      <span>Production (Live Payments)</span>
                    </label>
                  </div>
                </div>

                {/* Dynamic Credential Schema Inputs */}
                <div className="p-3.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    {activeGatewayObj?.name} API Credentials
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(activeGatewayObj?.credential_schema || []).map(field => {
                      const isSecret = field.type === 'password';
                      const isShown = Boolean(showSecrets[field.key]);
                      const inputType = isSecret ? (isShown ? 'text' : 'password') : 'text';
                      const val = formData.credentials?.[field.key] || '';

                      return (
                        <div key={field.key} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              {field.label} {field.required ? '*' : ''}
                            </label>
                            {isSecret && (
                              <button
                                type="button"
                                onClick={() => toggleSecretVisibility(field.key)}
                                className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                              >
                                {isShown ? 'Hide' : 'Show'}
                              </button>
                            )}
                          </div>
                          <input
                            type={inputType}
                            placeholder={field.placeholder || ''}
                            value={val}
                            onChange={(e) => handleCredentialChange(field.key, e.target.value)}
                            required={field.required && formMode === 'create'}
                            className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Notes & Checkboxes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Internal Notes</label>
                    <input
                      type="text"
                      placeholder="Optional remarks (e.g. Finance department sub-account)"
                      value={formData.notes}
                      onChange={(e) => handleFormChange('notes', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div className="flex items-center gap-6 pt-5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => handleFormChange('is_active', e.target.checked)}
                        className="rounded text-primary cursor-pointer"
                      />
                      <span>Active Instance</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={formData.is_default}
                        onChange={(e) => handleFormChange('is_default', e.target.checked)}
                        className="rounded text-primary cursor-pointer"
                      />
                      <span>Set as Default Gateway</span>
                    </label>
                  </div>
                </div>

                {/* Test Result Message */}
                {testResult && (
                  <div className={`p-2.5 rounded-md text-xs border ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                  }`}>
                    {testResult.message}
                  </div>
                )}

                {/* Form Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleTestConnection()}
                    disabled={testingAccountId !== null}
                    className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer disabled:opacity-50"
                  >
                    {testingAccountId === 'form' ? 'Testing Connection...' : 'Test Ping'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCloseAccountForm}
                      className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition disabled:opacity-50"
                    >
                      {actionLoading ? 'Saving...' : (formMode === 'create' ? 'Save Gateway Account' : 'Update Account')}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Filter Toolbar */}
          <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full max-w-xs px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
              />

              <select
                value={filterGateway}
                onChange={(e) => setFilterGateway(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="all">All Gateways</option>
                {gateways.map(g => (
                  <option key={g.code} value={g.code}>{g.name}</option>
                ))}
              </select>

              <select
                value={filterEnv}
                onChange={(e) => setFilterEnv(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="all">All Environments</option>
                <option value="live">Live</option>
                <option value="sandbox">Sandbox</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-mono">
                {filteredAccounts.length} of {accounts.length} accounts
              </span>
              {!isAccountFormOpen && (
                <button
                  type="button"
                  onClick={() => handleOpenCreateAccount('bkash')}
                  className="px-3 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition"
                >
                  + Add Account
                </button>
              )}
            </div>
          </div>

          {/* Accounts Grid */}
          {loading && accounts.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading payment accounts...</div>
          ) : filteredAccounts.length === 0 ? (
            <div className="w-full bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-md p-8 text-center space-y-2">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">No Payment Accounts Found</div>
              <p className="text-xs text-slate-500">
                No gateway accounts matched your filter criteria. Click below to add an account.
              </p>
              <button
                type="button"
                onClick={() => handleOpenCreateAccount('bkash')}
                className="px-3 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition"
              >
                + Configure First Gateway
              </button>
            </div>
          ) : (
            <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredAccounts.map((acc) => {
                const assignedTasks = assignments.filter(as => String(as.gateway_account_id) === String(acc.id));
                return (
                  <div
                    key={acc.id}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5 space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {GATEWAY_NAMES[acc.gateway_code] || acc.gateway_name}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            acc.environment === 'live'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                              : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                          }`}>
                            {acc.environment.toUpperCase()}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleAccountActive(acc)}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
                            acc.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {acc.is_active ? 'Active' : 'Disabled'}
                        </button>
                      </div>

                      <div className="text-sm font-semibold text-slate-900 dark:text-white mt-2 truncate" title={acc.account_name}>
                        {acc.account_name}
                      </div>

                      {acc.account_number && (
                        <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                          No: {acc.account_number}
                        </div>
                      )}

                      {acc.notes && (
                        <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                          {acc.notes}
                        </div>
                      )}
                    </div>

                    {/* Masked Credentials Overview */}
                    <div className="p-2.5 rounded-md border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase font-medium">
                        <span>Configured Keys</span>
                        <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                          {acc.currency || websiteCurrency}
                        </span>
                      </div>
                      <div className="space-y-0.5 font-mono text-[10px]">
                        {Object.entries(acc.credentials || {}).map(([k, v]) => {
                          if (k.endsWith('_is_masked')) return null;
                          return (
                            <div key={k} className="flex items-center justify-between text-slate-500">
                              <span className="truncate max-w-[90px]">{k}:</span>
                              <span className="text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                                {typeof v === 'string' && v.length > 20 ? `${v.slice(0, 10)}...` : String(v || 'N/A')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Assigned Tasks Tags */}
                    {assignedTasks.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 text-[10px]">
                        <span className="text-slate-400">Routes:</span>
                        {assignedTasks.map(t => (
                          <span
                            key={t.id}
                            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          >
                            {t.purpose.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions Toolbar */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleTestConnection(acc.id)}
                        disabled={testingAccountId !== null}
                        className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer disabled:opacity-50"
                      >
                        {testingAccountId === acc.id ? 'Testing...' : 'Test Ping'}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditAccount(acc)}
                          className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                          title="Edit Account"
                        >
                          <FiEdit2 className="text-xs" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteAccount(acc)}
                          className="p-1.5 rounded-md border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 cursor-pointer"
                          title="Delete Account"
                        >
                          <FiTrash2 className="text-xs" />
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
        <div className="w-full space-y-4">
          <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Fee Category Routing Matrix</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Specify which payment account collects revenue for each institutional fee purpose.
            </p>
          </div>

          <div className="space-y-3">
            {feePurposes.map(purpose => {
              const currentRoute = routingForm[purpose.code] || {
                gateway_account_id: '',
                fallback_gateway_account_id: '',
                is_active: true,
                allow_student_portal: true,
                allow_public_checkout: true
              };
              const assignedAccount = accounts.find(a => String(a.id) === String(currentRoute.gateway_account_id));

              return (
                <div
                  key={purpose.code}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">{purpose.label}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{purpose.description}</div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium self-start sm:self-auto ${
                      assignedAccount
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                    }`}>
                      {assignedAccount ? `Routed to: ${assignedAccount.account_name} (${assignedAccount.environment.toUpperCase()})` : 'Unassigned'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {purpose.code === 'residential_fees' ? 'All Halls Default Primary Account' : 'Primary Account'} *
                      </label>
                      <select
                        value={currentRoute.gateway_account_id}
                        onChange={(e) => handleRoutingFieldChange(purpose.code, 'gateway_account_id', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                      >
                        <option value="">-- Choose Account --</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            [{acc.gateway_name}] {acc.account_name} ({acc.currency || websiteCurrency}) - {acc.environment.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Fallback Backup Account (Optional)
                      </label>
                      <select
                        value={currentRoute.fallback_gateway_account_id}
                        onChange={(e) => handleRoutingFieldChange(purpose.code, 'fallback_gateway_account_id', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
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
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={currentRoute.is_active}
                          onChange={(e) => handleRoutingFieldChange(purpose.code, 'is_active', e.target.checked)}
                          className="rounded text-primary cursor-pointer"
                        />
                        <span>Active Route</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={currentRoute.allow_student_portal}
                          onChange={(e) => handleRoutingFieldChange(purpose.code, 'allow_student_portal', e.target.checked)}
                          className="rounded text-primary cursor-pointer"
                        />
                        <span>Student Portal</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={currentRoute.allow_public_checkout}
                          onChange={(e) => handleRoutingFieldChange(purpose.code, 'allow_public_checkout', e.target.checked)}
                          className="rounded text-primary cursor-pointer"
                        />
                        <span>Public Checkout</span>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveRoute(purpose.code, purpose.code)}
                      disabled={savingRoute === purpose.code}
                      className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition disabled:opacity-50"
                    >
                      {savingRoute === purpose.code ? 'Saving...' : 'Save Route'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Residential Hall Overrides */}
          {hostels.length > 0 && (
            <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Residential Hall Specific Routing Overrides</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Route payments for a specific hall to a separate bank/merchant account.
                </p>
              </div>

              <div className="space-y-3">
                {hostels.map(h => {
                  const key = `residential_fees_hostel_${h.id}`;
                  const currentRoute = routingForm[key] || {
                    gateway_account_id: '',
                    fallback_gateway_account_id: '',
                    is_active: true,
                    allow_student_portal: true,
                    allow_public_checkout: true
                  };
                  const hasCustomRoute = Boolean(currentRoute.assignment_id || currentRoute.gateway_account_id);

                  return (
                    <div
                      key={h.id}
                      className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          {h.name} ({h.type || 'Hall'})
                        </div>
                        {hasCustomRoute ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                            Custom Hall Account
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                            Using All Halls Default
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <select
                          value={currentRoute.gateway_account_id}
                          onChange={(e) => handleRoutingFieldChange(key, 'gateway_account_id', e.target.value)}
                          className="px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                        >
                          <option value="">-- Inherit All Halls Default --</option>
                          {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                              [{acc.gateway_name}] {acc.account_name} ({acc.currency || websiteCurrency})
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center justify-end gap-2">
                          {currentRoute.assignment_id && (
                            <button
                              type="button"
                              onClick={() => handleResetHostelRoute(currentRoute.assignment_id, h.name)}
                              className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSaveRoute(key, 'residential_fees', h.id)}
                            disabled={savingRoute === key || !currentRoute.gateway_account_id}
                            className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition disabled:opacity-50"
                          >
                            {savingRoute === key ? 'Saving...' : 'Save Hall Route'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: CHECKOUT SIMULATOR
         ========================================================================= */}
      {activeTab === 'simulator' && (
        <div className="w-full space-y-4">
          <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Fee Checkout Simulator</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Simulate fee checkout routing logic without charging real cards or mobile wallets.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Simulation Form Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 space-y-4">
              <form onSubmit={handleRunSimulator} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Fee Purpose *</label>
                  <select
                    value={simTask}
                    onChange={(e) => setSimTask(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                  >
                    {feePurposes.map(fp => (
                      <option key={fp.code} value={fp.code}>{fp.label}</option>
                    ))}
                  </select>
                </div>

                {simTask === 'residential_fees' && hostels.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Residential Hall</label>
                    <select
                      value={simHostelId}
                      onChange={(e) => setSimHostelId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                    >
                      <option value="">-- All Halls Default --</option>
                      {hostels.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Amount ({websiteCurrency}) *
                    </label>
                    <input
                      type="number"
                      value={simAmount}
                      onChange={(e) => setSimAmount(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Payer Name</label>
                    <input
                      type="text"
                      value={simPayerName}
                      onChange={(e) => setSimPayerName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Payer Phone</label>
                  <input
                    type="text"
                    value={simPayerPhone}
                    onChange={(e) => setSimPayerPhone(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={simulating}
                  className="w-full px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition disabled:opacity-50"
                >
                  {simulating ? 'Simulating Checkout...' : 'Execute Simulation'}
                </button>
              </form>
            </div>

            {/* Simulation Result Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                Routing Simulation Result
              </h3>

              {!simResult ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Select parameters and click &quot;Execute Simulation&quot; to test routing.
                </div>
              ) : simResult.success ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                    Route Resolved Successfully
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                    <div>Resolved Gateway:</div>
                    <div className="font-semibold text-slate-900 dark:text-white">{simResult.gateway?.name}</div>

                    <div>Target Account:</div>
                    <div className="font-semibold text-slate-900 dark:text-white">{simResult.gateway?.account_name}</div>

                    <div>Environment:</div>
                    <div className="uppercase font-mono">{simResult.gateway?.environment}</div>

                    <div>Currency:</div>
                    <div className="font-mono">{simResult.currency || websiteCurrency}</div>
                  </div>

                  <div className="pt-2">
                    <div className="text-[11px] font-medium text-slate-500 mb-1">Payload Output:</div>
                    <pre className="p-2.5 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] font-mono overflow-x-auto text-slate-800 dark:text-slate-200">
                      {JSON.stringify(simResult, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300">
                  {simResult.error || 'Failed to resolve route.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: GATEWAYS GUIDE (CATALOG)
         ========================================================================= */}
      {activeTab === 'catalog' && (
        <div className="w-full space-y-4">
          <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Supported Payment Providers</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Available gateway integrations, required credentials schemas, and currency compatibilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {gateways.map(gw => (
              <div
                key={gw.code}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5 space-y-2.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">{gw.name}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">{gw.category}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {gw.description}
                  </p>
                </div>

                <div className="space-y-1.5 text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Currencies:</span>
                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                      {Array.isArray(gw.supported_currencies) ? gw.supported_currencies.join(', ') : 'BDT'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Required Keys:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {(gw.credential_schema || []).length} fields
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenCreateAccount(gw.code)}
                  className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer text-center transition"
                >
                  Configure Account
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: CURRENCIES TABLE (WITH INLINE FORM - NO POPUP)
         ========================================================================= */}
      {activeTab === 'currencies' && (
        <div className="w-full space-y-4">
          <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Institutional Currency Registry</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                  Base: {websiteCurrency}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage institutional currencies and exchange rates in <span className="font-mono">website_currencies</span>.
              </p>
            </div>

            {!isCurrencyFormOpen && (
              <button
                type="button"
                onClick={handleOpenCreateCurrency}
                className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition shrink-0"
              >
                + Add Currency
              </button>
            )}
          </div>

          {/* INLINE CURRENCY FORM (EXPANDS IN PAGE WHEN ADDING OR EDITING - NO POPUP) */}
          {isCurrencyFormOpen && (
            <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-4 animate-in fade-in duration-150">
              <div className="w-full flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {currencyFormMode === 'create' ? 'Add Institutional Currency' : `Edit Currency: ${currencyForm.code}`}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Define code, symbol, exchange rate, and base currency flag.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCurrencyFormOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSaveCurrency} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Currency Code *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. USD, EUR, BDT"
                      value={currencyForm.code}
                      onChange={(e) => setCurrencyForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      maxLength={5}
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                      required
                      disabled={currencyFormMode === 'edit'}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Symbol *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. $, ৳, €, £"
                      value={currencyForm.symbol}
                      onChange={(e) => setCurrencyForm(prev => ({ ...prev, symbol: e.target.value }))}
                      maxLength={10}
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. US Dollar, Euro"
                      value={currencyForm.name}
                      onChange={(e) => setCurrencyForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Exchange Rate (vs Base) *
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      placeholder="1.0"
                      value={currencyForm.exchange_rate}
                      onChange={(e) => setCurrencyForm(prev => ({ ...prev, exchange_rate: e.target.value }))}
                      disabled={currencyForm.is_base_currency}
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={currencyForm.is_base_currency}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setCurrencyForm(prev => ({
                          ...prev,
                          is_base_currency: checked,
                          exchange_rate: checked ? '1.0' : prev.exchange_rate
                        }));
                      }}
                      className="rounded text-primary cursor-pointer"
                    />
                    <span>Set as Primary Base Currency</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={currencyForm.is_active}
                      onChange={(e) => setCurrencyForm(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="rounded text-primary cursor-pointer"
                    />
                    <span>Active Currency</span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCurrencyFormOpen(false)}
                    className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingCurrency}
                    className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition disabled:opacity-50"
                  >
                    {savingCurrency ? 'Saving...' : 'Save Currency'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Currencies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {portalCurrencies.map(cur => {
              const isBase = cur.is_base_currency || cur.code === websiteCurrency;
              const configuredAccounts = accounts.filter(a => (a.currency || websiteCurrency) === cur.code);
              const supportedGateways = gateways.filter(g => Array.isArray(g.supported_currencies) && g.supported_currencies.includes(cur.code));

              return (
                <div
                  key={cur.code}
                  className={`bg-white dark:bg-slate-900 border rounded-md p-3.5 space-y-3 flex flex-col justify-between ${
                    isBase
                      ? 'border-primary ring-1 ring-primary/20'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center font-semibold font-mono text-sm">
                          {cur.symbol || '$'}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm text-slate-900 dark:text-white font-mono">
                              {cur.code}
                            </span>
                            {isBase ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-primary/10 text-primary border border-primary/20">
                                BASE
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Rate: {cur.exchange_rate}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">
                            {cur.name}
                          </span>
                        </div>
                      </div>

                      {!isBase && (
                        <button
                          type="button"
                          onClick={() => handleToggleCurrencyActive(cur)}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
                            cur.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {cur.is_active ? 'Active' : 'Disabled'}
                        </button>
                      )}
                    </div>

                    <div className="p-2 rounded-md bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Configured Accounts:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                          {configuredAccounts.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Compatible Gateways:</span>
                        <span className="text-slate-700 dark:text-slate-300">
                          {supportedGateways.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    {!isBase ? (
                      <button
                        type="button"
                        onClick={() => handleSetBaseCurrency(cur)}
                        className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                      >
                        Set Base
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-600 font-medium">Default Unit</span>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditCurrency(cur)}
                        className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                        title="Edit Currency"
                      >
                        <FiEdit2 className="text-xs" />
                      </button>

                      {!isBase && configuredAccounts.length === 0 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCurrency(cur)}
                          className="p-1.5 rounded-md border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 cursor-pointer"
                          title="Delete Currency"
                        >
                          <FiTrash2 className="text-xs" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
