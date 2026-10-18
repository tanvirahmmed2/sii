'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

const TASK_ROUTE_MAP = {
  student_id: '/developer/templates/student-id-card/builder',
  student_id_card: '/developer/templates/student-id-card/builder',
  teacher_id: '/developer/templates/teacher-id-card/builder',
  teacher_id_card: '/developer/templates/teacher-id-card/builder',
  officer_id: '/developer/templates/officer-id-card/builder',
  officer_id_card: '/developer/templates/officer-id-card/builder',
  student_tc: '/developer/templates/tc/builder',
  tc: '/developer/templates/tc/builder',
  student_testimonial: '/developer/templates/testimonial/builder',
  testimonial: '/developer/templates/testimonial/builder',
  student_certificate: '/developer/templates/certificate/builder',
  certificate: '/developer/templates/certificate/builder',
  payment_receipt: '/developer/templates/payment-receipt/builder',
  poster: '/developer/templates/poster/builder',
};

export default function GenericBuilderDispatcherPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params?.id;
  const taskQuery = searchParams.get('task') || searchParams.get('category');

  const [status, setStatus] = useState('Resolving template studio...');
  const [error, setError] = useState(null);

  useEffect(() => {
    async function dispatch() {
      if (!id) return;

      // If task query is already provided in URL, redirect immediately
      if (taskQuery && TASK_ROUTE_MAP[taskQuery]) {
        router.replace(`${TASK_ROUTE_MAP[taskQuery]}/${id}`);
        return;
      }

      // Otherwise fetch template to discover which dedicated task table it resides in
      try {
        const res = await fetch(`/api/marketing/developer/templates/${id}`);
        const data = await res.json();
        if (data.success && data.task && data.task.key) {
          const targetPrefix = TASK_ROUTE_MAP[data.task.key] || TASK_ROUTE_MAP[data.task.category];
          if (targetPrefix) {
            router.replace(`${targetPrefix}/${id}`);
            return;
          }
        }
        setError(data.error || 'Could not locate template studio for this task');
      } catch (e) {
        setError(e.message || 'Error locating template');
      }
    }

    dispatch();
  }, [id, taskQuery, router]);

  if (error) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-200 gap-3 p-6 text-center">
        <span className="text-[10px] uppercase font-semibold text-rose-400 bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded">
          Builder Routing Error
        </span>
        <h2 className="text-base font-semibold text-white">{error}</h2>
        <button
          type="button"
          onClick={() => router.push('/developer/templates/student-id-card')}
          className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors cursor-pointer"
        >
          Return to Templates
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-2">
      <span className="text-xs font-mono uppercase tracking-wider text-sky-400">Template Studio Dispatcher</span>
      <p className="text-xs text-slate-500">{status}</p>
    </div>
  );
}
