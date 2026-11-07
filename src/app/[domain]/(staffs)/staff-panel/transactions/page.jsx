"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";

export default function TenantTransactionsAndAccountsPage() {
  const params = useParams();
  const domain = params?.domain;

  const [activeTab, setActiveTab] = useState("transactions"); 
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    website: { currency: "BDT" },
    summary: {},
    merchantAccounts: [],
    transactions: [],
    platformFeeDeductions: [],
    merchantLedger: [],
  });

  const [purposeFilter, setPurposeFilter] = useState("all");
  const [gatewayFilter, setGatewayFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [newAcc, setNewAcc] = useState({
    gatewayCode: "surjopay",
    accountName: "",
    accountNumber: "",
    currency: "BDT",
    routingMode: "single_all", 
    selectedPurposes: ["admission_fees", "education_fees"],
    payoutMethod: "bank", 
    bankName: "",
    branchName: "",
    routingNumber: "",
    accountHolderName: "",
    paypalEmail: "",
    paddleVendorId: "",
    isDefault: true,
  });

  const fetchTransactionsData = useCallback(async () => {
    if (!domain) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        purpose: purposeFilter,
        gateway: gatewayFilter,
        status: statusFilter,
        search: searchQuery,
      });
      const res = await fetch(`/api/${domain}/staff/panel/transactions?${qs.toString()}`);
      const json = await res.json();
      if (res.ok) setData(json);
    } catch (err) {
      console.error("Failed to load transactions:", err);
    } finally {
      setLoading(false);
    }
  }, [domain, purposeFilter, gatewayFilter, statusFilter, searchQuery]);

  useEffect(() => {
    fetchTransactionsData();
  }, [fetchTransactionsData]);

  const handleCurrencyChange = async (newCurrency) => {
    const symbolMap = { BDT: "৳", USD: "$", EUR: "€", GBP: "£", INR: "₹" };
    const res = await fetch(`/api/${domain}/staff/panel/configure/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "SET_WEBSITE_CURRENCY",
        currencyCode: newCurrency,
        symbol: symbolMap[newCurrency] || "$",
      }),
    });
    if (res.ok) fetchTransactionsData();
  };

  const handleAddMerchantAccount = async (e) => {
    e.preventDefault();
    const purposes =
      newAcc.routingMode === "single_all" ? ["all_fees"] : newAcc.selectedPurposes;

    const payoutDetails =
      newAcc.gatewayCode === "surjopay"
        ? {
            payout_method: newAcc.payoutMethod,
            account_holder_name: newAcc.accountHolderName,
            account_number: newAcc.accountNumber,
            bank_name: newAcc.bankName,
            branch_name: newAcc.branchName,
            routing_number: newAcc.routingNumber,
          }
        : newAcc.gatewayCode === "paypal"
        ? { paypal_email: newAcc.paypalEmail }
        : { paddle_vendor_id: newAcc.paddleVendorId };

    const res = await fetch(`/api/${domain}/staff/panel/configure/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ADD_MERCHANT_ACCOUNT",
        gatewayCode: newAcc.gatewayCode,
        accountName: newAcc.accountName,
        accountNumber:
          newAcc.gatewayCode === "paypal"
            ? newAcc.paypalEmail
            : newAcc.gatewayCode === "paddle"
            ? newAcc.paddleVendorId
            : newAcc.accountNumber,
        currency: newAcc.currency,
        payoutDetails,
        purposes,
        isDefault: newAcc.isDefault,
      }),
    });

    if (res.ok) {
      alert("Merchant Payout Account & Purpose Routing saved!");
      fetchTransactionsData();
      setActiveTab("transactions");
    } else {
      const err = await res.json();
      alert(err.error || "Failed to save account");
    }
  };

  const togglePurposeSelection = (purposeKey) => {
    setNewAcc((prev) => {
      const exists = prev.selectedPurposes.includes(purposeKey);
      return {
        ...prev,
        selectedPurposes: exists
          ? prev.selectedPurposes.filter((p) => p !== purposeKey)
          : [...prev.selectedPurposes, purposeKey],
      };
    });
  };

  const cur = data.website?.currency || "BDT";

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 rounded-xl bg-white p-6 shadow-sm border border-slate-200 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Institutional Payment Ledger, Splits & Payout Accounts
            </h1>
            <p className="text-sm text-slate-500">
              All student fee collections, real-time transaction fee splits, per-student deductions, and payout accounts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Website Fee Currency:
            </label>
            <select
              value={cur}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800"
            >
              <option value="BDT">BDT (৳ - Bangladeshi Taka)</option>
              <option value="USD">USD ($ - US Dollar)</option>
              <option value="EUR">EUR (€ - Euro)</option>
              <option value="GBP">GBP (£ - British Pound)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
            <p className="text-xs font-medium uppercase text-slate-500">Gross Fee Collected</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {cur} {Number(data.summary?.total_gross_collected || 0).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-emerald-600">
              {data.summary?.successful_tx_count || 0} successful payments
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
            <p className="text-xs font-medium uppercase text-slate-500">Gateway Processing Fees</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">
              - {cur} {Number(data.summary?.total_gateway_fees || 0).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-400">shurjoPay / PayPal / Paddle</p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
            <p className="text-xs font-medium uppercase text-slate-500">Per-Transaction Splits</p>
            <p className="mt-2 text-2xl font-bold text-rose-600">
              - {cur} {Number(data.summary?.total_tx_commissions || 0).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-400">Split at checkout time</p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
            <p className="text-xs font-medium uppercase text-slate-500">Per-Student Deductions</p>
            <p className="mt-2 text-2xl font-bold text-purple-600">
              - {cur} {Number(data.summary?.total_student_headcount_deductions || 0).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-400">Deducted on cycle / renewal</p>
          </div>

          <div className="rounded-xl bg-emerald-900 p-5 text-white shadow-sm">
            <p className="text-xs font-medium uppercase text-emerald-200">Net Credited to Institution</p>
            <p className="mt-2 text-2xl font-bold">
              {cur} {Number(data.summary?.total_merchant_net || 0).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-emerald-200">Across {data.merchantAccounts.length} payout account(s)</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          {[
            { id: "transactions", label: "1. All Student Fee Transactions" },
            { id: "deductions", label: "2. Platform Fee Deductions (Per-Tx & Per-Student)" },
            { id: "ledger", label: "3. Merchant Double-Entry Balance Ledger" },
            { id: "accounts", label: "4. Configure Merchant Accounts & Purpose Routing" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "transactions" && (
          <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <input
                type="text"
                placeholder="Search TxID, Invoice, Student Name, Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <select
                value={purposeFilter}
                onChange={(e) => setPurposeFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="all">All Fee Purposes</option>
                <option value="admission_fees">Admission Fees</option>
                <option value="education_fees">Academic / Tuition Fees</option>
                <option value="exam_fees">Examination Fees</option>
                <option value="residential_fees">Hall / Hostel Fees</option>
                <option value="other_fees">Other Fees</option>
              </select>
              <select
                value={gatewayFilter}
                onChange={(e) => setGatewayFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="all">All Gateways (shurjoPay, PayPal, Paddle)</option>
                <option value="surjopay">shurjoPay</option>
                <option value="paypal">PayPal</option>
                <option value="paddle">Paddle</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="successful">Successful</option>
                <option value="initiated">Initiated / Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-3">Date & TxID</th>
                    <th className="p-3">Payer & Invoice</th>
                    <th className="p-3">Purpose & Account</th>
                    <th className="p-3">Gateway</th>
                    <th className="p-3 text-right">Gross</th>
                    <th className="p-3 text-right">GW Fee</th>
                    <th className="p-3 text-right">SaaS Split</th>
                    <th className="p-3 text-right">Net Credited</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-slate-400">
                        Loading transaction records...
                      </td>
                    </tr>
                  ) : data.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-slate-400">
                        No transactions found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    data.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <div className="font-mono text-xs font-semibold text-slate-800">
                            {tx.transaction_id}
                          </div>
                          <div className="text-xs text-slate-400">
                            {new Date(tx.created_at).toLocaleString()}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-slate-800">{tx.payer_name}</div>
                          <div className="text-xs text-slate-500">
                            Ref: {tx.invoice_ref} | {tx.payer_phone || tx.payer_email}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                            {tx.purpose}
                          </span>
                          <div className="mt-1 text-xs text-slate-500">
                            {tx.merchant_account_name || "Default Account"}
                          </div>
                        </td>
                        <td className="p-3 uppercase text-xs font-bold text-slate-700">
                          {tx.gateway_code}
                        </td>
                        <td className="p-3 text-right font-semibold">
                          {tx.currency} {Number(tx.gross_amount).toFixed(2)}
                        </td>
                        <td className="p-3 text-right text-amber-600">
                          -{Number(tx.gateway_processing_fee).toFixed(2)}
                        </td>
                        <td className="p-3 text-right text-rose-600">
                          -{Number(tx.platform_commission_amount).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-700">
                          {tx.currency} {Number(tx.merchant_net_amount).toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              tx.status === "successful"
                                ? "bg-emerald-100 text-emerald-800"
                                : tx.status === "failed"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "deductions" && (
          <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="mb-4 text-lg font-bold text-slate-800">
              Platform Fee Deductions Audit Log (Per-Student Cycle & Real-Time Transaction Splits)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Deduction Type</th>
                    <th className="p-3">Merchant Account Debited</th>
                    <th className="p-3">Student Count & Rate</th>
                    <th className="p-3 text-right">Total Deducted</th>
                    <th className="p-3">Notes / Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.platformFeeDeductions.map((d) => (
                    <tr key={d.id}>
                      <td className="p-3 text-xs text-slate-500">
                        {new Date(d.created_at).toLocaleString()}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{d.deduction_type}</td>
                      <td className="p-3 text-slate-600">{d.account_name || "Master Balance"}</td>
                      <td className="p-3 text-xs text-slate-600">
                        {d.active_student_count > 0
                          ? `${d.active_student_count} students × ${d.fee_per_student} ${d.currency}`
                          : "Transaction Split"}
                      </td>
                      <td className="p-3 text-right font-bold text-rose-600">
                        -{d.currency} {Number(d.total_deducted_amount).toFixed(2)}
                      </td>
                      <td className="p-3 text-xs text-slate-500">{d.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "ledger" && (
          <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="mb-4 text-lg font-bold text-slate-800">
              Immutable Double-Entry Merchant Account Ledger
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Account</th>
                    <th className="p-3">Entry Type</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-right">Running Balance After</th>
                    <th className="p-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.merchantLedger.map((row) => (
                    <tr key={row.id}>
                      <td className="p-3 text-xs text-slate-500">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="p-3 font-medium text-slate-800">{row.account_name}</td>
                      <td className="p-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${
                            row.entry_type === "credit"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {row.entry_type}
                        </span>
                      </td>
                      <td className="p-3 text-xs font-mono text-slate-600">{row.category}</td>
                      <td
                        className={`p-3 text-right font-bold ${
                          row.entry_type === "credit" ? "text-emerald-700" : "text-rose-600"
                        }`}
                      >
                        {row.entry_type === "credit" ? "+" : "-"}
                        {row.currency} {Number(row.amount).toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {row.currency} {Number(row.balance_after).toFixed(2)}
                      </td>
                      <td className="p-3 text-xs text-slate-500">{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "accounts" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <form
              onSubmit={handleAddMerchantAccount}
              className="rounded-xl bg-white p-6 shadow-sm border border-slate-200 space-y-4"
            >
              <h2 className="text-lg font-bold text-slate-900">
                Add Merchant / Bank Payout Account
              </h2>
              <p className="text-xs text-slate-500">
                Use one account for all institutional fees or assign separate accounts for Admission, Academic Tuition, Exam, and Hall fees.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Gateway Channel</label>
                  <select
                    value={newAcc.gatewayCode}
                    onChange={(e) => setNewAcc({ ...newAcc, gatewayCode: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
                  >
                    <option value="surjopay">shurjoPay (BDT Bank / bKash / Nagad Payout)</option>
                    <option value="paypal">PayPal Commerce (Global USD Split)</option>
                    <option value="paddle">Paddle Billing (Global Cards & Multi-Currency)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Account Currency</label>
                  <select
                    value={newAcc.currency}
                    onChange={(e) => setNewAcc({ ...newAcc, currency: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
                  >
                    <option value="BDT">BDT (৳)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Account Label (e.g., "Main Tuition Bank Account" or "Admission bKash")
                </label>
                <input
                  type="text"
                  required
                  value={newAcc.accountName}
                  onChange={(e) => setNewAcc({ ...newAcc, accountName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
                />
              </div>

              {newAcc.gatewayCode === "surjopay" && (
                <div className="space-y-3 rounded-lg bg-slate-50 p-4 border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Payout Method</label>
                    <select
                      value={newAcc.payoutMethod}
                      onChange={(e) => setNewAcc({ ...newAcc, payoutMethod: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
                    >
                      <option value="bank">Local Bank Account (BEFTN / NPSB)</option>
                      <option value="bkash">bKash Merchant / Personal Number</option>
                      <option value="nagad">Nagad Number</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Account Holder Name"
                      value={newAcc.accountHolderName}
                      onChange={(e) => setNewAcc({ ...newAcc, accountHolderName: e.target.value })}
                      className="rounded-lg border border-slate-300 p-2 text-sm"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Bank Account No / Mobile No"
                      value={newAcc.accountNumber}
                      onChange={(e) => setNewAcc({ ...newAcc, accountNumber: e.target.value })}
                      className="rounded-lg border border-slate-300 p-2 text-sm"
                    />
                  </div>
                  {newAcc.payoutMethod === "bank" && (
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Bank Name"
                        value={newAcc.bankName}
                        onChange={(e) => setNewAcc({ ...newAcc, bankName: e.target.value })}
                        className="rounded-lg border border-slate-300 p-2 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Branch Name"
                        value={newAcc.branchName}
                        onChange={(e) => setNewAcc({ ...newAcc, branchName: e.target.value })}
                        className="rounded-lg border border-slate-300 p-2 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Routing Number"
                        value={newAcc.routingNumber}
                        onChange={(e) => setNewAcc({ ...newAcc, routingNumber: e.target.value })}
                        className="rounded-lg border border-slate-300 p-2 text-sm"
                      />
                    </div>
                  )}
                </div>
              )}

              {newAcc.gatewayCode === "paypal" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Connected PayPal Merchant Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="bursar@institution.edu"
                    value={newAcc.paypalEmail}
                    onChange={(e) => setNewAcc({ ...newAcc, paypalEmail: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
                  />
                </div>
              )}

              {newAcc.gatewayCode === "paddle" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Paddle Seller / Vendor ID (or Payout Email)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 12345 or finance@institution.edu"
                    value={newAcc.paddleVendorId}
                    onChange={(e) => setNewAcc({ ...newAcc, paddleVendorId: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
                  />
                </div>
              )}

              <div className="space-y-2 pt-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Which Institutional Fee Tasks Should Route to This Account?
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={newAcc.routingMode === "single_all"}
                      onChange={() => setNewAcc({ ...newAcc, routingMode: "single_all" })}
                    />
                    Single Account for ALL Fees (`all_fees`)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={newAcc.routingMode === "separate"}
                      onChange={() => setNewAcc({ ...newAcc, routingMode: "separate" })}
                    />
                    Select Specific Fee Tasks
                  </label>
                </div>

                {newAcc.routingMode === "separate" && (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {[
                      { code: "admission_fees", label: "Admission Fees" },
                      { code: "education_fees", label: "Academic / Tuition Fees" },
                      { code: "exam_fees", label: "Exam Registration Fees" },
                      { code: "residential_fees", label: "Hall / Hostel Fees" },
                      { code: "other_fees", label: "Other Miscellaneous Fees" },
                    ].map((p) => (
                      <label
                        key={p.code}
                        className="flex items-center gap-2 rounded border border-slate-200 p-2 text-xs font-medium"
                      >
                        <input
                          type="checkbox"
                          checked={newAcc.selectedPurposes.includes(p.code)}
                          onChange={() => togglePurposeSelection(p.code)}
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Save Merchant Account & Purpose Route
              </button>
            </form>

            <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Active Institution Payout Accounts</h2>
              <div className="space-y-3">
                {data.merchantAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{acc.account_name}</span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold uppercase text-slate-700">
                          {acc.gateway_code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Destination: {acc.account_number} ({acc.currency})
                      </p>
                      <p className="text-xs text-rose-600 mt-0.5">
                        Total SaaS Fees Paid: {acc.currency}{" "}
                        {Number(acc.total_platform_fees_paid || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Available Balance</p>
                      <p className="text-lg font-bold text-emerald-700">
                        {acc.currency} {Number(acc.available_balance || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}