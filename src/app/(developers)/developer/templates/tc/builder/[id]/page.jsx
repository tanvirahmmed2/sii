'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const StudentTcStudio = dynamic(
  () => import('src/component/developer/templates/StudentTcStudio'),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 text-xs">
        <span>Loading Transfer Certificate Fabric.js Canvas Engine...</span>
      </div>
    ),
  }
);

export default function StudentTcBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadTemplate() {
      if (!id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/marketing/developer/templates/${id}?task=student_tc`);
        const data = await res.json();
        if (data.success && data.record) {
          setTemplate(data.record);
        } else {
          setError(data.error || 'Transfer Certificate template not found');
        }
      } catch (e) {
        setError(e.message || 'Error fetching template');
      } finally {
        setLoading(false);
      }
    }
    loadTemplate();
  }, [id]);

  const handleSave = async (updatedPayload) => {
    const res = await fetch(`/api/marketing/developer/templates/${id}?task=student_tc`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPayload),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to save transfer certificate template');
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-2">
        <span className="text-xs font-mono uppercase tracking-wider text-sky-400">Transfer Certificate Studio</span>
        <p className="text-xs text-slate-500">Loading vector layout from system_student_tc_templates...</p>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-200 gap-3 p-6 text-center">
        <span className="text-[10px] uppercase font-semibold text-rose-400 bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded">
          Error Encountered
        </span>
        <h2 className="text-base font-semibold text-white">{error || 'Template not found'}</h2>
        <p className="text-xs text-slate-400 max-w-sm">
          The requested transfer certificate template could not be loaded from system_student_tc_templates.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => router.push('/developer/templates/tc')}
            className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Return to Transfer Certificate Templates
          </button>
        </div>
      </div>
    );
  }

  return (
    <StudentTcStudio
      initialTemplate={template}
      onSave={handleSave}
      onExitUrl="/developer/templates/tc"
    />
  );
}
