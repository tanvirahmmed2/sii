'use client';

import React, { useEffect, useState, Suspense } from 'react';
import TenantLoader from 'src/component/tenant/TenantLoader';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const StudentMaterialsPageContent = () => {
  const searchParams = useSearchParams();
  const { getApiEndpoint, tenantUrl } = useTenantWebsite();
  const classSubjectId = searchParams.get('class_subject_id');
  const subjectName = searchParams.get('subject_name') || 'Subject Study Materials';

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const url = classSubjectId
          ? `${getApiEndpoint('student/materials')}?class_subject_id=${classSubjectId}`
          : getApiEndpoint('student/materials');

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const list = data.payload?.materials || data.payload?.study_materials || data.materials || data.study_materials || [];
          setMaterials(list);
        }
      } catch (error) {
        console.error('Error fetching study materials:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, [classSubjectId, getApiEndpoint]);

  if (loading) {
    return <TenantLoader fullScreen={false} />;
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={tenantUrl('/student/subjects')}
              className="text-xs font-medium text-primary hover:underline"
            >
              ← Back to Subjects
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
              LMS Learning Resources
            </span>
          </div>
          <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">{subjectName}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Download syllabus modules, notes, and study guides published for this curriculum course.
          </p>
        </div>

        <div className="px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold self-start sm:self-auto font-mono">
          {materials.length} resource{materials.length !== 1 ? 's' : ''}
        </div>
      </div>

      {materials.length === 0 ? (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-10 text-center space-y-2">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">No Materials Available Yet</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs max-w-xs mx-auto">
            Your course instructor has not published downloadable learning files for this subject yet.
          </p>
          <div className="pt-2">
            <Link
              href={tenantUrl('/student/subjects')}
              className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-block"
            >
              Return to Subjects List
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map((mat) => (
            <div
              key={mat.id}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                    {mat.resource_type || 'Study Document'}
                  </span>
                  {mat.subject_name && (
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      {mat.subject_name}
                    </span>
                  )}
                  {mat.created_at && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      • {new Date(mat.created_at).toLocaleDateString('en-GB')}
                    </span>
                  )}
                </div>

                <p className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm truncate">{mat.title}</p>
                {mat.description && (
                  <p
                    className="text-slate-500 dark:text-slate-400 text-xs truncate"
                    dangerouslySetInnerHTML={{ __html: mat.description.replace(/<[^>]+>/g, ' ').trim() }}
                  />
                )}
              </div>

              {mat.file_url && (
                <div className="shrink-0 self-start sm:self-auto">
                  <a
                    href={mat.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium transition-colors shadow-xs inline-block"
                  >
                    Download Resource
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StudentMaterialsPage = () => (
  <Suspense fallback={<TenantLoader fullScreen={false} />}>
    <StudentMaterialsPageContent />
  </Suspense>
);

export default StudentMaterialsPage;
