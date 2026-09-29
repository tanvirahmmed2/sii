'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiDollarSign, FiDownload, FiPlus, FiTrash2, FiSettings, FiGrid, FiEdit3 } from 'react-icons/fi';

const AdminStaffSalaryPage = () => {
  const [activeTab, setActiveTab] = useState('payroll'); // 'payroll' or 'grades'
  const [salaries, setSalaries] = useState([]);
  const [payScales, setPayScales] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states for creating/editing a pay scale
  const [editingScale, setEditingScale] = useState(null);
  const [gradeName, setGradeName] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [allowance, setAllowance] = useState('');
  const [submittingGrade, setSubmittingGrade] = useState(false);

  const fetchSalaries = async () => {
    try {
      const response = await axios.get('/api/salaries?type=staff');
      setSalaries(response.data.paylod.salaries || []);
    } catch (error) {
      toast.error(error.response?.data?.error || error.message);
    }
  };

  const fetchPayScales = async () => {
    try {
      const response = await axios.get('/api/staff-pay-scales');
      setPayScales(response.data.paylod?.payScales || []);
    } catch (error) {
      toast.error('Failed to load staff pay scale grades.');
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchSalaries(), fetchPayScales()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleCreatePayScale = async (e) => {
    e.preventDefault();
    if (!gradeName || basicSalary === '' || allowance === '') {
      toast.error('All grade fields are required.');
      return;
    }

    setSubmittingGrade(true);
    try {
      if (editingScale) {
        const response = await axios.put(`/api/staff-pay-scales/${editingScale.id}`, {
          name: gradeName.trim(),
          basic_salary: parseFloat(basicSalary),
          allowance: parseFloat(allowance)
        });
        toast.success(response.data.message || 'Staff pay scale grade updated successfully!');
        setEditingScale(null);
      } else {
        const response = await axios.post('/api/staff-pay-scales', {
          name: gradeName.trim(),
          basic_salary: parseFloat(basicSalary),
          allowance: parseFloat(allowance)
        });
        toast.success(response.data.message || 'Staff pay scale grade created successfully!');
      }

      setGradeName('');
      setBasicSalary('');
      setAllowance('');
      fetchPayScales();
    } catch (error) {
      toast.error(error.response?.data?.error || error.message);
    } finally {
      setSubmittingGrade(false);
    }
  };

  const handleEditClick = (scale) => {
    setEditingScale(scale);
    setGradeName(scale.name);
    setBasicSalary(scale.basic_salary.toString());
    setAllowance(scale.allowance.toString());
  };

  const handleCancelEdit = () => {
    setEditingScale(null);
    setGradeName('');
    setBasicSalary('');
    setAllowance('');
  };

  const handleDeletePayScale = async (id, name) => {
    const confirm = window.confirm(`Are you sure you want to delete staff pay grade "${name}"? Staff members assigned to it will be set to Unassigned.`);
    if (!confirm) return;

    try {
      await axios.delete(`/api/staff-pay-scales/${id}`);
      toast.success('Staff pay grade deleted successfully.');
      if (editingScale && editingScale.id === id) {
        handleCancelEdit();
      }
      setPayScales(payScales.filter((scale) => scale.id !== id));
    } catch (error) {
      toast.error(error.response?.data?.error || error.message);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-up">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FiDollarSign className="text-primary" /> Staff Payroll & Salaries (BDT)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track salary pay slips, manage grade-wise staff salary scales, and set allowances.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200/80 gap-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('payroll')}
          className={`pb-2.5 px-2 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'payroll'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FiGrid className="text-xs" /> Salary Ledgers
        </button>
        <button
          onClick={() => setActiveTab('grades')}
          className={`pb-2.5 px-2 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'grades'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FiSettings className="text-xs" /> Staff Pay Grade Scales
        </button>
      </div>

      {activeTab === 'payroll' ? (
        /* Salary List Registry Table */
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Staff Payroll Ledger (Current Month)
            </h2>
          </div>

          {loading ? (
            <div className="w-full py-16 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-medium text-slate-400">Loading payroll...</span>
            </div>
          ) : salaries.length === 0 ? (
            <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
              <FiDollarSign className="text-slate-300 text-3xl mb-2" />
              <p className="text-xs font-semibold text-slate-600">No Salaries Registered</p>
              <p className="text-[11px] text-slate-400 mt-0.5">No staff payroll records generated yet.</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3">Staff Member</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3">Basic Salary</th>
                    <th className="px-4 py-3">Allowance</th>
                    <th className="px-4 py-3">Deductions</th>
                    <th className="px-4 py-3">Net Paid</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Slip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {salaries.map((salary) => (
                    <tr key={salary.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-800">{salary.staff_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 capitalize">{salary.staff_role}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{salary.month}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">৳{parseFloat(salary.basic).toLocaleString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">৳{parseFloat(salary.allowance).toLocaleString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">৳{parseFloat(salary.deductions).toLocaleString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-900">
                        ৳{(parseFloat(salary.basic) + parseFloat(salary.allowance) - parseFloat(salary.deductions)).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          salary.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {salary.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <button className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center">
                          <FiDownload className="text-xs" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Pay Scales Management View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: Grades List Table */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Staff Salary Grade Scales ({payScales.length})
              </h2>
            </div>

            {loading ? (
              <div className="w-full py-16 flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-medium text-slate-400">Loading scales...</span>
              </div>
            ) : payScales.length === 0 ? (
              <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
                <FiDollarSign className="text-slate-300 text-3xl mb-2" />
                <p className="text-xs font-semibold text-slate-600">No Pay Grades Configured</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Use the registration form on the right to define salary grade boundaries.
                </p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="px-4 py-3">Grade Name</th>
                      <th className="px-4 py-3">Basic Salary</th>
                      <th className="px-4 py-3">Allowance</th>
                      <th className="px-4 py-3">Total Salary</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {payScales.map((scale) => (
                      <tr key={scale.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-800">{scale.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">৳{parseFloat(scale.basic_salary).toLocaleString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">৳{parseFloat(scale.allowance).toLocaleString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-900">
                          ৳{(parseFloat(scale.basic_salary) + parseFloat(scale.allowance)).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEditClick(scale)}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                              title="Edit Pay Grade"
                            >
                              <FiEdit3 className="text-xs" />
                            </button>
                            <button
                              onClick={() => handleDeletePayScale(scale.id, scale.name)}
                              className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Delete Pay Grade"
                            >
                              <FiTrash2 className="text-xs" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right panel: Create/Edit Grade Form */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs h-fit flex flex-col gap-4">
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FiPlus className="text-primary" /> {editingScale ? 'Update Salary Grade' : 'Create Salary Grade'}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Define basic salaries and default allowances for staff employee grades.
              </p>
            </div>

            <form onSubmit={handleCreatePayScale} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Grade Name *
                </label>
                <input
                  type="text"
                  required
                  value={gradeName}
                  onChange={(e) => setGradeName(e.target.value)}
                  disabled={submittingGrade}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-primary transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Basic Salary (BDT) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={basicSalary}
                  onChange={(e) => setBasicSalary(e.target.value)}
                  disabled={submittingGrade}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-primary transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Allowance (BDT) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={allowance}
                  onChange={(e) => setAllowance(e.target.value)}
                  disabled={submittingGrade}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-primary transition-all"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                {editingScale && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={submittingGrade}
                    className="w-1/2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submittingGrade}
                  className={`py-2 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-60 shadow-2xs ${editingScale ? 'w-1/2' : 'w-full'}`}
                >
                  {submittingGrade ? 'Saving...' : editingScale ? 'Save Changes' : 'Register Pay Grade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStaffSalaryPage;
