'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiLayers, FiArrowRight, FiBookOpen } from 'react-icons/fi';
import GradingScaleTable from '@/component/cards/GradingScaleTable';

const ClassesPage = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const fetchClasses = async () => {
      try {
        const res = await fetch('/api/classes');
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setClasses(data.paylod.classes || []);
          }
        }
      } catch (err) {
        console.error('Failed to fetch classes:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    fetchClasses();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex flex-col gap-12">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">
            Our Academic Classes
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl mx-auto text-sm md:text-base">
            Select a class below to explore class objectives, syllabus plans, and academic curriculum details.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs animate-pulse flex flex-col gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-200"></div>
                <div className="w-24 h-4 bg-slate-200 rounded"></div>
                <div className="w-32 h-3 bg-slate-200 rounded"></div>
                <div className="w-full h-8 bg-slate-200 rounded mt-4"></div>
              </div>
            ))}
          </div>
        ) : classes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="bg-white rounded-2xl border border-slate-100 hover:border-primary-light hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between group"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center text-primary text-xl font-bold mb-4 group-hover:scale-105 transition-transform duration-200">
                    <FiLayers />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-lg group-hover:text-primary transition-colors">
                    {cls.name}
                  </h3>
                  
                  <p className="text-slate-500 text-xs mt-3 leading-relaxed">
                    Access syllabus plans, subject schedules, and grading standards for {cls.name}.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-50">
                  <Link
                    href={`/classes/${cls.code || cls.id || cls}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-sky-850 transition-colors"
                  >
                    <span>View Curriculum</span>
                    <FiArrowRight className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center max-w-md mx-auto shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto text-xl mb-4">
              <FiBookOpen />
            </div>
            <h3 className="font-bold text-slate-800 text-base">No active classes found</h3>
            <p className="text-slate-500 text-xs mt-1">
              There are currently no listed classes in our database records.
            </p>
          </div>
        )}

        {/* Institutional Grading Scale Table */}
        <GradingScaleTable 
          title="Curriculum Grading System" 
          subtitle="Overview of letter grades, mark range thresholds (%), and GPA points applied across all academic classes."
        />
      </div>
    </div>
  );
};

export default ClassesPage;
