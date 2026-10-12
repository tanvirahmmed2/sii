'use client';

import React, { useEffect, useState } from 'react';
import { FiCreditCard, FiPrinter, FiLock, FiCheckCircle, FiUser, FiClock, FiCalendar, FiShield, FiHash } from 'react-icons/fi';
import { printStudentIDCard } from 'src/lib/receipts/student_id_card';

const StudentIDCardPage = () => {
  const [student, setStudent] = useState(null);
  const [idCard, setIdCard] = useState(null);
  const [isProvided, setIsProvided] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIDCard = async () => {
      try {
        const res = await fetch('/api/student/id-card');
        if (res.ok) {
          const data = await res.json();
          const payload = data.payload || data.paylod || data || {};
          const cardData = payload.idCard || payload.card || data.card || null;
          const studentData = payload.student || data.student || null;

          setStudent(studentData);
          setIdCard(cardData);
          setIsProvided(Boolean(cardData));
        }
      } catch (error) {
        console.error('Error fetching ID card:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIDCard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400">Loading student ID card...</p>
      </div>
    );
  }

  const cardNumber = idCard?.id_card_no || idCard?.card_number || `ID-${student?.registration_number || student?.id || 'STUDENT'}`;
  const issueDateFormatted = idCard?.issue_date ? new Date(idCard.issue_date).toLocaleDateString('en-GB') : 'Active Session';
  const expiryDateFormatted = idCard?.expiry_date ? new Date(idCard.expiry_date).toLocaleDateString('en-GB') : '31/12/2026';

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
          <button
            onClick={() => printStudentIDCard({
              id_card_no: cardNumber,
              student: student,
              expiry_date: expiryDateFormatted
            })}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
          >
            <FiPrinter className="text-sm" /> Print Official ID Card
          </button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Visual Card Preview */}
          <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center shadow-xs">
            <div className="w-[300px] h-[450px] bg-white border-2 border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between relative overflow-hidden">
              <div className="bg-slate-900 text-white p-3 text-center rounded-xl">
                <p className="text-xs font-bold uppercase tracking-wider">Institutional Student ID</p>
                <p className="text-[9px] text-indigo-400 uppercase font-semibold">Official Campus Pass</p>
              </div>

              <div className="flex flex-col items-center space-y-2 my-4">
                <div className="w-20 h-20 rounded-full border-2 border-indigo-600 bg-indigo-50 flex items-center justify-center font-bold text-2xl text-indigo-700 overflow-hidden">
                  {student.photo_url || student.image ? (
                    <img src={student.photo_url || student.image} alt={student.name} className="w-full h-full object-cover" />
                  ) : (
                    student.name ? student.name.charAt(0).toUpperCase() : 'S'
                  )}
                </div>
                <h3 className="font-bold text-slate-900 text-center text-sm">{student.name}</h3>
                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  {student.class_name} {student.section_name ? `(${student.section_name})` : ''}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-700 border-t border-slate-100 pt-3">
                <div className="flex justify-between"><span className="text-slate-400">Roll:</span> <span className="font-bold">{student.roll || student.roll_no || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Reg No:</span> <span className="font-bold font-mono">{student.registration_number || student.registration_no}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Blood Group:</span> <span className="font-bold text-rose-600">{student.blood_group || 'N/A'}</span></div>
              </div>

              <div className="text-[9px] text-slate-400 border-t border-slate-100 pt-2 flex justify-between">
                <span>Card: {cardNumber}</span>
                <span>Valid: {expiryDateFormatted}</span>
              </div>
            </div>
          </div>

          {/* Identity Credentials Specification Table */}
          <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Identity Record Specifications</h3>
              <p className="text-xs text-slate-400 font-medium">Certified institutional registration parameters</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-400 w-40">Card Serial Number</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{cardNumber}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-400">Student Name</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{student.name}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-400">Registration Number</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{student.registration_number || student.registration_no}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-400">Class &amp; Section</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{student.class_name} {student.section_name ? `(Section ${student.section_name})` : ''}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-400">Class Roll Number</td>
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
                    <td className="py-2.5 px-3 font-semibold text-slate-400">Emergency Phone</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{student.emergency_phone || student.phone || 'Campus Administration'}</td>
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
};

export default StudentIDCardPage;
