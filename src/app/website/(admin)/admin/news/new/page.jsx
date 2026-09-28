'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FiPlusCircle, FiFileText } from 'react-icons/fi';
import Link from 'next/link';
import AdminForm from '@/component/forms/AdminForm';

const CreateNewsPage = () => {
  const router = useRouter();

  const newsFields = [
    {
      name: 'title',
      label: 'News Title',
      type: 'text',
      required: true,
      placeholder: 'e.g. FIT Annual Convocation 2026'
    },
    {
      name: 'image',
      label: 'Cover Image File',
      type: 'file',
      required: false
    },
    {
      name: 'content',
      label: 'Article Body Content',
      type: 'textarea',
      required: true,
      placeholder: 'Write the complete news article details here...',
      rows: 8
    }
  ];

  return (
    <div className="w-full p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
            Publish Campus News
          </h1>
        </div>
        <Link
          href="/admin/news/list"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <FiFileText />
          <span>View Published News</span>
        </Link>
      </div>

      <AdminForm
        title="New News Article Details"
        fields={newsFields}
        apiEndpoint="/api/news"
        icon={FiPlusCircle}
        onSuccess={() => {
          router.push('/admin/news/list');
        }}
      />
    </div>
  );
};

export default CreateNewsPage;
