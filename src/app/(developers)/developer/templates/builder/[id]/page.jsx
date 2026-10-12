'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import dynamic from 'next/dynamic';
import LoadingScreen from 'src/component/common/LoadingScreen';

// Dynamically import GrapesStudio with SSR disabled since GrapesJS accesses window and DOM
const GrapesStudio = dynamic(
  () => import('src/component/developer/templates/GrapesStudio'),
  { ssr: false, loading: () => <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-slate-400 text-xs">Initializing GrapesJS Studio Engine...</div> }
);

export default function TemplateBuilderPage() {
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
        const res = await fetch(`/api/marketing/developer/templates/${id}`);
        const data = await res.json();
        if (data.success && data.record) {
          setTemplate(data.record);
        } else {
          setError(data.error || 'Template not found');
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
    const res = await fetch(`/api/marketing/developer/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPayload),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to save template');
    }
  };

  if (loading) {
    return <LoadingScreen fullScreen={true} />;
  }

  if (error || !template) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white gap-4 p-6">
        <span className="text-4xl">⚠️</span>
        <h2 className="text-base font-bold text-slate-200">{error || 'Template not found'}</h2>
        <button
          type="button"
          onClick={() => router.push('/developer/templates')}
          className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded cursor-pointer"
        >
          Return to Templates Catalog
        </button>
      </div>
    );
  }

  return (
    <GrapesStudio
      initialTemplate={template}
      onSave={handleSave}
      onExitUrl="/developer/templates"
    />
  );
}
