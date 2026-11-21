'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FiEdit2, FiTrash2, FiSettings, FiEye, FiEyeOff, FiCheckCircle, FiAlertCircle, FiShield, FiCreditCard, FiGlobe, FiDollarSign, FiActivity } from 'react-icons/fi';
const GATEWAY_NAMES: any = {
    bkash: 'bKash Tokenized Checkout',
    eps: 'Easy Payment System (EPS)',
    sslcommerz: 'SSLCommerz Payment Gateway',
    surjopay: 'shurjoPay Merchant Gateway',
    sonali_gateway: 'Sonali Bank e-Payment Gateway',
    stripe: 'Stripe Connect & Card Processing',
    paypal: 'PayPal Commerce Platform',
    paddle: 'Paddle Billing (Global Cards & Multi-Currency)'
};
const GATEWAY_BADGES: any = {
    bkash: 'bg-pink-50 text-pink-700 border-pink-200',
    eps: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    sslcommerz: 'bg-blue-50 text-blue-700 border-blue-200',
    surjopay: 'bg-orange-50 text-orange-700 border-orange-200',
    sonali_gateway: 'bg-amber-50 text-amber-700 border-amber-200',
    stripe: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    paypal: 'bg-sky-50 text-sky-700 border-sky-200',
    paddle: 'bg-teal-50 text-teal-700 border-teal-200'
};
export default function ConfigurePaymentsPage() {
    const params: any = useParams();
    const domain = params?.domain || '';
    const [loading, setLoading] = useState<any>(true);
    const [actionLoading, setActionLoading] = useState<any>(false);
    const [activeTab, setActiveTab] = useState<any>('accounts');
    const [gateways, setGateways] = useState<any>([]);
    const [accounts, setAccounts] = useState<any>([]);
    const [assignments, setAssignments] = useState<any>([]);
    const [feePurposes, setFeePurposes] = useState<any>([]);
    const [hostels, setHostels] = useState<any>([]);
    const [websiteCurrency, setWebsiteCurrency] = useState<any>('BDT');
    const [portalCurrencies, setPortalCurrencies] = useState<any>([]);
    const [metrics, setMetrics] = useState<any>({
        totalAccounts: 0,
        activeAccounts: 0,
        sandboxAccounts: 0,
        liveAccounts: 0,
        assignedRoutes: 0,
        totalRoutes: 6
    });
    const [toast, setToast] = useState<any>(null);
    const [filterGateway, setFilterGateway] = useState<any>('all');
    const [filterEnv, setFilterEnv] = useState<any>('all');
    const [searchQuery, setSearchQuery] = useState<any>('');
    const [isAccountFormOpen, setIsAccountFormOpen] = useState<any>(false);
    const [formMode, setFormMode] = useState<any>('create');
    const [editingAccountId, setEditingAccountId] = useState<any>(null);
    const [formData, setFormData] = useState<any>({
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
    const [showSecrets, setShowSecrets] = useState<any>({});
    const [testResult, setTestResult] = useState<any>(null);
    const [testingAccountId, setTestingAccountId] = useState<any>(null);
    const [detailsAccount, setDetailsAccount] = useState<any>(null);
    const [confirmDialog, setConfirmDialog] = useState<any>(null);
    const [routingMode, setRoutingMode] = useState<any>('modular');
    const [routingForm, setRoutingForm] = useState<any>({});
    const [savingRoute, setSavingRoute] = useState<any>(null);
    const [simTask, setSimTask] = useState<any>('education_fees');
    const [simHostelId, setSimHostelId] = useState<any>('');
    const [simAmount, setSimAmount] = useState<any>('2500');
    const [simPayerName, setSimPayerName] = useState<any>('Rahim Ahmed');
    const [simPayerPhone, setSimPayerPhone] = useState<any>('01712345678');
    const [simResult, setSimResult] = useState<any>(null);
    const [simulating, setSimulating] = useState<any>(false);
    const [isCurrencyFormOpen, setIsCurrencyFormOpen] = useState<any>(false);
    const [currencyForm, setCurrencyForm] = useState<any>({
        code: '',
        name: '',
        symbol: '',
        exchange_rate: '1.0',
        is_base_currency: false,
        is_active: true
    });
    const [savingCurrency, setSavingCurrency] = useState<any>(false);
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [toast]);
    const applyConfigData = useCallback((data: any) => {
        if (!data)
            return;
        if (data.websiteCurrency) {
            setWebsiteCurrency(data.websiteCurrency);
        }
        setGateways(data.gateways || []);
        setAccounts(data.accounts || []);
        setAssignments(data.purposeAssignments || data.assignments || []);
        setFeePurposes(data.feePurposes || data.fee_purposes || []);
        setHostels(data.hostels || []);
        setPortalCurrencies(data.currencies || []);
        setMetrics(data.metrics || {});
        const initialRouting: any = {};
        (data.feePurposes || data.fee_purposes || []).forEach((fp: any) => {
            const matched = (data.purposeAssignments || data.assignments || []).find((a: any) => a.purpose === fp.code && (!a.hostel_id || a.hostel_id === null));
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
        (data.hostels || []).forEach((h: any) => {
            const matched = (data.purposeAssignments || data.assignments || []).find((a: any) => a.purpose === 'residential_fees' && Number(a.hostel_id) === Number(h.id));
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
        const universalMatch = (data.purposeAssignments || data.assignments || []).find((a: any) => a.purpose === 'all_fees');
        if (universalMatch && universalMatch.gateway_account_id && universalMatch.is_active) {
            setRoutingMode('universal');
        }
        else {
            setRoutingMode('modular');
        }
    }, []);
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/${domain}/staff/panel/configure/payments`);
            const data = await res.json();
            if (data.success) {
                applyConfigData(data);
            }
            else {
                setToast({ type: 'error', text: data.error || 'Failed to load payment configuration.' });
            }
        }
        catch {
            setToast({ type: 'error', text: 'Network error loading payment gateways.' });
        }
        finally {
            setLoading(false);
        }
    }, [domain, applyConfigData]);
    useEffect(() => {
        loadData();
    }, [loadData]);
    const activeGatewayObj = useMemo(() => {
        return gateways.find((g: any) => g.code === formData.gateway_code) || null;
    }, [gateways, formData.gateway_code]);
    const filteredAccounts = useMemo(() => {
        return accounts.filter((acc: any) => {
            const matchGateway = filterGateway === 'all' || acc.gateway_code === filterGateway;
            const matchEnv = filterEnv === 'all' || acc.environment === filterEnv;
            const matchSearch = !searchQuery ||
                acc.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (acc.account_number && acc.account_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (GATEWAY_NAMES[acc.gateway_code] && GATEWAY_NAMES[acc.gateway_code].toLowerCase().includes(searchQuery.toLowerCase()));
            return matchGateway && matchEnv && matchSearch;
        });
    }, [accounts, filterGateway, filterEnv, searchQuery]);
    const handleOpenCreateAccount = (gwCode: any = 'bkash') => {
        setFormMode('create');
        setEditingAccountId(null);
        setTestResult(null);
        const chosenGw = gateways.find((g: any) => g.code === gwCode);
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
    };
    const handleOpenEditAccount = (acc: any) => {
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
    };
    const handleFormChange = (field: any, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };
    const handleCredentialChange = (key: any, value: any) => {
        setFormData((prev: any) => ({
            ...prev,
            credentials: {
                ...prev.credentials,
                [key]: value
            }
        }));
    };
    const toggleSecretVisibility = (key: any) => {
        setShowSecrets((prev: any) => ({ ...prev, [key]: !prev[key] }));
    };
    const handleTestConnection = async (targetAccountId: any = null) => {
        const testingKey = targetAccountId || 'form';
        setTestingAccountId(testingKey);
        setTestResult(null);
        try {
            const payload = targetAccountId
                ? {
                    action: 'TEST_CONNECTION',
                    accountId: targetAccountId,
                    gatewayCode: accounts.find((a: any) => a.id === targetAccountId)?.gateway_code,
                    environment: accounts.find((a: any) => a.id === targetAccountId)?.environment
                }
                : {
                    action: 'TEST_CONNECTION',
                    accountId: formMode === 'edit' ? editingAccountId : undefined,
                    gatewayCode: formData.gateway_code,
                    environment: formData.environment,
                    credentials: formData.credentials
                };
            const res = await fetch(`/api/${domain}/staff/panel/configure/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            setTestResult(data);
            if (data.success) {
                setToast({ type: 'success', text: `Verified: ${data.message}` });
            }
            else {
                setToast({ type: 'error', text: `Failed: ${data.message || data.error}` });
            }
        }
        catch (err: any) {
            setTestResult({ success: false, message: err.message });
            setToast({ type: 'error', text: 'Error executing gateway ping test.' });
        }
        finally {
            setTestingAccountId(null);
        }
    };
    const handleSaveAccount = async (e: any) => {
        e.preventDefault();
        if (!formData.account_name.trim()) {
            setToast({ type: 'error', text: 'Account name is required.' });
            return;
        }
        setActionLoading(true);
        try {
            const action = formMode === 'create' ? 'ADD_MERCHANT_ACCOUNT' : 'UPDATE_MERCHANT_ACCOUNT';
            const payload: any = {
                action,
                accountId: editingAccountId,
                gatewayCode: formData.gateway_code,
                accountName: formData.account_name,
                accountNumber: formData.account_number,
                environment: formData.environment,
                currency: formData.currency,
                credentials: formData.credentials,
                isActive: formData.is_active,
                isDefault: formData.is_default,
                notes: formData.notes
            };
            const res = await fetch(`/api/${domain}/staff/panel/configure/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                setToast({ type: 'success', text: `Gateway account successfully ${formMode === 'create' ? 'created' : 'updated'}.` });
                setIsAccountFormOpen(false);
                await loadData();
            }
            else {
                setToast({ type: 'error', text: data.error || 'Failed to save account.' });
            }
        }
        catch {
            setToast({ type: 'error', text: 'Failed to communicate with server.' });
        }
        finally {
            setActionLoading(false);
        }
    };
    const handleToggleAccountActive = async (acc: any) => {
        try {
            const res = await fetch(`/api/${domain}/staff/panel/configure/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'UPDATE_MERCHANT_ACCOUNT',
                    accountId: acc.id,
                    isActive: !acc.is_active
                })
            });
            const data = await res.json();
            if (data.success) {
                setToast({
                    type: 'success',
                    text: `Account '${acc.account_name}' is now ${!acc.is_active ? 'Active' : 'Disabled'}.`
                });
                setAccounts((prev: any) => prev.map((a: any) => a.id === acc.id ? { ...a, is_active: !acc.is_active } : a));
            }
            else {
                setToast({ type: 'error', text: data.error || 'Failed to toggle status.' });
            }
        }
        catch {
            setToast({ type: 'error', text: 'Error updating account status.' });
        }
    };
    const executeDeleteAccount = async (accountId: any) => {
        setActionLoading(true);
        try {
            const res = await fetch(`/api/${domain}/staff/panel/configure/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'DELETE_MERCHANT_ACCOUNT',
                    accountId
                })
            });
            const data = await res.json();
            if (data.success) {
                setToast({ type: 'success', text: 'Gateway account removed.' });
                await loadData();
            }
            else {
                setToast({ type: 'error', text: data.error || 'Failed to delete account.' });
            }
        }
        catch {
            setToast({ type: 'error', text: 'Error deleting gateway account.' });
        }
        finally {
            setActionLoading(false);
            setConfirmDialog(null);
        }
    };
    const handleRoutingFieldChange = (key: any, field: any, value: any) => {
        setRoutingForm((prev: any) => ({
            ...prev,
            [key]: {
                ...prev[key],
                [field]: value
            }
        }));
    };
    const handleSaveRoute = async (key: any, purposeCode: any, hostelId: any = null) => {
        const routeData = routingForm[key];
        if (!routeData || !routeData.gateway_account_id) {
            setToast({ type: 'error', text: 'Please select a primary gateway account.' });
            return;
        }
        setSavingRoute(key);
        try {
            const res = await fetch(`/api/${domain}/staff/panel/configure/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'ASSIGN_PURPOSES',
                    assignments: [
                        {
                            purpose: purposeCode,
                            hostelId: hostelId ? parseInt(hostelId, 10) : null,
                            gatewayAccountId: parseInt(routeData.gateway_account_id, 10),
                            fallbackGatewayAccountId: routeData.fallback_gateway_account_id ? parseInt(routeData.fallback_gateway_account_id, 10) : null,
                            is_active: Boolean(routeData.is_active),
                            allow_student_portal: Boolean(routeData.allow_student_portal),
                            allow_public_checkout: Boolean(routeData.allow_public_checkout),
                            title: routeData.title,
                            description: routeData.description
                        }
                    ]
                })
            });
            const data = await res.json();
            if (data.success) {
                setToast({ type: 'success', text: 'Routing assignment saved.' });
                await loadData();
            }
            else {
                setToast({ type: 'error', text: data.error || 'Failed to save routing.' });
            }
        }
        catch {
            setToast({ type: 'error', text: 'Network error saving route.' });
        }
        finally {
            setSavingRoute(null);
        }
    };
    const handleSaveAllUniversal = async () => {
        const universalRoute = routingForm['all_fees'];
        if (!universalRoute || !universalRoute.gateway_account_id) {
            setToast({ type: 'error', text: 'Please select a primary gateway account for Universal Fees.' });
            return;
        }
        setSavingRoute('all_fees');
        try {
            const res = await fetch(`/api/${domain}/staff/panel/configure/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'ASSIGN_PURPOSES',
                    assignments: [
                        {
                            purpose: 'all_fees',
                            hostelId: null,
                            gatewayAccountId: parseInt(universalRoute.gateway_account_id, 10),
                            fallbackGatewayAccountId: universalRoute.fallback_gateway_account_id ? parseInt(universalRoute.fallback_gateway_account_id, 10) : null,
                            is_active: true,
                            allow_student_portal: true,
                            allow_public_checkout: true,
                            title: 'Universal Institutional Fee Route',
                            description: 'Universal route handling all student fees, exam dues, and admissions.'
                        }
                    ]
                })
            });
            const data = await res.json();
            if (data.success) {
                setToast({ type: 'success', text: 'Universal fee routing established across all student fees.' });
                await loadData();
            }
            else {
                setToast({ type: 'error', text: data.error || 'Failed to establish universal routing.' });
            }
        }
        catch {
            setToast({ type: 'error', text: 'Error establishing universal routing.' });
        }
        finally {
            setSavingRoute(null);
        }
    };
    const handleRunSimulation = async (e: any) => {
        e.preventDefault();
        setSimulating(true);
        setSimResult(null);
        try {
            const res = await fetch(`/api/${domain}/pay/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    purpose: simTask,
                    hostelId: simHostelId ? parseInt(simHostelId, 10) : null,
                    amount: parseFloat(simAmount),
                    payerName: simPayerName,
                    payerPhone: simPayerPhone,
                    invoiceRef: `SIM-${Date.now()}`
                })
            });
            const data = await res.json();
            setSimResult(data);
            if (data.success) {
                setToast({ type: 'success', text: 'Checkout initialized successfully.' });
            }
            else {
                setToast({ type: 'error', text: data.error || 'Simulation failed.' });
            }
        }
        catch (err: any) {
            setSimResult({ success: false, error: err.message });
            setToast({ type: 'error', text: 'Simulation network error.' });
        }
        finally {
            setSimulating(false);
        }
    };
    const handleSetBaseCurrency = async (cur: any) => {
        setActionLoading(true);
        try {
            const res = await fetch(`/api/${domain}/staff/panel/configure/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'SET_WEBSITE_CURRENCY',
                    currencyCode: cur.code,
                    symbol: cur.symbol,
                    exchangeRate: cur.exchange_rate
                })
            });
            const data = await res.json();
            if (data.success) {
                setToast({ type: 'success', text: `Primary currency set to ${cur.code}.` });
                await loadData();
            }
            else {
                setToast({ type: 'error', text: data.error || 'Failed to set currency.' });
            }
        }
        catch {
            setToast({ type: 'error', text: 'Error updating currency.' });
        }
        finally {
            setActionLoading(false);
            setConfirmDialog(null);
        }
    };
    if (loading) {
        return (<div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-slate-300 border-t-emerald-600 rounded-full animate-spin mb-4"/>
        <p className="text-slate-600 font-medium">Loading Institutional Payment Gateway Configurations...</p>
      </div>);
    }
    return (<div className="min-h-screen bg-slate-50 p-6 md:p-10 space-y-8">
      {toast && (<div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold transition-all ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
          {toast.type === 'success' ? <FiCheckCircle className="text-lg"/> : <FiAlertCircle className="text-lg"/>}
          <span>{toast.text}</span>
        </div>)}

      {confirmDialog && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h4 className="text-lg font-bold text-slate-800">{confirmDialog.title}</h4>
            <p className="text-sm text-slate-600">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setConfirmDialog(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">
                Cancel
              </button>
              <button type="button" onClick={confirmDialog.onConfirm} className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm">
                Confirm
              </button>
            </div>
          </div>
        </div>)}

      {detailsAccount && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">{detailsAccount.account_name}</h3>
                <p className="text-xs text-slate-400">{GATEWAY_NAMES[detailsAccount.gateway_code] || detailsAccount.gateway_code}</p>
              </div>
              <button type="button" onClick={() => setDetailsAccount(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
                <div>
                  <span className="text-xs text-slate-500 block">Gateway Code</span>
                  <span className="font-mono font-bold text-slate-800 uppercase">{detailsAccount.gateway_code}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Environment</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase ${detailsAccount.environment === 'live' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {detailsAccount.environment}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Settlement Currency</span>
                  <span className="font-bold text-slate-800">{detailsAccount.currency}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Status</span>
                  <span className="font-bold text-emerald-600">{detailsAccount.is_active ? 'Active & Ready' : 'Disabled'}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">Encrypted Credentials Preview</h5>
                {Object.entries(detailsAccount.credentials || {}).map(([k, v]: any) => (<div key={k} className="flex justify-between items-center text-xs py-1 border-b border-slate-100 last:border-none">
                    <span className="font-medium text-slate-600 capitalize">{k.replace(/_/g, ' ')}:</span>
                    <span className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{String(v)}</span>
                  </div>))}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => handleTestConnection(detailsAccount.id)} disabled={testingAccountId === detailsAccount.id} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg text-xs">
                  {testingAccountId === detailsAccount.id ? 'Pinging Gateway...' : 'Ping Live Status'}
                </button>
                <button type="button" onClick={() => setDetailsAccount(null)} className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg text-xs">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>)}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">
            <FiShield />
            <span>Dedicated Tenant Payment Gateway System</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
            Payment Gateways & Routing
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Connect merchant accounts encrypted with AES-256-GCM. Assign universal or task-specific gateways.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => handleOpenCreateAccount('bkash')} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 text-sm flex items-center gap-2 transition-all">
            <span>+ Add Merchant Account</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium block">Total Accounts</span>
          <span className="text-2xl font-black text-slate-900">{metrics.totalAccounts || accounts.length}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium block">Active</span>
          <span className="text-2xl font-black text-emerald-600">{metrics.activeAccounts || accounts.filter((a: any) => a.is_active).length}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium block">Live Production</span>
          <span className="text-2xl font-black text-blue-600">{metrics.liveAccounts || accounts.filter((a: any) => a.environment === 'live').length}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium block">Sandbox / Test</span>
          <span className="text-2xl font-black text-amber-600">{metrics.sandboxAccounts || accounts.filter((a: any) => a.environment === 'sandbox').length}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium block">Assigned Routes</span>
          <span className="text-2xl font-black text-indigo-600">{metrics.assignedRoutes || assignments.filter((a: any) => a.gateway_account_id).length}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium block">Base Currency</span>
          <span className="text-2xl font-black text-purple-600">{websiteCurrency}</span>
        </div>
      </div>

      <div className="border-b border-slate-200 flex gap-2 overflow-x-auto pb-px">
        {[
            { id: 'accounts', label: 'Merchant Accounts', icon: FiCreditCard },
            { id: 'routing', label: 'Purpose Routing Matrix', icon: FiSettings },
            { id: 'simulator', label: 'Checkout Simulator', icon: FiActivity },
            { id: 'catalog', label: 'Supported Providers (8)', icon: FiGlobe },
            { id: 'currencies', label: 'Currencies', icon: FiDollarSign }
        ].map((t: any) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (<button key={t.id} type="button" onClick={() => setActiveTab(t.id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${isActive
                    ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50 rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'}`}>
              <Icon />
              <span>{t.label}</span>
            </button>);
        })}
      </div>

      {activeTab === 'accounts' && (<div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input type="text" value={searchQuery} onChange={(e: any) => setSearchQuery(e.target.value)} aria-label="Search gateway accounts" className="px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-64"/>
              <span className="text-xs text-slate-400 hidden sm:inline">Search</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select value={filterGateway} onChange={(e: any) => setFilterGateway(e.target.value)} aria-label="Filter by gateway" className="px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                <option value="all">All Gateways</option>
                {gateways.map((g: any) => (<option key={g.code} value={g.code}>{g.name}</option>))}
              </select>

              <select value={filterEnv} onChange={(e: any) => setFilterEnv(e.target.value)} aria-label="Filter by environment" className="px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                <option value="all">All Modes</option>
                <option value="live">Live Production</option>
                <option value="sandbox">Sandbox / Test</option>
              </select>
            </div>
          </div>

          {filteredAccounts.length === 0 ? (<div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-2xl font-bold">
                💳
              </div>
              <h3 className="text-lg font-bold text-slate-800">No Merchant Gateway Accounts Configured</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Connect your institutional merchant accounts for bKash, EPS, SSLCommerz, shurjoPay, Sonali Bank, Stripe, PayPal, or Paddle.
              </p>
              <button type="button" onClick={() => handleOpenCreateAccount('bkash')} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm">
                + Connect Your First Gateway
              </button>
            </div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAccounts.map((acc: any) => {
                    const badgeStyle = GATEWAY_BADGES[acc.gateway_code] || 'bg-slate-100 text-slate-700 border-slate-200';
                    const isTestingThis = testingAccountId === acc.id;
                    return (<div key={acc.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${badgeStyle}`}>
                          {GATEWAY_NAMES[acc.gateway_code] || acc.gateway_code}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${acc.environment === 'live' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {acc.environment}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-base text-slate-900 mt-3">{acc.account_name}</h4>
                      {acc.account_number && (<p className="text-xs text-slate-500 font-mono mt-0.5">Wallet / ID: {acc.account_number}</p>)}

                      <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 block">Currency</span>
                          <span className="font-bold text-slate-700">{acc.currency}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Status</span>
                          <span className={`font-bold ${acc.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {acc.is_active ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => handleTestConnection(acc.id)} disabled={isTestingThis} className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-50">
                          {isTestingThis ? 'Pinging...' : 'Test Connection'}
                        </button>
                        <button type="button" onClick={() => setDetailsAccount(acc)} className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors">
                          Inspect Details
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button type="button" onClick={() => handleToggleAccountActive(acc)} className={`text-xs font-semibold ${acc.is_active ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'}`}>
                          {acc.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => handleOpenEditAccount(acc)} className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100" aria-label="Edit Account">
                            <FiEdit2 />
                          </button>
                          <button type="button" onClick={() => setConfirmDialog({
                            title: `Delete Account "${acc.account_name}"?`,
                            message: 'This will remove the merchant gateway credentials and unassign active fee routes.',
                            onConfirm: () => executeDeleteAccount(acc.id)
                        })} className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50" aria-label="Delete Account">
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>);
                })}
            </div>)}
        </div>)}

      {activeTab === 'routing' && (<div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Payment Routing Architecture</h3>
                <p className="text-sm text-slate-500">
                  Choose between a Universal single gateway for all student fees, or assign separate gateways for separate tasks.
                </p>
              </div>

              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button type="button" onClick={() => setRoutingMode('universal')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${routingMode === 'universal'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'}`}>
                  Universal (All Fees)
                </button>
                <button type="button" onClick={() => setRoutingMode('modular')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${routingMode === 'modular'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'}`}>
                  Task-Specific Modular Routing
                </button>
              </div>
            </div>

            {routingMode === 'universal' && (<div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <FiShield className="text-emerald-600 text-lg"/>
                  <h4 className="font-bold text-slate-900 text-sm">Universal Gateway Route (all_fees)</h4>
                </div>
                <p className="text-xs text-slate-600">
                  When enabled, all student tuition fees, exam fees, admission circular fees, and hostel dues route automatically to this primary gateway.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="universalPrimary">
                      Primary Universal Gateway Account
                    </label>
                    <select id="universalPrimary" value={routingForm['all_fees']?.gateway_account_id || ''} onChange={(e: any) => handleRoutingFieldChange('all_fees', 'gateway_account_id', e.target.value)} aria-label="Primary Universal Gateway Account" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      <option value="">Select Gateway Account</option>
                      {accounts.filter((a: any) => a.is_active).map((a: any) => (<option key={a.id} value={a.id}>
                          {a.account_name} ({GATEWAY_NAMES[a.gateway_code] || a.gateway_code} - {a.environment})
                        </option>))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="universalFallback">
                      Fallback Gateway Account (Optional)
                    </label>
                    <select id="universalFallback" value={routingForm['all_fees']?.fallback_gateway_account_id || ''} onChange={(e: any) => handleRoutingFieldChange('all_fees', 'fallback_gateway_account_id', e.target.value)} aria-label="Fallback Gateway Account" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      <option value="">No Fallback</option>
                      {accounts.filter((a: any) => a.is_active).map((a: any) => (<option key={a.id} value={a.id}>
                          {a.account_name} ({GATEWAY_NAMES[a.gateway_code] || a.gateway_code} - {a.environment})
                        </option>))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button type="button" onClick={handleSaveAllUniversal} disabled={savingRoute === 'all_fees'} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50">
                    {savingRoute === 'all_fees' ? 'Establishing Universal Route...' : 'Apply Universal Route'}
                  </button>
                </div>
              </div>)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {feePurposes.filter((fp: any) => fp.code !== 'all_fees').map((fp: any) => {
                const routeData = routingForm[fp.code] || {};
                const isSaving = savingRoute === fp.code;
                return (<div key={fp.code} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">{fp.label}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{fp.description}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                      {fp.code}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor={`primary_${fp.code}`}>
                        Primary Gateway Account
                      </label>
                      <select id={`primary_${fp.code}`} value={routeData.gateway_account_id || ''} onChange={(e: any) => handleRoutingFieldChange(fp.code, 'gateway_account_id', e.target.value)} aria-label={`Primary Account for ${fp.label}`} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <option value="">Select Gateway Account</option>
                        {accounts.filter((a: any) => a.is_active).map((a: any) => (<option key={a.id} value={a.id}>
                            {a.account_name} ({GATEWAY_NAMES[a.gateway_code] || a.gateway_code} - {a.environment})
                          </option>))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor={`fallback_${fp.code}`}>
                        Fallback Gateway Account (Optional)
                      </label>
                      <select id={`fallback_${fp.code}`} value={routeData.fallback_gateway_account_id || ''} onChange={(e: any) => handleRoutingFieldChange(fp.code, 'fallback_gateway_account_id', e.target.value)} aria-label={`Fallback Account for ${fp.label}`} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <option value="">No Fallback</option>
                        {accounts.filter((a: any) => a.is_active).map((a: any) => (<option key={a.id} value={a.id}>
                            {a.account_name} ({GATEWAY_NAMES[a.gateway_code] || a.gateway_code} - {a.environment})
                          </option>))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={routeData.is_active !== false} onChange={(e: any) => handleRoutingFieldChange(fp.code, 'is_active', e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500"/>
                        <span className="font-semibold text-slate-700">Route Active</span>
                      </label>
                      <button type="button" onClick={() => handleSaveRoute(fp.code, fp.code)} disabled={isSaving} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save Assignment'}
                      </button>
                    </div>
                  </div>
                </div>);
            })}
          </div>
        </div>)}

      {activeTab === 'simulator' && (<div className="max-w-2xl bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">End-to-End Checkout Simulator</h3>
            <p className="text-sm text-slate-500">
              Test your configured gateways and purpose routing as an end student or guardian.
            </p>
          </div>

          <form onSubmit={handleRunSimulation} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="simTaskSelect">
                Fee Purpose Category
              </label>
              <select id="simTaskSelect" value={simTask} onChange={(e: any) => setSimTask(e.target.value)} aria-label="Simulation Fee Purpose" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                {feePurposes.map((fp: any) => (<option key={fp.code} value={fp.code}>{fp.label}</option>))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="simAmountInput">
                  Amount ({websiteCurrency})
                </label>
                <input id="simAmountInput" type="number" value={simAmount} onChange={(e: any) => setSimAmount(e.target.value)} aria-label="Simulation Payment Amount" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="simPayerPhoneInput">
                  Payer Phone
                </label>
                <input id="simPayerPhoneInput" type="tel" value={simPayerPhone} onChange={(e: any) => setSimPayerPhone(e.target.value)} aria-label="Simulation Payer Phone" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="simPayerNameInput">
                Payer Full Name
              </label>
              <input id="simPayerNameInput" type="text" value={simPayerName} onChange={(e: any) => setSimPayerName(e.target.value)} aria-label="Simulation Payer Name" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
            </div>

            <button type="submit" disabled={simulating} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md text-sm transition-all disabled:opacity-50">
              {simulating ? 'Resolving Route & Initiating Gateway...' : 'Simulate Checkout Execution'}
            </button>
          </form>

          {simResult && (<div className={`p-4 rounded-xl border text-sm space-y-2 ${simResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
              <div className="flex justify-between items-center">
                <span className="font-bold">{simResult.success ? 'Gateway Checkout Session Ready' : 'Execution Failed'}</span>
                {simResult.gateway && (<span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-white border">
                    {simResult.gateway}
                  </span>)}
              </div>
              {simResult.checkoutUrl && (<div className="pt-2">
                  <a href={simResult.checkoutUrl} target="_blank" rel="noreferrer" className="inline-block px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg text-xs hover:bg-emerald-700">
                    Open Redirect Checkout URL ↗
                  </a>
                </div>)}
            </div>)}
        </div>)}

      {activeTab === 'catalog' && (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {gateways.map((gw: any) => (<div key={gw.code} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                    {gw.code}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Active Driver
                  </span>
                </div>
                <h4 className="font-extrabold text-base text-slate-900 mt-2">{gw.name}</h4>
                <p className="text-xs text-slate-500 mt-1">{gw.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs text-slate-400 font-mono">
                  {(gw.supported_currencies || []).join(', ')}
                </span>
                <button type="button" onClick={() => handleOpenCreateAccount(gw.code)} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs">
                  Configure
                </button>
              </div>
            </div>))}
        </div>)}

      {activeTab === 'currencies' && (<div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Supported Currencies & Base Denomination</h3>
            <p className="text-sm text-slate-500">
              The primary base currency governs student tuition ledger records and merchant settlement defaults.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {portalCurrencies.map((c: any) => (<div key={c.code} className={`p-4 rounded-xl border flex justify-between items-center ${c.is_base_currency ? 'border-purple-300 bg-purple-50/50' : 'border-slate-200 bg-white'}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900">{c.code}</span>
                    <span className="text-xs font-bold text-slate-400">({c.symbol})</span>
                    {c.is_base_currency && (<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                        Primary Base
                      </span>)}
                  </div>
                  <span className="text-xs text-slate-500 block mt-0.5">{c.name}</span>
                </div>

                {!c.is_base_currency && (<button type="button" onClick={() => setConfirmDialog({
                        title: `Set ${c.code} as Base Currency?`,
                        message: `Institutional tuition fees and ledger entries will be denominated in ${c.name} (${c.symbol}).`,
                        onConfirm: () => handleSetBaseCurrency(c)
                    })} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg">
                    Set Base
                  </button>)}
              </div>))}
          </div>
        </div>)}

      {isAccountFormOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">
                  {formMode === 'create' ? 'Connect Merchant Gateway Account' : 'Edit Gateway Account'}
                </h3>
                <p className="text-xs text-slate-400">
                  Credentials are encrypted using AES-256-GCM before database storage.
                </p>
              </div>
              <button type="button" onClick={() => setIsAccountFormOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="gwCodeSelect">
                  Gateway Provider
                </label>
                <select id="gwCodeSelect" value={formData.gateway_code} onChange={(e: any) => {
                const code = e.target.value;
                handleFormChange('gateway_code', code);
                const chosen = gateways.find((g: any) => g.code === code);
                const supported = Array.isArray(chosen?.supported_currencies) ? chosen.supported_currencies : ['BDT'];
                handleFormChange('currency', supported.includes(websiteCurrency) ? websiteCurrency : supported[0]);
            }} disabled={formMode === 'edit'} aria-label="Gateway Provider" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100">
                  {gateways.map((g: any) => (<option key={g.code} value={g.code}>{g.name}</option>))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="accNameInput">
                  Account Name / Nickname
                </label>
                <input id="accNameInput" type="text" required value={formData.account_name} onChange={(e: any) => handleFormChange('account_name', e.target.value)} aria-label="Account Name" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="accNumberInput">
                    Account / Wallet / Store ID
                  </label>
                  <input id="accNumberInput" type="text" value={formData.account_number} onChange={(e: any) => handleFormChange('account_number', e.target.value)} aria-label="Account / Wallet Number" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="envSelect">
                    Mode / Environment
                  </label>
                  <select id="envSelect" value={formData.environment} onChange={(e: any) => handleFormChange('environment', e.target.value)} aria-label="Environment Mode" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="sandbox">Sandbox / Test</option>
                    <option value="live">Live Production</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="currSelect">
                  Settlement Currency
                </label>
                <select id="currSelect" value={formData.currency} onChange={(e: any) => handleFormChange('currency', e.target.value)} aria-label="Settlement Currency" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  {(activeGatewayObj?.supported_currencies || ['BDT']).map((c: any) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Merchant API Credentials
                  </h4>
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    AES-256-GCM
                  </span>
                </div>

                {Array.isArray(activeGatewayObj?.credential_schema) && activeGatewayObj.credential_schema.map((field: any) => {
                const isSecret = Boolean(field.secret);
                const isVisible = showSecrets[field.key];
                const currentVal = formData.credentials[field.key] || '';
                return (<div key={field.key}>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-semibold text-slate-700" htmlFor={`field_${field.key}`}>
                          {field.label} {field.required && <span className="text-rose-500">*</span>}
                        </label>
                        {isSecret && (<button type="button" onClick={() => toggleSecretVisibility(field.key)} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1">
                            {isVisible ? <FiEyeOff /> : <FiEye />}
                            <span>{isVisible ? 'Mask' : 'Reveal'}</span>
                          </button>)}
                      </div>
                      <input id={`field_${field.key}`} type={isSecret && !isVisible ? 'password' : 'text'} required={field.required} value={currentVal} onChange={(e: any) => handleCredentialChange(field.key, e.target.value)} aria-label={field.label} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"/>
                    </div>);
            })}
              </div>

              {testResult && (<div className={`p-3 rounded-lg text-xs font-medium ${testResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                  {testResult.message}
                </div>)}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                <button type="button" onClick={() => handleTestConnection(null)} disabled={testingAccountId === 'form'} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs">
                  {testingAccountId === 'form' ? 'Testing Handshake...' : 'Test Connection'}
                </button>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setIsAccountFormOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-lg text-xs">
                    Cancel
                  </button>
                  <button type="submit" disabled={actionLoading} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-md disabled:opacity-50">
                    {actionLoading ? 'Saving Account...' : 'Save Account'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>)}
    </div>);
}
