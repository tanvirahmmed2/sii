'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FiPlus, FiArrowLeft } from 'react-icons/fi';
import AdmissionCircularForm from '@/component/forms/AdmissionCircularForm';

const NewCircularPage = () => {
  const router = useRouter();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await fetch('/api/classes');
        const data = await res.json();
        if (data.success && data.paylod?.classes) {
          setClasses(data.paylod.classes);
        }
      } catch (err) {
        toast.error('Failed to load target classes dropdown.');
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  const handleSubmit = async (formValues) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('Admission circular published successfully!');
        router.push('/admin/students/admissions/circulars');
      } else {
        throw new Error(data.error || 'Failed to save admission circular.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[40vh] flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold text-slate-400">Loading form criteria...</span>
      </div>
    );
  }

  return (
    <div className="w-full  bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.01)] animate-fade-up">
      
      <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
        <button
          onClick={() => router.push('/admin/students/admissions/circulars')}
          className="p-1.5 hover:bg-slate-50 text-slate-500 rounded-lg transition-colors cursor-pointer"
          title="Back to circulars"
        >
          <FiArrowLeft className="text-lg" />
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FiPlus className="text-blue-600" /> Publish Admission Circular
          </h1>
          <p className="text-xs text-slate-400">Specify requirements and timelines for the new drive.</p>
        </div>
      </div>

      <AdmissionCircularForm
        onSubmit={handleSubmit}
        onCancel={() => router.push('/admin/students/admissions/circulars')}
        classes={classes}
        submitting={submitting}
      />
    </div>
  );
};

export default NewCircularPage;
