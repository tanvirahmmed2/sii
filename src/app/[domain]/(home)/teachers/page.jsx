'use client';

import React, { useEffect, useState, useContext } from 'react';
import TeacherCard from 'src/component/website/cards/TeacherCard';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const TeachersPage = () => {
  const { getApiEndpoint } = useContext(TenantWebsiteContext);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const res = await fetch(getApiEndpoint('teachers'));
        if (res.ok) {
          const data = await res.json();
          setTeachers(data.payload?.teachers || data.paylod?.teachers || data.teachers || []);
        }
      } catch (err) {
        console.error('Failed to fetch teachers:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeachers();
  }, [getApiEndpoint]);

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 space-y-6 transition-colors">
      <div className="w-full border-b border-slate-200 dark:border-slate-800 pb-4">
        <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
          Academic Faculty
        </span>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight mt-0.5">
          Meet Our Expert Faculty Members
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
          Our teachers, subject coordinators, and academic guides mentoring student excellence.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 animate-pulse flex flex-col gap-2"
            >
              <div className="w-full aspect-square bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mx-auto" />
              <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mx-auto" />
            </div>
          ))}
        </div>
      ) : teachers.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {teachers.map((teacher) => (
            <TeacherCard key={teacher.id} teacher={teacher} />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
            No active faculty members found
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            There are currently no listed academic teachers in the institution records.
          </p>
        </div>
      )}
    </div>
  );
};

export default TeachersPage;
