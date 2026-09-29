'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FiAward, FiList } from 'react-icons/fi';
import Link from 'next/link';
import AdminForm from '@/component/forms/AdminForm';

const CreateRecognitionPage = () => {
  const router = useRouter();

  const recognitionFields = [
    {
      name: 'name',
      label: 'Recognition / Award Name',
      type: 'text',
      required: true,
      placeholder: 'e.g. Best Student of the Year',
    },
    {
      name: 'awarded_by',
      label: 'Awarded By',
      type: 'text',
      required: true,
      placeholder: 'e.g. National Education Board',
    },
    {
      name: 'date',
      label: 'Award Date',
      type: 'date',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      required: false,
      placeholder: 'Brief description about this recognition or award...',
      rows: 4,
    },
    {
      name: 'image',
      label: 'Award / Certificate Image',
      type: 'file',
      required: false,
    },
  ];

  return (
    <div className="w-full p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
            Record New Recognition
          </h1>
        </div>
        <Link
          href="/admin/recognition/list"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <FiList />
          <span>View All Recognitions</span>
        </Link>
      </div>

      <AdminForm
        title="Recognition Entry Details"
        fields={recognitionFields}
        apiEndpoint="/api/recognitions"
        icon={FiAward}
        onSuccess={() => {
          router.push('/admin/recognition/list');
        }}
      />
    </div>
  );
};

export default CreateRecognitionPage;
