'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  FiDollarSign, FiInfo, FiLayers, FiCheckCircle, FiBookOpen, 
  FiAward, FiActivity, FiUsers, FiCpu 
} from 'react-icons/fi';

const PublicMonthlyFeesPage = () => {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicFees = async () => {
      try {
        const res = await fetch('/api/public/monthly-fees');
        const data = await res.json();
        if (res.ok && data.success) {
          setFees(data.paylod?.monthlyFees || []);
        } else {
          throw new Error(data.error || 'Failed to retrieve fee information.');
        }
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicFees();
  }, []);

  // Academic Levels Information
  const academicLevels = [
    {
      title: 'Primary Section (Classes 1 - 5)',
      description: 'Focuses on building core language skills, mathematical reasoning, and natural sciences. Interactive learning methods are used to foster curiosity.',
      curriculum: 'National Curriculum & English Language Foundation'
    },
    {
      title: 'Middle Section (Classes 6 - 8)',
      description: 'Introduces computer science, analytical thinking, and global history. Prepares students for advanced stream selection.',
      curriculum: 'National Curriculum & Preliminary ICT Labs'
    },
    {
      title: 'Secondary Section (Classes 9 - 10)',
      description: 'Offers structured specialization in Science, Commerce, or Humanities stream with complete laboratory practice.',
      curriculum: 'National Board Examination Syllabus'
    }
  ];

  return (
    <div className="w-full min-h-[80vh] py-12 px-4 md:px-8 mx-auto flex flex-col gap-10 animate-fade-up">
      {/* Hero Header */}
      <div className="text-center flex flex-col gap-3">
        
        <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight flex items-center justify-center gap-2">
          Academic Overview & Tuition Fees
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
          Learn about our educational curriculum, academic programs, facilities, and dynamic class-wise monthly tuition fee configurations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                🎓 Our Educational Approach
              </h2>
              <p className="text-xs text-slate-550 mt-1">
                We believe in providing structured learning that challenges students intellectually while fostering personal growth.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {academicLevels.map((level, idx) => (
                <div key={idx} className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-800">{level.title}</span>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">{level.description}</p>
                  <span className="text-[10px] text-primary font-bold uppercase tracking-wider mt-1 block">
                    Curriculum: {level.curriculum}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Institutional Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm text-center flex flex-col items-center gap-2.5">
              <div className="p-3 bg-primary-light text-primary rounded-2xl border border-primary-light">
                <FiUsers className="text-xl" />
              </div>
              <span className="text-xs font-semibold text-slate-800">Qualified Educators</span>
              <p className="text-[10px] text-slate-450 leading-relaxed font-medium">Expert subject mentors and certified counselors.</p>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm text-center flex flex-col items-center gap-2.5">
              <div className="p-3 bg-primary-light text-primary rounded-2xl border border-primary-light">
                <FiCpu className="text-xl" />
              </div>
              <span className="text-xs font-semibold text-slate-800">Smart Smart Labs</span>
              <p className="text-[10px] text-slate-450 leading-relaxed font-medium">Computer ICT hubs and advanced physics/chemistry labs.</p>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm text-center flex flex-col items-center gap-2.5">
              <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl border border-amber-100">
                <FiBookOpen className="text-xl" />
              </div>
              <span className="text-xs font-semibold text-slate-800">Rich Library</span>
              <p className="text-[10px] text-slate-450 leading-relaxed font-medium">A wide collection of textbooks, research volumes, and silent study desks.</p>
            </div>
          </div>

        </div>

        {/* Right 1/3 Panel: Tuition Fee Rates */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Tuition Rates Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
            <div>
              <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Class Monthly Fees</h3>
              <p className="text-[10px] text-slate-450 mt-1 font-semibold">Active monthly tuition rates dynamically fetched from the database.</p>
            </div>

            {loading ? (
              <div className="w-full py-8 flex flex-col items-center justify-center gap-3">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] text-slate-450 font-semibold">Fetching rates...</span>
              </div>
            ) : fees.length === 0 ? (
              <div className="py-6 text-center text-slate-400 flex flex-col items-center justify-center gap-2 border border-dashed border-slate-150 rounded-2xl">
                <FiInfo className="text-2xl text-slate-350" />
                <p className="text-[10px] font-semibold">Tuition rates are not published yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {fees.map((fee) => (
                  <div key={fee.class_name} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 font-bold text-slate-700 text-xs">
                      <FiLayers className="text-primary text-sm" />
                      {fee.class_name}
                    </div>
                    <span className="text-xs font-semibold text-slate-900">
                      {parseFloat(fee.amount) > 0 ? `৳${parseFloat(fee.amount).toFixed(2)}` : 'TBD'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Terms Guide */}
          <div className="bg-slate-950 text-white rounded-3xl p-6 shadow-md flex flex-col gap-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-sky-400">Fee Payment Terms</h4>
            <ul className="flex flex-col gap-3.5 text-xs leading-relaxed text-slate-300 font-medium">
              <li className="flex items-start gap-2.5">
                <FiCheckCircle className="text-emerald-400 mt-0.5 shrink-0" />
                <span>Monthly tuition fee invoices are auto-generated on the 1st of every calendar month.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <FiCheckCircle className="text-emerald-400 mt-0.5 shrink-0" />
                <span>Invoices are payable by the last day of the current calendar month.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <FiCheckCircle className="text-emerald-400 mt-0.5 shrink-0" />
                <span>All tuition records can be verified in real-time on our public payments check portal.</span>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PublicMonthlyFeesPage;
