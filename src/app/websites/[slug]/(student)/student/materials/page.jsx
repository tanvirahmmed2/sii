'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FiFile, FiInfo, FiBookOpen, FiDownload, FiClock, FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';

const StudentMaterialsPageContent = () => {
  const searchParams = useSearchParams();
  const classSubjectId = searchParams.get('class_subject_id');
  const subjectName = searchParams.get('subject_name') || 'Subject Materials';

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classSubjectId) { setLoading(false); return; }
    const fetchMaterials = async () => {
      try {
        const res = await fetch(`/api/lms/study-materials?class_subject_id=${classSubjectId}`);
        if (res.ok) {
          const data = await res.json();
          setMaterials(data.paylod?.study_materials || []);
        }
      } catch (error) {
        console.error('Error fetching study materials:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMaterials();
  }, [classSubjectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-5xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/70">
        <div>
          <p className="text-emerald-700 text-[11px] font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
            <FiBookOpen /> Study Materials
          </p>
          <h1 className="text-lg font-bold text-slate-800">{subjectName}</h1>
        </div>
        <div className="px-3 py-1.5 bg-slate-100 rounded-xl text-slate-600 text-xs font-semibold">
          {materials.length} resource{materials.length !== 1 ? 's' : ''}
        </div>
      </div>

      {!classSubjectId ? (
        <div className="bg-white border border-slate-200/70 rounded-2xl p-10 text-center flex flex-col items-center gap-3">
          <FiInfo className="text-3xl text-slate-300" />
          <p className="text-slate-500 text-sm font-medium">No subject selected.</p>
          <Link href="/student/subjects" className="text-emerald-600 text-xs font-semibold flex items-center gap-1 hover:underline">
            <FiArrowLeft className="text-xs" /> Go to Subjects
          </Link>
        </div>
      ) : materials.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-2xl p-10 text-center flex flex-col items-center gap-3">
          <FiInfo className="text-3xl text-slate-300" />
          <p className="text-slate-800 text-sm font-bold">No materials available yet</p>
          <p className="text-slate-400 text-xs max-w-xs">Your teacher hasn't uploaded any resources for this subject.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {materials.map((mat) => (
            <div
              key={mat.id}
              className="bg-white border border-slate-200/70 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 hover:border-emerald-400/60 transition-all duration-150"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shrink-0">
                  <FiFile className="text-base" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 text-sm truncate">{mat.title}</p>
                  {mat.description && (
                    <p className="text-slate-400 text-xs truncate mt-0.5"
                      dangerouslySetInnerHTML={{ __html: mat.description.replace(/<[^>]+>/g, ' ').trim() }}
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {mat.created_at && (
                  <span className="hidden sm:flex items-center gap-1 text-slate-400 text-[10px]">
                    <FiClock className="text-[10px]" />
                    {new Date(mat.created_at).toLocaleDateString('en-GB')}
                  </span>
                )}
                <a
                  href={mat.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <FiDownload className="text-xs" />
                  <span>Download</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StudentMaterialsPage = () => (
  <Suspense fallback={
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
    </div>
  }>
    <StudentMaterialsPageContent />
  </Suspense>
);

export default StudentMaterialsPage;
