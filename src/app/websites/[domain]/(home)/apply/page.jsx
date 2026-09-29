import React from 'react';
import Link from 'next/link';
import { FiCheckCircle, FiFileText, FiUserCheck, FiCreditCard, FiArrowRight } from 'react-icons/fi';
import { SCHOOL_NAME } from '@/lib/secret';
import GradingScaleTable from '@/component/cards/GradingScaleTable';

const ApplyPage = () => {
  const steps = [
    {
      title: 'Complete Application Form',
      description: 'Fill out the digital student registration profile form with your academic details and preferences.',
      icon: FiFileText,
    },
    {
      title: 'Upload Official Credentials',
      description: 'Attach certified scanned copies of your high school transcripts, birth certificates, and passport photos.',
      icon: FiUserCheck,
    },
    {
      title: 'Submit Enrollment Fees',
      description: 'Process the registration billing invoices securely via online banking or credit facilities.',
      icon: FiCreditCard,
    },
    {
      title: 'Acknowledge Admission Letter',
      description: 'Our academic registry checks credentials and updates approval letters directly in your student login portal.',
      icon: FiCheckCircle,
    },
  ];

  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full flex flex-col gap-12">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">
            Begin Your Journey At {SCHOOL_NAME.split(" ").map((w)=>w[0]).join('')}
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl mx-auto text-sm md:text-base">
            Enroll today to build technical skillsets guided by expert global faculty.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="bg-white rounded-2xl border border-slate-100 p-6 flex gap-4 hover:shadow-xs transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center text-secondary text-lg shrink-0 font-bold">
                  <Icon />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Step {idx + 1}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base">
                    {step.title}
                  </h3>
                  <p className="text-slate-500 text-xs md:text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <GradingScaleTable 
          title="Academic Grading Standard" 
          subtitle="Official minimum marks, maximum mark percentage ranges, and grade points for applicant evaluation."
        />

        <div className="bg-primary from-sky-900 to-indigo-950 text-white rounded-3xl p-8 md:p-10 shadow-lg text-center flex flex-col items-center gap-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary-dark from-sky-800/10 via-transparent to-transparent"></div>
          <div className="flex flex-col gap-2 relative z-10">
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight">
              Ready to Submit Your Application?
            </h2>
            <p className="text-secondary text-xs md:text-sm max-w-md mx-auto leading-relaxed">
              Our academic registrar registry portal is open. Get instant enrollment confirmations by completing the online application form.
            </p>
          </div>
          <Link
            href="/admission"
            className="inline-flex items-center justify-center gap-2 bg-secondary text-tertiary font-semibold px-6 py-3 rounded-xl shadow-md hover:scale-[1.02] transition-all relative z-10 text-sm"
          >
            <span>Fill Application Form</span>
            <FiArrowRight />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ApplyPage;
