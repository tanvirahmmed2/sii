'use client';

import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import TenantLoader from 'src/component/tenant/TenantLoader';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { exportElementAsJpeg, exportElementAsPdf } from 'src/lib/export/documentExporter';
import { 
  FiFileText, FiPrinter, FiDownload, FiCheckCircle, 
  FiDollarSign, FiClock, FiEye, FiArrowLeft, FiHash 
} from 'react-icons/fi';

export default function StudentReceiptsPage() {
  const { website, getApiEndpoint } = useTenantWebsite();
  const [student, setStudent] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [template, setTemplate] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const receiptRef = useRef(null);

  useEffect(() => {
    const fetchReceipts = async () => {
      try {
        const res = await fetch(getApiEndpoint('student/receipts'));
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setStudent(data.student || null);
            setReceipts(data.receipts || []);
            setTemplate(data.template || null);
            if ((data.receipts || []).length > 0) {
              setSelectedReceipt(data.receipts[0]);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching student receipts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReceipts();
  }, [getApiEndpoint]);

  if (loading) {
    return <TenantLoader fullScreen={false} />;
  }

  // Compile active template with selected receipt details
  const compileReceiptHtml = (rec) => {
    if (!rec) return null;
    const tplHtml = template?.html_content || '';
    const tplCss = template?.css_content || '';

    const replacements = {
      '{{receipt_no}}': rec.receipt_no || `REC-${rec.id}`,
      '{{invoice_no}}': rec.receipt_no || `REC-${rec.id}`,
      '{{payment_date}}': rec.payment_date ? new Date(rec.payment_date).toLocaleDateString('en-GB') : '—',
      '{{student_name}}': student?.name || 'Student Name',
      '{{registration_no}}': student?.registration_no || 'REG-0001',
      '{{roll_no}}': student?.roll_no || '—',
      '{{class_name}}': student?.class_name || 'Class',
      '{{section_name}}': student?.section_name || 'Section',
      '{{fee_month}}': rec.fee_month || 'Current Month',
      '{{fee_title}}': rec.title || 'Tuition Fee',
      '{{total_amount}}': `$${parseFloat(rec.total_amount || 0).toFixed(2)}`,
      '{{discount}}': '$0.00',
      '{{paid_amount}}': `$${parseFloat(rec.paid_amount || 0).toFixed(2)}`,
      '{{due_balance}}': `$${parseFloat(rec.due_balance || 0).toFixed(2)}`,
      '{{payment_method}}': rec.payment_method || 'Online / Gateway',
      '{{transaction_id}}': rec.transaction_id || 'TRX-DEFAULT',
      '{{school_name}}': website?.name || 'Educational Institution',
      '{{school_logo}}': website?.logo_url || '/school-logo.png',
      '{{school_phone}}': website?.phone || '+880 1700-000000',
      '{{school_address}}': website?.address || 'Campus Address',
    };

    let html = tplHtml;
    Object.entries(replacements).forEach(([k, v]) => {
      const reg = new RegExp(k.replace(/([{}])/g, '\\$1'), 'g');
      html = html.replace(reg, v);
    });

    return { html, css: tplCss };
  };

  const compiled = compileReceiptHtml(selectedReceipt);

  const handleDownloadJpeg = async () => {
    if (!receiptRef.current) return;
    setIsExporting(true);
    toast.loading('Exporting Payment Receipt JPEG...', { id: 'rec-export' });
    try {
      await exportElementAsJpeg(receiptRef.current, `Receipt_${selectedReceipt?.receipt_no || 'fee'}`);
      toast.success('Receipt JPEG downloaded successfully!', { id: 'rec-export' });
    } catch {
      toast.error('Failed to export JPEG.', { id: 'rec-export' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!receiptRef.current) return;
    setIsExporting(true);
    toast.loading('Generating Official Receipt PDF...', { id: 'rec-export' });
    try {
      await exportElementAsPdf(receiptRef.current, `Receipt_${selectedReceipt?.receipt_no || 'fee'}`, {
        widthMm: 210,
        heightMm: 148,
      });
      toast.success('Official Receipt PDF downloaded!', { id: 'rec-export' });
    } catch {
      toast.error('Failed to export PDF.', { id: 'rec-export' });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-12 animate-fade-up">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/70 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FiFileText /> Finance &amp; Fee Receipts
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Payment Receipts</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-1">
            Access verified institutional transaction records and official payment vouchers for all settled invoices.
          </p>
        </div>

        {selectedReceipt && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleDownloadJpeg}
              disabled={isExporting}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              <FiDownload className="text-xs" /> JPEG
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              <FiDownload className="text-xs" /> PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <FiPrinter className="text-xs" /> Print
            </button>
          </div>
        )}
      </div>

      {receipts.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-xs space-y-3">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400">
            <FiDollarSign className="text-3xl" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">No Settled Payment Receipts Found</h3>
          <p className="text-slate-400 text-xs max-w-sm">
            You do not have any paid invoices or settled fees recorded in the portal yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Receipts Sidebar List */}
          <div className="lg:col-span-5 bg-white border border-slate-200/70 rounded-3xl p-4 shadow-xs space-y-2">
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Settled Invoices ({receipts.length})
              </span>
              <span className="text-[11px] text-slate-400">Click to preview</span>
            </div>

            <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
              {receipts.map((rec) => {
                const isSelected = selectedReceipt?.id === rec.id;
                const recDate = rec.payment_date ? new Date(rec.payment_date).toLocaleDateString('en-GB') : '—';

                return (
                  <div
                    key={rec.id}
                    onClick={() => setSelectedReceipt(rec)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500'
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {rec.receipt_no || `REC-${rec.id}`}
                        </span>
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold">
                          Paid
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-700 truncate max-w-[200px]">
                        {rec.title} ({rec.fee_month || 'Fee'})
                      </p>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Paid on: {recDate}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-slate-900 block">
                        ${parseFloat(rec.paid_amount || 0).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {rec.payment_method || 'Online'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Receipt Document Viewer */}
          <div className="lg:col-span-7 bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col items-center space-y-4">
            <div className="flex items-center justify-between w-full border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Official Payment Voucher Preview
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Receipt: {selectedReceipt?.receipt_no || `REC-${selectedReceipt?.id}`}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <FiCheckCircle className="text-xs" /> Certified Settled
              </span>
            </div>

            {/* Render Template Canvas */}
            {compiled && (
              <div className="w-full flex justify-center overflow-x-auto p-4 bg-slate-50 rounded-2xl">
                <style dangerouslySetInnerHTML={{ __html: compiled.css }} />
                <div
                  ref={receiptRef}
                  className="bg-white shadow-md border border-slate-200 rounded p-6 max-w-2xl w-full"
                >
                  {compiled.html ? (
                    <div dangerouslySetInnerHTML={{ __html: compiled.html }} />
                  ) : (
                    /* Fallback Clean Voucher Layout */
                    <div className="space-y-4 text-xs">
                      <div className="text-center border-b pb-4">
                        <h2 className="text-lg font-bold text-slate-900">{website?.name || 'Educational Institution'}</h2>
                        <p className="text-slate-500">{website?.address || 'Campus Academic Office'}</p>
                        <p className="font-semibold uppercase tracking-wider text-indigo-600 mt-1">Official Money Receipt</p>
                      </div>

                      <div className="flex justify-between border-b pb-2 font-mono">
                        <span>Receipt No: <strong>{selectedReceipt.receipt_no}</strong></span>
                        <span>Date: <strong>{new Date().toLocaleDateString('en-GB')}</strong></span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 border-b pb-3">
                        <div>Student Name: <strong>{student?.name}</strong></div>
                        <div>Reg No: <strong>{student?.registration_no}</strong></div>
                        <div>Class: <strong>{student?.class_name}</strong></div>
                        <div>Month: <strong>{selectedReceipt.fee_month}</strong></div>
                      </div>

                      <div className="flex justify-between pt-2 text-sm font-bold">
                        <span>Total Settled Amount:</span>
                        <span className="text-emerald-700 font-mono">${parseFloat(selectedReceipt.paid_amount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
