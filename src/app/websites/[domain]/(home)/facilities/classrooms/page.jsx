'use client';

import React from 'react';
import { FiBookOpen, FiPlay, FiServer, FiWind } from 'react-icons/fi';
import Link from 'next/link';

const ClassroomFacilities = () => {
  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-sky-655 bg-primary-light px-3 py-1 rounded-full uppercase tracking-widest text-primary">
            Study Blocks
          </span>
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-3 tracking-tight">
            Classrooms & Lecture Halls
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl mx-auto text-sm md:text-base">
            Exploring classroom layouts designed for stable digital collaboration, high visibility, and technical concentration.
          </p>
        </div>

        {/* Content Box */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-xs flex flex-col gap-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <div className="flex gap-4 sm:gap-6 items-start">
            <div className="w-12 h-12 rounded-2xl bg-primary-light border border-primary-light text-primary flex items-center justify-center shrink-0">
              <FiPlay className="text-lg" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="font-semibold text-slate-900 text-sm">Interactive Media Projectors</h3>
              <p className="text-slate-500 text-xs">Every classroom block features standard overhead smart projection displays, digital writing pads, and dynamic screen mirroring options for teachers.</p>
            </div>
          </div>

          <div className="flex gap-4 sm:gap-6 items-start border-t border-slate-100 pt-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <FiServer className="text-lg" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="font-semibold text-slate-900 text-sm">Power Backups & Connectivity</h3>
              <p className="text-slate-500 text-xs">High-speed wireless internet terminals across student seats with stable backup generators ensuring uninterruptible class schedules.</p>
            </div>
          </div>

          <div className="flex gap-4 sm:gap-6 items-start border-t border-slate-100 pt-6">
            <div className="w-12 h-12 rounded-2xl bg-primary-light border border-primary-light text-primary flex items-center justify-center shrink-0">
              <FiWind className="text-lg" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="font-semibold text-slate-900 text-sm">Comfort and Air Conditioning</h3>
              <p className="text-slate-500 text-xs">Fully air-conditioned environments configured with environment-friendly air filter vents to keep classrooms fresh and promote learning concentration.</p>
            </div>
          </div>

          <div className="flex gap-3 justify-end border-t border-slate-100 pt-6 mt-2">
            <Link
              href="/facilities"
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Back to Facilities
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassroomFacilities;