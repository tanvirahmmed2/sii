'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiUserPlus, FiDollarSign, FiMail } from 'react-icons/fi';

const TeacherCreateForm = ({ onSuccess, onCancel }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [number, setNumber] = useState('');
  const [designation, setDesignation] = useState('');
  const [isPermanent, setIsPermanent] = useState(false);
  const [gradeId, setGradeId] = useState('');
  const [payScales, setPayScales] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [verificationSentTo, setVerificationSentTo] = useState('');

  // Load pay scales on mount
  useEffect(() => {
    const fetchPayScales = async () => {
      try {
        const response = await axios.get('/api/teacher-pay-scales');
        setPayScales(response.data.paylod?.payScales || []);
      } catch (err) {
        console.error('Failed to fetch pay grades:', err);
      }
    };
    fetchPayScales();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !number || !designation) {
      toast.error('All fields (Name, Email, Phone Number, Designation) are required.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post('/api/teachers', { 
        name: name.trim(), 
        email: email.trim(), 
        number: number.trim(), 
        designation: designation.trim(),
        is_permanent: isPermanent,
        grade_id: gradeId ? parseInt(gradeId, 10) : null
      });

      toast.success(response.data.message || 'Teacher account placeholder created successfully!');
      const createdEmail = email.trim();
      setName('');
      setEmail('');
      setNumber('');
      setDesignation('');
      setGradeId('');
      setIsPermanent(false);
      setVerificationSentTo(createdEmail);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-2xs animate-fade-up">
      <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
        <FiUserPlus className="text-primary" /> Pre-create Teacher Profile
      </h2>

      {/* Verification link sent notice */}
      {verificationSentTo && (
        <div className="mb-5 flex items-start gap-3 p-4 bg-primary-light border border-primary-light rounded-2xl">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <FiMail className="text-primary text-sm" />
          </div>
          <div>
            <p className="text-sm font-bold text-primary">Verification Link Sent!</p>
            <p className="text-xs text-primary mt-0.5 leading-relaxed">
              A secure verification link has been emailed to <strong>{verificationSentTo}</strong>. The teacher must click this link within 72 hours to complete profile setup.
            </p>
            <button
              onClick={() => { setVerificationSentTo(''); if (onSuccess) onSuccess(); }}
              className="mt-2 text-[11px] font-bold text-primary underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Full Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:bg-white focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:bg-white focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Phone Number
          </label>
          <input
            type="text"
            required
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            disabled={submitting}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:bg-white focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Designation
          </label>
          <input
            type="text"
            required
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            disabled={submitting}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:bg-white focus:border-primary"
          />
        </div>

        {/* Pay Grade Dropdown Selector */}
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <FiDollarSign className="text-slate-450" /> Assigned Pay Grade Scale (Optional)
          </label>
          <select
            value={gradeId}
            onChange={(e) => setGradeId(e.target.value)}
            disabled={submitting}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary cursor-pointer"
          >
            <option value="">Unassigned (No Pay Scale Grade)</option>
            {payScales.map((scale) => (
              <option key={scale.id} value={scale.id}>
                {scale.name} (Basic: ৳{parseFloat(scale.basic_salary).toLocaleString()} + Allow: ৳{parseFloat(scale.allowance).toLocaleString()})
              </option>
            ))}
          </select>
        </div>

        {/* Employment Type Checkbox */}
        <div className="flex items-center gap-3 md:col-span-2 py-2">
          <input
            type="checkbox"
            id="isPermanent"
            checked={isPermanent}
            onChange={(e) => setIsPermanent(e.target.checked)}
            disabled={submitting}
            className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer"
          />
          <label htmlFor="isPermanent" className="text-sm font-semibold text-slate-700 cursor-pointer">
            Permanent Position (Indicates if this teacher is a permanent staff member)
          </label>
        </div>

        <div className="flex justify-end gap-3 md:col-span-2 mt-4 pt-3 border-t border-slate-100">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors duration-150 cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-secondary rounded-xl text-sm font-semibold transition-all duration-150 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {submitting ? (
              <div className="loader loader-sm loader-white" />
            ) : (
              'Save Teacher Profile'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TeacherCreateForm;
