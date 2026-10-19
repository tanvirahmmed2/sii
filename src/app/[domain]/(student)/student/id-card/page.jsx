'use client';

import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import TenantLoader from 'src/component/tenant/TenantLoader';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { exportElementAsJpeg, exportElementAsPdf } from 'src/lib/export/documentExporter';
import { 
  FiCreditCard, FiPrinter, FiLock, FiCheckCircle, 
  FiUser, FiClock, FiDownload, FiLayers 
} from 'react-icons/fi';
import { printStudentIDCard } from 'src/lib/receipts/student_id_card';

export default function StudentIDCardPage() {
  const { website, getApiEndpoint } = useTenantWebsite();
  const [student, setStudent] = useState(null);
  const [idCard, setIdCard] = useState(null);
  const [template, setTemplate] = useState(null);
  const [isProvided, setIsProvided] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [cardSideView, setCardSideView] = useState('both'); // 'both' | 'front' | 'back'

  const cardFrontRef = useRef(null);
  const cardBackRef = useRef(null);

  useEffect(() => {
    const fetchIDCard = async () => {
      try {
        const res = await fetch(getApiEndpoint('student/id-card'));
        if (res.ok) {
          const data = await res.json();
          const payload = data.payload || data.paylod || data || {};
          const cardData = payload.idCard || payload.card || data.card || null;
          const studentData = payload.student || data.student || null;
          const tpl = payload.template || data.template || null;

          setStudent(studentData);
          setIdCard(cardData);
          setTemplate(tpl);
          setIsProvided(Boolean(cardData));
        }
      } catch (error) {
        console.error('Error fetching ID card:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIDCard();
  }, [getApiEndpoint]);

  if (loading) {
    return <TenantLoader fullScreen={false} />;
  }

  const cardNumber = idCard?.id_card_no || idCard?.card_number || `ID-${student?.registration_number || student?.id || 'STUDENT'}`;
  const issueDateFormatted = idCard?.issue_date ? new Date(idCard.issue_date).toLocaleDateString('en-GB') : 'Active Session';
  const expiryDateFormatted = idCard?.expiry_date ? new Date(idCard.expiry_date).toLocaleDateString('en-GB') : '31/12/2027';

  // Compile card HTML using active template
  const compileCard = () => {
    if (!template) return null;
    let frontHtml = template.custom_html || template.html_content || '';
    let backHtml = template.custom_html_back || template.html_back_content || '';
    let css = (template.custom_css || template.css_content || '') + ' svg { width: 100% !important; height: 100% !important; max-width: 100% !important; max-height: 100% !important; display: block; }';

    if (!backHtml || !backHtml.trim()) {
      backHtml = `
        <div style="width: 100%; height: 100%; box-sizing: border-box; background: #0f172a; color: #f8fafc; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center;">
          <div style="background: #1e293b; padding: 5px 10px; border-radius: 6px; font-size: 8.5px; font-weight: 700; color: #38bdf8; letter-spacing: 0.8px;">
            OFFICIAL STUDENT PASS TERMS
          </div>
          <div style="font-size: 8.5px; color: #94a3b8; line-height: 1.5; text-align: left; padding: 0 4px;">
            <p style="margin: 0 0 3px;">• This card certifies enrollment at {{school_name}}.</p>
            <p style="margin: 0 0 3px;">• Non-transferable; must be presented upon campus authority request.</p>
            <p style="margin: 0;">• Report loss immediately to the Registrar's Office.</p>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center; gap: 3px;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=50x50&data={{registration_no}}" alt="QR" style="width: 46px; height: 46px; background: white; padding: 2px; border-radius: 4px;" />
            <span style="font-family: monospace; font-size: 8px; color: #38bdf8;">{{registration_no}}</span>
          </div>
          <div style="font-size: 7.5px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 4px;">
            Property of {{school_name}} • Hotline: {{emergency_contact}}
          </div>
        </div>
      `;
    }

    const replacements = {
      '{{student_name}}': student?.name || 'Student Name',
      '{{registration_no}}': student?.registration_number || student?.registration_no || student?.student_unique_id || 'REG-0001',
      '{{roll_no}}': student?.roll || student?.roll_no || '01',
      '{{student_unique_id}}': student?.student_unique_id || student?.registration_number || 'STU-0001',
      '{{class_name}}': student?.class_name || 'Class',
      '{{section_name}}': student?.section_name || 'Sec A',
      '{{session_name}}': student?.session_name || '2026-2027',
      '{{blood_group}}': student?.blood_group || 'O+',
      '{{student_photo}}': student?.photo_url || student?.image || '/default-avatar.png',
      '{{card_number}}': cardNumber,
      '{{issue_date}}': issueDateFormatted,
      '{{valid_upto}}': expiryDateFormatted,
      '{{expiry_date}}': expiryDateFormatted,
      '{{emergency_contact}}': student?.emergency_phone || student?.number || website?.phone || '+880 1700-000000',
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
  const isLandscape = template ? parseFloat(template.dimension_width || 54) >= parseFloat(template.dimension_height || 86) : false;
  const cardWidth = isLandscape ? '380px' : '240px';
  const cardHeight = isLandscape ? '240px' : '380px';

  const handleDownloadJpeg = async () => {
    setIsExporting(true);
    toast.loading('Exporting High-Res ID Card JPEG...', { id: 'card-export' });
    try {
      if (cardFrontRef.current) {
        await exportElementAsJpeg(cardFrontRef.current, `Student_ID_${student?.registration_number || 'card'}_Front`);
      }
      if (cardBackRef.current && (cardSideView === 'both' || cardSideView === 'back')) {
        await exportElementAsJpeg(cardBackRef.current, `Student_ID_${student?.registration_number || 'card'}_Back`);
      }
      toast.success('ID Card JPEG downloaded successfully!', { id: 'card-export' });
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
        await exportElementAsPdf(target, `Student_ID_${student?.registration_number || 'card'}`, {
          widthMm: template?.dimension_width || 54,
          heightMm: template?.dimension_height || 86,
        });
        toast.success('Official ID Card PDF downloaded!', { id: 'card-export' });
      }
    } catch {
      toast.error('Failed to export PDF.', { id: 'card-export' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-12 animate-fade-up">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/70 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FiCreditCard /> Student Identity &amp; Campus Pass
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Student Identity Card</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-1">
            Official institutional identity card for student authentication, library borrowing, and campus security access.
          </p>
        </div>

        {isProvided && student && (
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
              onClick={() => printStudentIDCard({
                id_card_no: cardNumber,
                student: student,
                expiry_date: expiryDateFormatted,
              })}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <FiPrinter className="text-xs" /> Print Card
            </button>
          </div>
        )}
      </div>

      {/* Candidate Profile Summary */}
      {student && (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100/70 text-indigo-700 rounded-2xl flex items-center justify-center font-bold text-lg border border-indigo-200/60 shrink-0">
              {student.name ? student.name.charAt(0).toUpperCase() : <FiUser />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">{student.name}</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                <span>Reg No: <strong className="text-slate-800 font-mono">{student.registration_number || student.registration_no}</strong></span>
                <span>&bull;</span>
                <span>Class: <strong className="text-slate-800">{student.class_name} {student.section_name ? `(${student.section_name})` : ''}</strong></span>
                <span>&bull;</span>
                <span>Roll: <strong className="text-slate-800">{student.roll || student.roll_no || 'N/A'}</strong></span>
              </div>
            </div>
          </div>

          <div>
            {isProvided ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-xs font-bold">
                <FiCheckCircle className="text-emerald-600 text-sm" /> ID Card Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-full text-xs font-bold">
                <FiClock className="text-amber-600 text-sm" /> Inactive
              </span>
            )}
          </div>
        </div>
      )}

      {/* ID Card Display */}
      {isProvided && student ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Visual Card Canvas Preview */}
          <div className="lg:col-span-7 bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center shadow-xs space-y-4">
            <div className="flex items-center justify-between w-full border-b border-slate-100 pb-3">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <FiLayers className="text-indigo-600" />
                {template?.name || 'Institutional Identity Card'}
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
                        Default ID Card Layout
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

          {/* Identity Credentials Specification Table */}
          <div className="lg:col-span-5 bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Identity Record Specifications</h3>
              <p className="text-xs text-slate-400 font-medium">Certified institutional registration parameters</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-400 w-36">Serial Number</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{cardNumber}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-400">Student Name</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{student.name}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-400">Reg Number</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{student.registration_number || student.registration_no}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-400">Class &amp; Section</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{student.class_name} {student.section_name ? `(${student.section_name})` : ''}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-400">Roll Number</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{student.roll || student.roll_no || 'N/A'}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-400">Blood Group</td>
                    <td className="py-2.5 px-3 font-bold text-rose-600">{student.blood_group || 'Not Specified'}</td>
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
                    <td className="py-2.5 px-3 font-semibold text-slate-400">Card Status</td>
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
      ) : (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-xs space-y-3">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400">
            <FiLock className="text-3xl text-slate-400" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">Student ID Card Not Issued Yet</h3>
          <p className="text-slate-400 text-xs max-w-sm">
            Your official student identity card has not been registered by the administration office yet. Please verify your admission profile with the registrar.
          </p>
        </div>
      )}
    </div>
  );
}
