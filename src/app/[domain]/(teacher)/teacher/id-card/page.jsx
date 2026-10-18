'use client';

import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import TenantLoader from 'src/component/tenant/TenantLoader';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { exportElementAsJpeg, exportElementAsPdf } from 'src/lib/export/documentExporter';
import { 
  FiCreditCard, FiPrinter, FiCheckCircle, 
  FiUser, FiDownload, FiLayers 
} from 'react-icons/fi';

export default function TeacherIDCardPage() {
  const { website, getApiEndpoint } = useTenantWebsite();
  const [teacher, setTeacher] = useState(null);
  const [card, setCard] = useState(null);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [cardSideView, setCardSideView] = useState('both'); // 'both' | 'front' | 'back'

  const cardFrontRef = useRef(null);
  const cardBackRef = useRef(null);

  useEffect(() => {
    const fetchTeacherIDCard = async () => {
      try {
        const res = await fetch(getApiEndpoint('teacher/id-card'));
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setTeacher(data.teacher || null);
            setCard(data.card || null);
            setTemplate(data.template || null);
          }
        }
      } catch (error) {
        console.error('Error fetching teacher ID card:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherIDCard();
  }, [getApiEndpoint]);

  if (loading) {
    return <TenantLoader fullScreen={false} />;
  }

  const cardNumber = card?.card_number || `TCH-${teacher?.id || 'FACULTY'}`;
  const issueDateFormatted = card?.issue_date ? new Date(card.issue_date).toLocaleDateString('en-GB') : 'Active Session';
  const expiryDateFormatted = card?.valid_upto || (card?.expiry_date ? new Date(card.expiry_date).toLocaleDateString('en-GB') : 'December 2028');

  // Compile card HTML using active template
  const compileCard = () => {
    if (!template) return null;
    let frontHtml = template.custom_html || template.html_content || '';
    let backHtml = template.custom_html_back || template.html_back_content || '';
    const css = template.custom_css || template.css_content || '';

    const replacements = {
      '{{teacher_name}}': teacher?.name || 'Faculty Member',
      '{{name}}': teacher?.name || 'Faculty Member',
      '{{designation}}': teacher?.designation_title || 'Lecturer / Teacher',
      '{{designation_title}}': teacher?.designation_title || 'Lecturer / Teacher',
      '{{department}}': teacher?.department_name || 'Academic Faculty',
      '{{department_name}}': teacher?.department_name || 'Academic Faculty',
      '{{employee_id}}': cardNumber,
      '{{card_number}}': cardNumber,
      '{{phone}}': teacher?.number || teacher?.emergency_contact || '+880 1700-000000',
      '{{blood_group}}': teacher?.blood_group || 'O+',
      '{{teacher_photo}}': teacher?.photo_url || '/default-avatar.png',
      '{{photo_url}}': teacher?.photo_url || '/default-avatar.png',
      '{{issue_date}}': issueDateFormatted,
      '{{valid_upto}}': expiryDateFormatted,
      '{{expiry_date}}': expiryDateFormatted,
      '{{emergency_contact}}': teacher?.emergency_contact || teacher?.number || website?.phone || '+880 1700-000000',
      '{{institution_name}}': website?.name || 'Educational Institution',
      '{{school_name}}': website?.name || 'Educational Institution',
      '{{institution_logo}}': website?.logo_url || '/school-logo.png',
      '{{school_logo}}': website?.logo_url || '/school-logo.png',
      '{{institution_address}}': website?.address || 'Main Campus',
      '{{institution_phone}}': website?.phone || '+880 2 000000',
    };

    Object.entries(replacements).forEach(([k, v]) => {
      const reg = new RegExp(k.replace(/([{}])/g, '\\$1'), 'g');
      frontHtml = frontHtml.replace(reg, v);
      if (backHtml) {
        backHtml = backHtml.replace(reg, v);
      }
    });

    return { frontHtml, backHtml, css };
  };

  const cardCompiled = compileCard();
  const cardWidth = template ? `${template.dimension_width * 3.7795}px` : '240px';
  const cardHeight = template ? `${template.dimension_height * 3.7795}px` : '380px';

  const handleDownloadJpeg = async () => {
    setIsExporting(true);
    toast.loading('Exporting High-Res ID Card JPEG...', { id: 'card-export' });
    try {
      if (cardFrontRef.current) {
        await exportElementAsJpeg(cardFrontRef.current, `Teacher_ID_${teacher?.name || 'faculty'}_Front`);
      }
      if (cardBackRef.current && (cardSideView === 'both' || cardSideView === 'back')) {
        await exportElementAsJpeg(cardBackRef.current, `Teacher_ID_${teacher?.name || 'faculty'}_Back`);
      }
      toast.success('Teacher ID Card JPEG downloaded successfully!', { id: 'card-export' });
    } catch {
      toast.error('Failed to export JPEG.', { id: 'card-export' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    toast.loading('Generating Official ID Card PDF...', { id: 'card-export' });
    try {
      const target = cardFrontRef.current || cardBackRef.current;
      if (target) {
        await exportElementAsPdf(target, `Teacher_ID_${teacher?.name || 'faculty'}`, {
          widthMm: template?.dimension_width || 54,
          heightMm: template?.dimension_height || 86,
        });
        toast.success('Official Teacher ID Card PDF downloaded!', { id: 'card-export' });
      }
    } catch {
      toast.error('Failed to export PDF.', { id: 'card-export' });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-12 animate-fade-up">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/70 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FiCreditCard /> Faculty Identity &amp; Campus Pass
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Teacher Identity Card</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-1">
            Official institutional faculty identity credential for campus authentication, department access, and academic identification.
          </p>
        </div>

        {teacher && (
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
              <FiPrinter className="text-xs" /> Print Card
            </button>
          </div>
        )}
      </div>

      {/* Faculty Summary Card */}
      {teacher && (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100/70 text-indigo-700 rounded-2xl flex items-center justify-center font-bold text-lg border border-indigo-200/60 shrink-0 overflow-hidden">
              {teacher.photo_url ? (
                <img src={teacher.photo_url} alt={teacher.name} className="w-full h-full object-cover" />
              ) : teacher.name ? (
                teacher.name.charAt(0).toUpperCase()
              ) : (
                <FiUser />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">{teacher.name}</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                <span>Employee ID: <strong className="text-slate-800 font-mono">{cardNumber}</strong></span>
                <span>&bull;</span>
                <span>Designation: <strong className="text-slate-800">{teacher.designation_title || 'Faculty Member'}</strong></span>
                <span>&bull;</span>
                <span>Department: <strong className="text-slate-800">{teacher.department_name || 'General'}</strong></span>
              </div>
            </div>
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-xs font-bold">
              <FiCheckCircle className="text-emerald-600 text-sm" /> Faculty ID Active
            </span>
          </div>
        </div>
      )}

      {/* ID Card Display */}
      {teacher && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Visual Card Canvas Preview */}
          <div className="lg:col-span-7 bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center shadow-xs space-y-4">
            <div className="flex items-center justify-between w-full border-b border-slate-100 pb-3">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <FiLayers className="text-indigo-600" />
                {template?.name || 'Institutional Teacher ID Card'}
              </span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setCardSideView('both')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    cardSideView === 'both' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
                  }`}
                >
                  Both
                </button>
                <button
                  type="button"
                  onClick={() => setCardSideView('front')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    cardSideView === 'front' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
                  }`}
                >
                  Front
                </button>
                <button
                  type="button"
                  onClick={() => setCardSideView('back')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    cardSideView === 'back' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
                  }`}
                >
                  Back
                </button>
              </div>
            </div>

            {/* Template CSS */}
            {cardCompiled && (
              <style dangerouslySetInnerHTML={{ __html: cardCompiled.css }} />
            )}

            <div className="flex flex-wrap items-center justify-center gap-4 p-4 bg-slate-50 rounded-2xl w-full overflow-x-auto">
              {/* FRONT SIDE */}
              {(cardSideView === 'both' || cardSideView === 'front') && (
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Front</span>
                  <div
                    ref={cardFrontRef}
                    className="rounded overflow-hidden shadow-md bg-white border border-slate-200"
                    style={{ width: cardWidth, height: cardHeight }}
                  >
                    {cardCompiled ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: cardCompiled.frontHtml }}
                        style={{ width: '100%', height: '100%' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-4 text-center text-xs text-slate-400">
                        Default Teacher ID Layout
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* BACK SIDE */}
              {(cardSideView === 'both' || cardSideView === 'back') && cardCompiled?.backHtml && (
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Back</span>
                  <div
                    ref={cardBackRef}
                    className="rounded overflow-hidden shadow-md bg-white border border-slate-200"
                    style={{ width: cardWidth, height: cardHeight }}
                  >
                    <div
                      dangerouslySetInnerHTML={{ __html: cardCompiled.backHtml }}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Credentials Table */}
          <div className="lg:col-span-5 bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Faculty Credential Parameters</h3>
              <p className="text-xs text-slate-400 font-medium">Verified institution faculty identification record</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-400 w-36">Faculty Serial No</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{cardNumber}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-400">Teacher Name</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{teacher.name}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-400">Designation</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{teacher.designation_title || 'Faculty Member'}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-400">Department</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{teacher.department_name || 'General'}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-400">Phone</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{teacher.number || '—'}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-400">Blood Group</td>
                    <td className="py-2.5 px-3 font-bold text-rose-600">{teacher.blood_group || 'Not Specified'}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-400">Issue Date</td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">{issueDateFormatted}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-400">Expiration Date</td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">{expiryDateFormatted}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-400">Status</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <FiCheckCircle className="text-[10px]" /> Verified &amp; Active
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
