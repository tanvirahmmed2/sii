'use client';

import { SCHOOL_NAME } from '@/lib/secret';
import React from 'react';
import { FiAward, FiBook, FiCheckCircle } from 'react-icons/fi';
import { GiCreditsCurrency } from 'react-icons/gi';

const About = () => {
  return (
    <section className="w-full py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="mx-auto max-w-7xl w-full">
        <div className="w-full flex flex-col items-center justify-center gap-20">

          <div className="w-full flex flex-col gap-4 items-center justify-center">

            <h2 className="text-3xl md:text-5xl text-center font-semibold text-slate-900 tracking-tight leading-tight">
              A Legacy of Academic and Personal Excellence
            </h2>
            <p className="text-center text-sm leading-relaxed">
              Founded on the pillars of character, scholarship, and community, {SCHOOL_NAME} is dedicated to preparing students for global career success. Our state-of-the-art facilities and progressive teaching methods cultivate a dynamic environment where potential is transformed into achievement.
            </p>

          </div>

          <div className="w-full flex flex-col items-center justify-center gap-8">
            <div className='w-full flex flex-col md:flex-row items-center justify-center gap-6'>
              <div className="w-full flex flex-col bg-slate-50 rounded-2xl gap-4 p-5">
                <div className="w-10 h-10 bg-tertiary text-secondary rounded-xl flex items-center justify-center font-bold">
                  <FiBook />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Modern Classrooms</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Smart displays, stable connectivity, and modern teaching aids for high quality learning experiences.
                </p>
              </div>

              <div className="w-full flex flex-col bg-slate-50 rounded-2xl gap-4 p-5">
                <div className="w-10 h-10 bg-tertiary text-secondary rounded-xl flex items-center justify-center font-bold">
                  <FiAward />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Research Labs</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Fully equipped engineering, physics, and computer science modules for hands-on research.
                </p>
              </div>
            </div>

            <div className="w-full flex flex-col bg-slate-50 rounded-2xl gap-4 p-5">
              <div className="w-10 h-10 bg-tertiary text-secondary rounded-xl flex items-center justify-center font-bold">
                  <GiCreditsCurrency />
                </div>
              <h3 className="font-bold text-slate-800 text-sm">{SCHOOL_NAME.split(" ")[0]} Accreditation</h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                {SCHOOL_NAME.split(" ").map((w) => w[0]).join('')} is fully accredited by regional academic senates, ensuring global recognition of transcripts, courses, and certifications.
              </p>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};

export default About;