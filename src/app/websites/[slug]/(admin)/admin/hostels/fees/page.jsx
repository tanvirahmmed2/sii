'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiDollarSign, FiPlus, FiTrash2, FiSearch, FiCheck, FiCalendar, FiCheckCircle, FiEdit3 } from 'react-icons/fi';

const AdminHostelFeesPage = () => {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchRegNo, setSearchRegNo] = useState('');
  const [searchingStudent, setSearchingStudent] = useState(false);
  const [foundStudent, setFoundStudent] = useState(null);

  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 7 days from now
  const [status, setStatus] = useState('Unpaid');
  const [paidAmount, setPaidAmount] = useState('0');
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFees();
  }, []);

  const fetchFees = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/hostel-fees');
      setFees(response.data.paylod.fees || []);
    } catch (error) {
      toast.error('Failed to load hostel fees.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchStudent = async () => {
    if (!searchRegNo.trim()) {
      toast.error('Enter a registration number.');
      return;
    }

    setSearchingStudent(true);
    setFoundStudent(null);
    try {
      const response = await axios.get(`/api/students?registration_number=${searchRegNo.trim()}`);
      const students = response.data.paylod.students || [];
      if (students.length === 0) {
        toast.error('No student found with this registration number.');
      } else {
        const match = students.find(
          s => s.registration_number.toLowerCase() === searchRegNo.trim().toLowerCase()
        ) || students[0];

        setFoundStudent(match);
        toast.success(`Verified: ${match.name}`);
      }
    } catch (error) {
      toast.error('Failed to search student record.');
    } finally {
      setSearchingStudent(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!foundStudent && !editId) {
      toast.error('Verify and select a student first.');
      return;
    }
    if (!amount || !dueDate) {
      toast.error('Amount and due date are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        amount: parseFloat(amount),
        due_date: dueDate,
        status: status,
        paid_amount: parseFloat(paidAmount) || 0.00
      };

      if (editId) {
        const response = await axios.put(`/api/hostel-fees/${editId}`, payload);
        toast.success(response.data.message || 'Fee invoice details updated successfully!');
        setEditId(null);
      } else {
        payload.student_id = foundStudent.id;
        const response = await axios.post('/api/hostel-fees', payload);
        toast.success(response.data.message || 'Hostel fee invoiced successfully!');
      }

      clearForm();
      fetchFees();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const clearForm = () => {
    setAmount('');
    setDueDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setStatus('Unpaid');
    setPaidAmount('0');
    setFoundStudent(null);
    setSearchRegNo('');
    setEditId(null);
  };

  const handleEditClick = (fee) => {
    setEditId(fee.id);
    setFoundStudent({
      id: fee.student_id,
      name: fee.student_name,
      registration_number: fee.student_reg_number
    });
    setAmount(fee.amount.toString());
    setDueDate(new Date(fee.due_date).toISOString().split('T')[0]);
    setStatus(fee.status);
    setPaidAmount(fee.paid_amount.toString());
  };

  const handleMarkAsPaid = async (fee) => {
    const confirm = window.confirm(`Mark invoice of ${fee.student_name} for ৳${fee.amount} as Paid?`);
    if (!confirm) return;

    try {
      const response = await axios.put(`/api/hostel-fees/${fee.id}`, {
        amount: fee.amount,
        due_date: fee.due_date,
        status: 'Paid',
        paid_amount: fee.amount
      });
      toast.success(response.data.message || 'Marked as paid.');
      fetchFees();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const handleDeleteFee = async (id, studentName) => {
    const confirm = window.confirm(`Permanently delete fee invoice for "${studentName}"?`);
    if (!confirm) return;

    try {
      const response = await axios.delete(`/api/hostel-fees/${id}`);
      toast.success(response.data.message || 'Fee invoice deleted.');
      setFees(prev => prev.filter(f => f.id !== id));
      if (editId === id) {
        clearForm();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FiDollarSign className="text-tertiary" /> Hostel Fees Invoicing
        </h1>
        <p className="text-sm text-slate-500">
          Issue monthly hostel bills, log payment transactions, and track outstanding ledger balances.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1 bg-secondary border border-slate-100 rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.01)] flex flex-col gap-5">
          <div>
            <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
              <FiPlus className="text-tertiary" />
              {editId ? 'Modify Fee Invoice' : 'Invoice Hostel Fee'}
            </h2>
            <p className="text-[11px] text-slate-400">
              {editId ? 'Modify amounts or set paid status.' : 'Search for a student to assign a new fee invoice.'}
            </p>
          </div>
          {!editId && (
            <div className="flex flex-col gap-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Student Registration No.
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchRegNo}
                  onChange={(e) => setSearchRegNo(e.target.value)}
                  className="w-full px-3.5 py-2 bg-secondary border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:border-rose-500"
                />
                <button
                  type="button"
                  onClick={handleSearchStudent}
                  disabled={searchingStudent}
                  className="p-2.5 bg-tertiary hover:bg-tertiary-dark text-secondary rounded-xl transition-colors cursor-pointer"
                  title="Search Student"
                >
                  {searchingStudent ? (
                    <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <FiSearch />
                  )}
                </button>
              </div>

              {foundStudent && (
                <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200/60 rounded-xl flex items-center justify-between animate-fade-in">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-primary">{foundStudent.name}</span>
                    <span className="text-[10px] text-primary font-semibold">{foundStudent.registration_number}</span>
                  </div>
                  <FiCheck className="text-primary font-bold" />
                </div>
              )}
            </div>
          )}

          {editId && foundStudent && (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider mb-1">Editing Invoice For:</span>
              <span className="text-xs font-bold text-slate-700 block">{foundStudent.name}</span>
              <span className="text-[10px] text-slate-500 font-bold">{foundStudent.registration_number}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-0.5">
                <FiDollarSign /> Amount Due (BDT)
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={submitting}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-secondary focus:border-rose-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-0.5">
                <FiDollarSign /> Amount Paid (BDT)
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                disabled={submitting}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-secondary focus:border-rose-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-0.5">
                <FiCalendar /> Due Date
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={submitting}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-850 outline-none focus:bg-secondary focus:border-rose-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Payment Status
              </label>
              <select
                required
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={submitting}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-secondary focus:border-rose-500"
              >
                <option value="Unpaid">Unpaid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            <div className="flex items-center gap-3 mt-2">
              {editId && (
                <button
                  type="button"
                  onClick={clearForm}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={submitting || (!foundStudent && !editId)}
                className={`py-2.5 rounded-xl text-xs font-bold text-secondary transition-all shadow-sm cursor-pointer ${
                  editId ? 'bg-tertiary hover:bg-tertiary-dark w-1/2' : 'bg-tertiary hover:bg-tertiary-dark w-full '
                } disabled:opacity-50 disabled:bg-slate-300 disabled:cursor-not-allowed`}
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto"></div>
                ) : editId ? (
                  'Update Invoice'
                ) : (
                  'Issue Invoice'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Invoices registry */}
        <div className="lg:col-span-2 bg-secondary border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800">
              Hostel Bills Ledger ({fees.length})
            </h2>
          </div>

          {loading ? (
            <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-tertiary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-semibold text-slate-400">Loading ledger data...</span>
            </div>
          ) : fees.length === 0 ? (
            <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
              <span className="text-slate-350 text-5xl mb-3">💵</span>
              <h3 className="text-sm font-bold text-slate-655">No Invoices Registered</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
                Search students and assign them fees to print invoices here.
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Student Details</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Amount Due</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Amount Paid</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fees.map((fee) => (
                    <tr key={fee.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">
                        <div className="flex flex-col">
                          <span>{fee.student_name}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{fee.student_reg_number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-800">
                        ৳{parseFloat(fee.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-slate-600">
                        ৳{parseFloat(fee.paid_amount || 0).toFixed(2)}
                        {fee.payment_date && (
                          <span className="block text-[9px] text-slate-400 font-semibold">
                            Paid: {new Date(fee.payment_date).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-slate-550">
                        {new Date(fee.due_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-lg ${
                          fee.status === 'Paid'
                            ? 'bg-emerald-50 text-primary'
                            : fee.status === 'Partially Paid'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-red-50 text-red-600'
                        }`}>
                          {fee.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right flex justify-end gap-2">
                        {fee.status !== 'Paid' && (
                          <button
                            onClick={() => handleMarkAsPaid(fee)}
                            className="p-2 bg-emerald-50 hover:bg-emerald-50 text-primary rounded-xl transition-colors cursor-pointer"
                            title="Mark as Paid"
                          >
                            <FiCheckCircle className="text-sm" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEditClick(fee)}
                          className="p-2 bg-emerald-50 hover:bg-emerald-50 text-primary rounded-xl transition-colors cursor-pointer"
                          title="Edit Invoice"
                        >
                          <FiEdit3 className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleDeleteFee(fee.id, fee.student_name)}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors cursor-pointer"
                          title="Delete Invoice"
                        >
                          <FiTrash2 className="text-sm" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminHostelFeesPage;
