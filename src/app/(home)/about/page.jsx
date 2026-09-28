'use client';

import Link from 'next/link';
import {
  ShieldCheckIcon,
  BoxIcon,
  LayoutGridIcon,
  UsersIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
} from '@/components/ui/Icons';

export default function AboutPage() {
  const pillars = [
   
    {
      icon: LayoutGridIcon,
      title: 'Real-Time Visual Studio',
      desc: 'Optimistic UI state reconciliations ensure drag-and-drop section adjustments feel fluid, instantaneous, and zero-latency.',
     
    },
    {
      icon: UsersIcon,
      title: 'Creator & Manager Delegation',
      desc: 'Built for collaborative growth. Independent creators can assign verified managers with fine-grained permissions to maintain their portfolios.',
     
    },
    {
      icon: ShieldCheckIcon,
      title: 'Enterprise Trust & Security',
      desc: 'Role-based access control, PostgreSQL row-level security readiness, spam moderation pipelines, and end-to-end SSL edge delivery.',
      
    },
  ];


  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-16 space-y-20">
      <div className="text-center max-w-4xl mx-auto space-y-4">
        
        <h1 className="text-4xl sm:text-5xl font-semibold text-primary tracking-tight leading-tight">
          Empowering Creators with High-Performance Multi-Website Portfolios
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          PortfolioCraft is engineered from the ground up for software architects, digital designers, and creative directors who demand high aesthetic standards, relational data integrity, and collaborative management.
        </p>
      </div>

      <div className="w-full flex flex-col md:flex-row items-center justify-center gap-4">
        {pillars.map((pillar, idx) => {
          const Icon = pillar.icon;
          return (
            <div
              key={idx}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-6 transition-colors"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-secondary bg-secondary/10">
                  <Icon />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">{pillar.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{pillar.desc}</p>
              </div>
              <div className="pt-2 text-[11px] text-secondary font-semibold flex items-center gap-1">
                <CheckCircleIcon className="w-3.5 h-3.5" />
                <span>Production Ready</span>
              </div>
            </div>
          );
        })}
      </div>

      
      <div className="text-center rounded-3xl bg-secondary p-10 space-y-6 shadow-2xl">
        <h3 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
          Ready to experience the next evolution in portfolio creation?
        </h3>
        <p className="text-xs text-slate-300 max-w-xl mx-auto">
          Sign up today, choose your package, and deploy your custom-branded portfolio with live appointment bookings and verified testimonials.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/packages"
            className="px-6 py-3 rounded-xl bg-light hover:opacity-90 text-secondary text-xs font-semibold transition-all"
          >
            Explore Pricing & Packages →
          </Link>
          <Link
            href="/themes"
            className="px-6 py-3 rounded-xl bg-primary text-light text-xs font-semibold  transition-all"
          >
            Browse Themes Gallery
          </Link>
        </div>
      </div>
    </div>
  );
}
