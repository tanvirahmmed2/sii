'use client';

import React from 'react';
import Link from 'next/link';
import {
  FiFileText, FiUserX, FiCreditCard, FiAward, FiUsers,
  FiArrowRight, FiShield
} from 'react-icons/fi';

export default function DocumentHubCards({ basePath = '/admin/documents' }) {
  const cards = [
    {
      title: 'Transfer Certificates (TC)',
      description: 'Issue official Transfer Certificates for leaving students and update their status to transferred.',
      icon: FiUserX,
      iconBg: 'bg-tertiary text-secondary border-primary',
      btnBg: 'bg-tertiary hover:bg-tertiary-dark text-white',
      link: `${basePath}/transfer-certificates`
    },
    {
      title: 'Exam Admit Cards',
      description: 'Verify examination fee clearance and issue term examination admit cards with timetables.',
      icon: FiFileText,
      iconBg: 'bg-tertiary text-secondary border-primary',
      btnBg: 'bg-tertiary hover:bg-tertiary-dark text-white',
      link: `${basePath}/admit-cards`
    },
    {
      title: 'Student ID Cards',
      description: 'Generate and print official credit-card formatted student identity cards.',
      icon: FiCreditCard,
      iconBg: 'bg-tertiary text-secondary border-primary',
      btnBg: 'bg-tertiary hover:bg-tertiary-dark text-white',
      link: `${basePath}/id-cards`
    },
    {
      title: 'Student Testimonials',
      description: 'Issue character and academic performance testimonials for active or graduating students.',
      icon: FiAward,
      iconBg: 'bg-tertiary text-secondary border-primary',
      btnBg: 'bg-tertiary hover:bg-tertiary-dark text-white',
      link: `${basePath}/testimonials`
    },
    {
      title: 'Transferred Students Roster',
      description: 'View archived records of transferred students and re-print historical Transfer Certificates.',
      icon: FiUsers,
      iconBg: 'bg-tertiary text-secondary border-primary',
      btnBg: 'bg-tertiary hover:bg-tertiary-dark text-white',
      link: `${basePath}/transferred-students`
    }
  ];

  return (
    <div className="w-full flex flex-col gap-6 max-w-6xl mx-auto pb-16 animate-fade-up">
      
      <div className="bg-white border border-slate-200/80 p-6 sm:p-8 rounded-3xl shadow-2xs">
       
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Student Document Center</h1>
        <p className="text-slate-500 text-xs sm:text-sm font-normal mt-1 max-w-2xl">
          Select a document module below to issue Transfer Certificates, Exam Admit Cards, Student ID Cards, or Character Testimonials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-secondary border border-slate-200/80 hover:border-slate-300 rounded-3xl p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-xl ${card.iconBg}`}>
                    <Icon />
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    {card.description}
                  </p>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-slate-100">
                <Link href={card.link}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${card.btnBg}`}>
                  <span>Open Task Desk</span>
                  <FiArrowRight className="text-sm transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
