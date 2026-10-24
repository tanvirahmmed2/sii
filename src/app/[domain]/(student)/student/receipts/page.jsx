'use client';

import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import TenantLoader from 'src/component/tenant/TenantLoader';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { exportElementAsJpeg, exportElementAsPdf } from 'src/lib/export/documentExporter';

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

  const currencySymbol = website?.currency === 'USD' ? '$' : '৳';

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
      '{{registration_no}}': student?.registration_no || student?.registration_number || 'REG-0001',
      '{{roll_no}}': student?.roll_no || '—',
      '{{class_name}}': student?.class_name || 'Class',
      '{{section_name}}': student?.section_name || 'Section',
      '{{fee_month}}': rec.fee_month || 'Current Month',
      '{{fee_title}}': rec.title || 'Tuition Fee',
      '{{total_amount}}': `${currencySymbol}${parseFloat(rec.total_amount || 0).toFixed(2)}`,
      '{{discount}}': `${currencySymbol}0.00`,
      '{{paid_amount}}': `${currencySymbol}${parseFloat(rec.paid_amount || 0).toFixed(2)}`,
      '{{due_balance}}': `${currencySymbol}${parseFloat(rec.due_balance || 0).toFixed(2)}`,
      '{{payment_method}}': rec.payment_method || 'Online / Gateway',
      '{{transaction_id}}': rec.transaction_id || 'TRX-DEFAULT',
      '{{school_name}}': website?.name || 'Educational Institution',
      '{{school_logo}}': website?.logo_url || website?.logo || '',
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
    toast.loading('Exporting receipt JPEG...', { id: 'rec-export' });
    try {
      await exportElementAsJpeg(receiptRef.current, `Receipt_${selectedReceipt?.receipt_no || 'fee'}`);
      toast.success('Receipt JPEG downloaded successfully!', { id: 'rec-export' });
    } catch {
      toast.error('Failed to export image.', { id: 'rec-export' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!receiptRef.current) return;
    setIsExporting(true);
    toast.loading('Exporting receipt PDF...', { id: 'rec-export' });
    try {
      await exportElementAsPdf(receiptRef.current, `Receipt_${selectedReceipt?.receipt_no || 'fee'}`);
      toast.success('Receipt PDF downloaded successfully!', { id: 'rec-export' });
    } catch {
      toast.error('Failed to export PDF.', { id: 'rec-export' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full space-y-4 pb-8">
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 gap-2">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Official Tuition Payment Receipts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Verified institutional vouchers generated using official templates.
          </p>
        </div>
        {selectedReceipt && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isExporting}
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              Print
            </button>
            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownloadJpeg}
              className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              JPEG
            </button>
            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownloadPdf}
              className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition disabled:opacity-50"
            >
              Download PDF
            </button>
          </div>
        )}
      </div>

      {receipts.length === 0 ? (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-8 text-center space-y-1">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">No Payment Receipts Available</p>
          <p className="text-xs text-slate-400">
            You do not have any completed fee transactions with issued receipts yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Receipts Sidebar List */}
          <div className="lg:col-span-4 space-y-2">
            <div className="pb-1">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Payment Transactions ({receipts.length})
              </span>
            </div>

            <div className="space-y-1.5">
              {receipts.map((rec) => {
                const isSelected = selectedReceipt?.id === rec.id;
                return (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => setSelectedReceipt(rec)}
                    className={`w-full text-left p-3 rounded-md border transition cursor-pointer flex flex-col space-y-1 ${
                      isSelected
                        ? 'bg-primary/10 border-primary/30 text-slate-900 dark:text-white'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-medium text-slate-900 dark:text-white">
                        {rec.receipt_no || `REC-${rec.id}`}
                      </span>
                      <span className="font-mono font-semibold text-primary">
                        {currencySymbol}{parseFloat(rec.paid_amount || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{rec.title}</span>
                      <span>{rec.payment_date ? new Date(rec.payment_date).toLocaleDateString('en-GB') : '—'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Receipt Document Preview Stage */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 flex flex-col items-center">
            {selectedReceipt && compiled ? (
              <div className="w-full flex flex-col items-center overflow-x-auto">
                <style dangerouslySetInnerHTML={{ __html: compiled.css }} />
                <div
                  ref={receiptRef}
                  className="bg-white text-slate-900 shadow-xs border border-slate-200 rounded p-4 max-w-full print:shadow-none print:border-none"
                  dangerouslySetInnerHTML={{ __html: compiled.html }}
                />
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                Select a receipt transaction from the left list to review document preview.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
