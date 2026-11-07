'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiUserPlus, FiMail } from 'react-icons/fi';

const StaffCreateForm = ({ onSuccess, onCancel }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [number, setNumber] = useState('');
  const [role, setRole] = useState('staff');
  const [gradeId, setGradeId] = useState('');
  const [payScales, setPayScales] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [verificationSentTo, setVerificationSentTo] = useState('');

  useEffect(() => {
    const fetchPayScales = async () => {
      try {
        const response = await axios.get('/api/staff-pay-scales');
        setPayScales(response.data.paylod?.payScales || []);
      } catch (err) {
        console.error('Failed to fetch staff pay scales');
      }
    };
    fetchPayScales();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !number || !role) {
      toast.error('Name, Email, Phone Number, and Role are required.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post('/api/admin/staff', { 
        name: name.trim(), 
        email: email.trim(), 
        number: number.trim(), 
        role,
        grade_id: gradeId || null
      });

      toast.success(response.data.message || 'Staff profile created successfully!');
      const createdEmail = email.trim();
      setName('');
      setEmail('');
      setNumber('');
      setRole('staff');
      setGradeId('');
      setVerificationSentTo(createdEmail);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 shadow-2xs animate-fade-up">
      <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wider">
        <FiUserPlus className="text-primary" /> Pre-create Staff Profile
      </h2>

      {verificationSentTo && (
        <div className="mb-4 flex items-start gap-3 p-3.5 bg-blue-50 border border-blue-100 rounded-xl">
          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
            <FiMail className="text-blue-600 text-xs" />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-800">Verification Link Sent!</p>
            <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
              A setup verification link has been emailed to <strong>{verificationSentTo}</strong>. The staff member must click this link within 72 hours to complete their profile registration.
            </p>
            <button
              onClick={() => { setVerificationSentTo(''); if (onSuccess) onSuccess(); }}
              className="mt-1 text-[10px] font-bold text-blue-800 underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Full Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-primary transition-all"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Email Address *
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-primary transition-all"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Phone Number *
          </label>
          <input
            type="tel"
            required
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-primary transition-all"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Portal Role *
          </label>
          <select
            required
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-primary transition-all cursor-pointer"
          >
            <option value="staff">General Staff</option>
            <option value="cashier">Cashier (Finance Desk)</option>
            <option value="registrar">Registrar (Admissions Desk)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Salary Pay Grade
          </label>
          <select
            value={gradeId}
            onChange={(e) => setGradeId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-primary transition-all cursor-pointer"
          >
            <option value="">Unassigned</option>
            {payScales.map((scale) => (
              <option key={scale.id} value={scale.id}>
                {scale.name} (৳{(parseFloat(scale.basic_salary) + parseFloat(scale.allowance)).toLocaleString()})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end gap-2 mt-2 sm:col-span-2 border-t border-slate-100 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-60 cursor-pointer shadow-2xs"
          >
            {submitting ? 'Creating...' : 'Register Staff Account'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StaffCreateForm;
