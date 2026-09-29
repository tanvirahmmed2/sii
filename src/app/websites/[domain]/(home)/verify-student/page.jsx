'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiCheckCircle, FiSearch, FiUser, FiLayers, FiActivity, FiXCircle } from 'react-icons/fi';

const VerifyStudentPage = () => {
  const [regNumber, setRegNumber] = useState('');
  const [student, setStudent] = useState(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!regNumber.trim()) {
      toast.error('Please enter a registration number.');
      return;
    }

    setLoading(true);
    setStudent(null);
    setSearched(false);

    try {
      const res = await fetch(`/api/verify-student?reg=${encodeURIComponent(regNumber.trim())}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setStudent(data.paylod);
      } else {
        toast.error(data.error || 'Student verification failed.');
      }
    } catch (err) {
      toast.error('An error occurred while verifying student.');
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  return (
    <div className="w-full min-h-[80vh] bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="w-full flex flex-col gap-6 animate-fade-up">
        
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-slate-900 mt-2 tracking-tight">
            Student Identity Verifier
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Input a valid student registration credentials to check verify profile name, class numeric registry, status, and profile photo.
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.02)]">
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <FiSearch /> Registration Number *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value)}
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:bg-white focus:border-primary transition-all text-slate-700"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-2xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-60 flex items-center gap-1.5 shrink-0"
                >
                  {loading ? 'Searching...' : 'Verify'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Results Block */}
        {searched && (
          <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.02)] transition-all animate-fade-in">
            {student ? (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Image Block */}
                <div className="shrink-0">
                  {student.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={student.image}
                      alt="Student Profile"
                      className="w-28 h-28 rounded-2xl object-cover border border-slate-150 shadow-md bg-slate-50"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-[10px] font-bold text-center p-2">
                      No Photo Available
                    </div>
                  )}
                </div>

                {/* Details Block */}
                <div className="flex-1 flex flex-col gap-3.5 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-light text-secondary border border-primary-light rounded-full text-[10px] font-bold">
                      <FiCheckCircle /> Verified Identity
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Student Name</p>
                      <h3 className="text-base font-semibold text-slate-800">{student.name}</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-1.5">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center sm:justify-start gap-1">
                          <FiLayers /> Class
                        </p>
                        <p className="text-xs font-bold text-slate-600 mt-0.5">{student.class_name}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center sm:justify-start gap-1">
                          <FiActivity /> Status
                        </p>
                        <p className="text-xs font-bold text-slate-650 text-sky-650 mt-0.5">{student.status}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-4 gap-3">
                <FiXCircle className="text-red-500 text-4xl animate-bounce" />
                <div>
                  <h3 className="text-sm font-bold text-slate-850">Record Verification Failed</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
                    No registered student found matching credentials <strong className="text-slate-500">"{regNumber}"</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default VerifyStudentPage;
