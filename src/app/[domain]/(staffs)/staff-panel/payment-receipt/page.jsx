'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { exportElementAsJpeg, exportElementAsPdf } from 'src/lib/export/documentExporter';

export default function PaymentReceiptPage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  const [receiptNo, setReceiptNo] = useState(`REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [studentName, setStudentName] = useState('Alex Morgan');
  const [regNo, setRegNo] = useState('REG-2026-0081');
  const [className, setClassName] = useState('Grade 10 (Section A)');
  const [feeMonth, setFeeMonth] = useState('October 2026');
  const [totalAmount, setTotalAmount] = useState('$450.00');
  const [discount, setDiscount] = useState('$0.00');
  const [paidAmount, setPaidAmount] = useState('$450.00');
  const [dueBalance, setDueBalance] = useState('$0.00');
  const [paymentMethod, setPaymentMethod] = useState('Online (bKash / Card)');
  const [paymentDate, setPaymentDate] = useState(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
  const [isExporting, setIsExporting] = useState(false);

  const [activeTemplate, setActiveTemplate] = useState(null);
  const printDocRef = useRef(null);

  useEffect(() => {
    async function initData() {
      try {
        const tplRes = await fetch(getApiEndpoint('staff/panel/templates?category=payment_receipt'));
        const tplData = await tplRes.json();
        if (tplRes.ok && tplData.success && tplData.active_template) {
          setActiveTemplate(tplData.active_template);
        }
      } catch (e) {
        console.warn('Notice loading receipt template:', e);
      }
    }
    initData();
  }, []);

  const compileReceipt = () => {
    if (!activeTemplate) return null;
    let html = activeTemplate.html_content || '';
    const css = activeTemplate.css_content || '';

    const replacements = {
      '{{receipt_no}}': receiptNo,
      '{{payment_date}}': paymentDate,
      '{{student_name}}': studentName,
      '{{registration_no}}': regNo,
      '{{class_name}}': className,
      '{{fee_month}}': feeMonth,
      '{{total_amount}}': totalAmount,
      '{{discount}}': discount,
      '{{paid_amount}}': paidAmount,
      '{{due_balance}}': dueBalance,
      '{{payment_method}}': paymentMethod,
      '{{school_name}}': website?.name || 'Sky International Academy',
    };

    Object.entries(replacements).forEach(([k, v]) => {
      const reg = new RegExp(k.replace(/([{}])/g, '\\$1'), 'g');
      html = html.replace(reg, v);
    });

    return { html, css };
  };

  const handleExportJpeg = async () => {
    if (!printDocRef.current) return;
    setIsExporting(true);
    toast.loading('Exporting High-Res JPEG...', { id: 'rec-export' });
    try {
      await exportElementAsJpeg(printDocRef.current, `Receipt_${receiptNo}`);
      toast.success('Payment Receipt JPEG downloaded!', { id: 'rec-export' });
    } catch {
      toast.error('Failed to export JPEG', { id: 'rec-export' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!printDocRef.current) return;
    setIsExporting(true);
    toast.loading('Generating Official PDF...', { id: 'rec-export' });
    try {
      await exportElementAsPdf(printDocRef.current, `Receipt_${receiptNo}`, {
        widthMm: 210,
        heightMm: 148,
      });
      toast.success('Official Payment Receipt PDF downloaded!', { id: 'rec-export' });
    } catch {
      toast.error('Failed to export PDF', { id: 'rec-export' });
    } finally {
      setIsExporting(false);
    }
  };

  const compiled = compileReceipt();

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Payment Receipt Issuance
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Generate customized official fee payment receipts with instant high-resolution PDF and JPEG export.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/staff-panel/payment-receipt-templates"
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
          >
            Change Template
          </a>
          <button
            type="button"
            onClick={handleExportJpeg}
            disabled={isExporting}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer disabled:opacity-50"
          >
            Export JPEG
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 rounded text-xs font-medium shadow-xs cursor-pointer disabled:opacity-50"
          >
            Download PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-3.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Receipt Particulars
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Receipt No</label>
                <input
                  type="text"
                  value={receiptNo}
                  onChange={(e) => setReceiptNo(e.target.value)}
                  className="w-full font-mono text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Payment Date</label>
                <input
                  type="text"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Student Name</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Reg No</label>
                <input
                  type="text"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  className="w-full font-mono text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Class / Section</label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Fee Term / Month</label>
                <input
                  type="text"
                  value={feeMonth}
                  onChange={(e) => setFeeMonth(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Total Payable</label>
                <input
                  type="text"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="w-full font-mono text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Amount Paid</label>
                <input
                  type="text"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full font-mono font-bold text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-emerald-600"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Payment Method</label>
              <input
                type="text"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Right Preview */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full bg-slate-100 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 overflow-auto flex justify-center">
            {compiled ? (
              <div
                ref={printDocRef}
                className="bg-white shadow-xl text-slate-900"
                style={{
                  width: '595px',
                  minHeight: '419px',
                  boxSizing: 'border-box',
                }}
              >
                <style dangerouslySetInnerHTML={{ __html: compiled.css }} />
                <div dangerouslySetInnerHTML={{ __html: compiled.html }} />
              </div>
            ) : (
              <div className="p-16 flex justify-center items-center">
                <div className="loader loader-md" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
