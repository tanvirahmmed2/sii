'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FiBriefcase, FiList } from 'react-icons/fi';
import Link from 'next/link';
import AdminForm from '@/component/forms/AdminForm';

const CreateCollaborationPage = () => {
  const router = useRouter();

  const collaborationFields = [
    {
      name: 'institution_name',
      label: 'Institution Name',
      type: 'text',
      required: true,
      placeholder: 'e.g. MIT Media Lab',
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      required: false,
      placeholder: 'Brief description about the collaboration, programs, or research areas...',
      rows: 4,
    },
    {
      name: 'logo',
      label: 'Institution Logo',
      type: 'file',
      required: false,
    },
  ];

  return (
    <div className="w-full p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
            Record New Collaboration
          </h1>
        </div>
        <Link
          href="/admin/collaborations/list"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <FiList />
          <span>View All Collaborations</span>
        </Link>
      </div>

      <AdminForm
        title="Collaboration Entry Details"
        fields={collaborationFields}
        apiEndpoint="/api/collaborations"
        icon={FiBriefcase}
        onSuccess={() => {
          router.push('/admin/collaborations/list');
        }}
      />
    </div>
  );
};

export default CreateCollaborationPage;
