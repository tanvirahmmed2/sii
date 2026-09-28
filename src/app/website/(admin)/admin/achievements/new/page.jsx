'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FiAward } from 'react-icons/fi';
import Link from 'next/link';
import AdminForm from '@/component/forms/AdminForm';

const CreateAchievementPage = () => {
  const router = useRouter();

  const achievementFields = [
    {
      name: 'title',
      label: 'Achievement Title',
      type: 'text',
      required: true,
      placeholder: 'e.g. Regional Hackathon Championship'
    },
    {
      name: 'image',
      label: 'Achievement Image',
      type: 'file',
      required: false
    },
    {
      name: 'description',
      label: 'Description / Details',
      type: 'textarea',
      required: true,
      placeholder: 'Provide detailed information about this institutional or student achievement milestone...',
      rows: 6
    }
  ];

  return (
    <div className="w-full p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
            Record New Achievement
          </h1>
        </div>
        <Link
          href="/admin/achievements/list"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <FiAward />
          <span>View Recorded Achievements</span>
        </Link>
      </div>

      <AdminForm
        title="Achievement Entry Details"
        fields={achievementFields}
        apiEndpoint="/api/achievements"
        icon={FiAward}
        onSuccess={() => {
          router.push('/admin/achievements/list');
        }}
      />
    </div>
  );
};

export default CreateAchievementPage;
