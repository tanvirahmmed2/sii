'use client';

import React, { useEffect, useState } from 'react';
import TeacherCard from '@/component/cards/TeacherCard';
import { FiUser } from 'react-icons/fi';

const TeachersPage = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const res = await fetch('/api/teachers');
        if (res.ok) {
          const data = await res.json();
          setTeachers(data.paylod.teachers || []);
        }
      } catch (err) {
        console.error('Failed to fetch teachers:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeachers();
  }, []);

  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-3 tracking-tight">
            Meet Our Expert Faculty
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl mx-auto text-sm md:text-base">
            Our professors, researchers, and technical lecturers guide student training with rich research experience.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs animate-pulse flex">
                <div className="w-30 shrink-0 bg-slate-100"></div>
                <div className="flex-1 p-5 flex flex-col justify-center gap-3">
                  <div className="h-3.5 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-2.5 bg-slate-200 rounded w-1/2"></div>
                  <div className="h-7 bg-slate-100 rounded-lg w-28 mt-2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : teachers.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {teachers.map((teacher) => (
              <TeacherCard key={teacher.id} teacher={teacher} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center max-w-md mx-auto shadow-xs mt-8">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto text-xl mb-4">
              <FiUser />
            </div>
            <h3 className="font-bold text-slate-800 text-base">No active faculty found</h3>
            <p className="text-slate-500 text-xs mt-1">
              There are currently no listed academic teachers in our database records.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeachersPage;
