'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  FiDollarSign, FiDownload, FiPlus, FiTrash2, FiSettings, FiGrid,
  FiEdit3, FiUsers, FiRefreshCw, FiCheckCircle
} from 'react-icons/fi';

const AdminSalaryPage = () => {
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
      const response = await axios.get('/api/salaries?type=teacher');
      setSalaries(response.data.paylod?.salaries || []);
    } catch (error) {
      toast.error(error.response?.data?.error || error.message);
    }
  };

  const fetchPayScales = async () => {
    try {
      const response = await axios.get('/api/teacher-pay-scales');
      setPayScales(response.data.paylod?.payScales || []);
    } catch (error) {
      toast.error('Failed to load teacher pay scale grades.');
    }
  };

  const initData = async () => {
    setLoading(true);
    await Promise.all([fetchSalaries(), fetchPayScales()]);
    setLoading(false);
  };

  useEffect(() => {
    initData();
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
        const response = await axios.put(`/api/teacher-pay-scales/${editingScale.id}`, {
          name: gradeName.trim(),
          basic_salary: parseFloat(basicSalary),
          allowance: parseFloat(allowance)
        });
        toast.success(response.data.message || 'Pay scale grade updated successfully!');
        setEditingScale(null);
      } else {
        const response = await axios.post('/api/teacher-pay-scales', {
          name: gradeName.trim(),
          basic_salary: parseFloat(basicSalary),
          allowance: parseFloat(allowance)
        });
        toast.success(response.data.message || 'Pay scale grade created successfully!');
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
    const confirm = window.confirm(`Are you sure you want to delete pay grade "${name}"? Teachers assigned to it will be set to Unassigned.`);
    if (!confirm) return;

    try {
      await axios.delete(`/api/teacher-pay-scales/${id}`);
      toast.success('Pay grade deleted successfully.');
      if (editingScale && editingScale.id === id) {
        handleCancelEdit();
      }
      setPayScales(payScales.filter((scale) => scale.id !== id));
    } catch (error) {
      toast.error(error.response?.data?.error || error.message);
    }
  };

  const paidCount = salaries.filter((s) => s.status === 'Paid').length;
  const pendingSalaryCount = salaries.filter((s) => s.status !== 'Paid').length;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-up">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FiDollarSign className="text-primary" /> Payroll & Salary Ledgers (BDT)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track teacher salary pay slips, manage grade-wise salary scales, and set allowances.
          </p>
        </div>

        <button
          onClick={initData}
          className="flex items-center justify-center gap-2 px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
        >
          <FiRefreshCw className={`text-xs ${loading ? 'animate-spin' : ''}`} /> Refresh Ledgers
        </button>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Salary Ledgers</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-lg font-bold text-slate-800">{salaries.length}</span>
            <FiDollarSign className="text-slate-400 text-sm" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Paid Pay Slips</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-lg font-bold text-emerald-600">{paidCount}</span>
            <FiCheckCircle className="text-emerald-500 text-sm" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pending Salary</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-lg font-bold text-amber-600">{pendingSalaryCount}</span>
            <FiGrid className="text-amber-500 text-sm" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Pay Grades</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-lg font-bold text-primary">{payScales.length}</span>
            <FiSettings className="text-primary text-sm" />
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-2 flex gap-2">
        <button
          onClick={() => setActiveTab('payroll')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'payroll'
              ? 'bg-primary text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <FiGrid className="text-xs" /> Salary Ledgers
        </button>
        <button
          onClick={() => setActiveTab('grades')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'grades'
              ? 'bg-primary text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <FiSettings className="text-xs" /> Pay Grade Scales
        </button>
      </div>

      {activeTab === 'payroll' ? (
        /* Salary Registry Table Card */
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Payroll Ledger ({salaries.length})
            </h2>
          </div>

          {loading ? (
            <div className="w-full py-12 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-medium text-slate-400">Loading payroll ledgers...</span>
            </div>
          ) : salaries.length === 0 ? (
            <div className="w-full py-12 flex flex-col items-center justify-center text-center px-4">
              <FiDollarSign className="text-slate-300 text-3xl mb-2" />
              <p className="text-xs font-semibold text-slate-600">No Salary Ledgers Found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">No salary disbursements recorded for this month.</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3">Teacher</th>
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
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-800">{salary.teacher_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-medium">{salary.month}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-mono">৳{parseFloat(salary.basic).toLocaleString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-mono">৳{parseFloat(salary.allowance).toLocaleString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-mono">৳{parseFloat(salary.deductions).toLocaleString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-800 font-mono">
                        ৳{(parseFloat(salary.basic) + parseFloat(salary.allowance) - parseFloat(salary.deductions)).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          salary.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>
                          {salary.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <button className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" title="Download Pay Slip">
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
        /* Pay Scales Management Split Grid */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Pay Grades List Table */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Teacher Pay Scale Grades ({payScales.length})
              </h2>
            </div>

            {loading ? (
              <div className="w-full py-12 flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-medium text-slate-400">Loading pay scale grades...</span>
              </div>
            ) : payScales.length === 0 ? (
              <div className="w-full py-12 flex flex-col items-center justify-center text-center px-4">
                <FiSettings className="text-slate-300 text-3xl mb-2" />
                <p className="text-xs font-semibold text-slate-600">No Pay Grades Defined</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Use the form on the right to define salary grades.</p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="px-4 py-3">Grade Name</th>
                      <th className="px-4 py-3">Basic Salary</th>
                      <th className="px-4 py-3">Allowance</th>
                      <th className="px-4 py-3">Total Scale</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {payScales.map((scale) => (
                      <tr key={scale.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-800">{scale.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-mono">৳{parseFloat(scale.basic_salary).toLocaleString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-mono">৳{parseFloat(scale.allowance).toLocaleString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-800 font-mono">
                          ৳{(parseFloat(scale.basic_salary) + parseFloat(scale.allowance)).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="inline-flex gap-1 justify-end">
                            <button
                              onClick={() => handleEditClick(scale)}
                              className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                              title="Edit Pay Grade"
                            >
                              <FiEdit3 className="text-xs" />
                            </button>
                            <button
                              onClick={() => handleDeletePayScale(scale.id, scale.name)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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

          {/* Right: Create/Edit Pay Scale Form */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs h-fit space-y-4">
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <FiPlus className="text-primary" /> {editingScale ? 'Edit Pay Grade' : 'Create Pay Grade'}
              </h2>
              <p className="text-[11px] text-slate-400 mt-1">
                Define basic salaries and allowances for teacher grades.
              </p>
            </div>

            <form onSubmit={handleCreatePayScale} className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Grade Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grade 1 Senior Teacher"
                  value={gradeName}
                  onChange={(e) => setGradeName(e.target.value)}
                  disabled={submittingGrade}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-primary transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Basic Salary (BDT) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 35000"
                  value={basicSalary}
                  onChange={(e) => setBasicSalary(e.target.value)}
                  disabled={submittingGrade}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-primary transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Allowance (BDT) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 5000"
                  value={allowance}
                  onChange={(e) => setAllowance(e.target.value)}
                  disabled={submittingGrade}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-primary transition-all"
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
                  className={`py-2 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60 shadow-2xs ${editingScale ? 'w-1/2' : 'w-full'}`}
                >
                  {submittingGrade ? 'Saving...' : editingScale ? 'Save Changes' : 'Create Pay Grade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSalaryPage;
