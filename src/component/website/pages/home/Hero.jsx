'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiArrowRight, FiBookOpen, FiUsers, FiLayers, FiShield } from 'react-icons/fi';
import { SCHOOL_NAME } from '@/lib/secret';

const Hero = () => {
  const [schoolName, setSchoolName] = useState(SCHOOL_NAME);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await fetch('/api/public/stats');
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          const payload = statsData.payload || statsData.paylod;
          if (statsData.success && payload) {
            setStats({
              totalStudents: payload.totalStudents || 0,
              totalTeachers: payload.totalTeachers || 0,
              totalClasses: payload.totalClasses || 0
            });
          }
        }
      } catch (err) {
        console.error('Error fetching public stats:', err);
      }

      try {
        const settingsRes = await fetch('/api/admin/website-settings');
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          const settings = settingsData.paylod?.settings || settingsData.payload?.settings;
          if (settingsData.success && settings?.school_name) {
            setSchoolName(settings.school_name);
          }
        }
      } catch (err) {
        console.error('Error fetching website settings:', err);
      }
    };

    fetchData();
  }, []);

  return (
    <section className="relative w-full min-h-[85vh] flex items-center justify-center overflow-hidden bg-slate-50 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-slate-100">

      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 blur-[2px] scale-110 select-none pointer-events-none"
      >
        <source src="/campus.mp4" type="video/mp4" />
      </video>

      <div className="mx-auto w-full max-w-5xl relative z-10 flex flex-col items-center text-center space-y-6">



        <h1 className="text-4xl sm:text-6xl md:text-7xl font-semibold tracking-tight leading-tight text-white max-w-4xl">
          {schoolName || SCHOOL_NAME}
        </h1>

        <p className="text-white text-base sm:text-lg md:text-xl max-w-2xl leading-relaxed font-normal">
          Welcome to a community dedicated to academic rigor, creative innovation, and global leadership. We provide students the resources and support to excel in their chosen fields.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full sm:w-auto px-4 justify-center">
          <Link
            href="/apply"
            className="group relative inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-secondary font-bold px-8 py-4 rounded-xl text-sm transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            <span>Apply for Admission</span>
            <FiArrowRight className="group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
          <Link
            href="/auth/student/login"
            className="inline-flex items-center justify-center gap-2 bg-white/90 hover:bg-white text-slate-800 font-bold px-8 py-4 rounded-xl text-sm border border-slate-200 hover:border-slate-300 shadow-xs transition-all duration-300 hover:-translate-y-0.5"
          >
            <span>Student Portal</span>
          </Link>
        </div>

        <div className="hidden md:grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 border-t border-slate-300/60 w-full">

          <div className="flex items-center gap-4 bg-white/90 border border-secondary hover:border-tertiary p-5 rounded-2xl shadow-xs hover:shadow-md hover:shadow-tertiary-light group transition-all duration-300 backdrop-blur-xs">
            <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center text-secondary shrink-0 group-hover:scale-110 transition-transform duration-300">
              <FiUsers className="w-6 h-6" />
            </div>
            <div className="text-left">
              <p className="text-3xl font-semibold text-secondary-dark tracking-tight">
                {stats.totalStudents ? `${stats.totalStudents.toLocaleString()}+` : '0'}
              </p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">Total Students</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/90 border border-secondary hover:border-tertiary p-5 rounded-2xl shadow-xs hover:shadow-md hover:shadow-tertiary-light group transition-all duration-300 backdrop-blur-xs">
            <div className="w-12 h-12 bg-primary-light  rounded-xl flex items-center justify-center text-secondary shrink-0 group-hover:scale-110 transition-transform duration-300">
              <FiBookOpen className="w-6 h-6" />
            </div>
            <div className="text-left">
              <p className="text-3xl font-semibold text-secondary-dark tracking-tight">
                {stats.totalTeachers ? `${stats.totalTeachers}+` : '0'}
              </p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">Expert Faculty</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/90 border border-secondary hover:border-tertiary p-5 rounded-2xl shadow-xs hover:shadow-md hover:shadow-tertiary-light group transition-all duration-300 backdrop-blur-xs">
            <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center text-secondary shrink-0 group-hover:scale-110 transition-transform duration-300">
              <FiLayers className="w-6 h-6" />
            </div>
            <div className="text-left">
              <p className="text-3xl font-semibold text-secondary-dark tracking-tight">
                {stats.totalClasses || '0'}
              </p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">Academic Classes</p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default Hero;