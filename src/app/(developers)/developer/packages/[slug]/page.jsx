'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';


import PackageForm from 'src/component/marketing/developer/forms/PackageForm';

export default function PackageDetailPage({ params }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const router = useRouter();

  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const fetchPackage = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/marketing/developer/packages/${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (data.success && data.record) {
        setPkg(data.record);
      } else {
        setError(data.error || 'Package plan not found');
      }
    } catch (err) {
      console.error('Error fetching package details:', err);
      setError(err.message || 'Failed to load package');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/marketing/developer/packages/${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.record) {
          setPkg(data.record);
        } else {
          setError(data.error || 'Package plan not found');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error fetching package details:', err);
        setError(err.message || 'Failed to load package');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete plan "${pkg?.name}"?`)) {
      return;
    }

    try {
      setDeleting(true);
      const res = await fetch(`/api/marketing/developer/packages/${encodeURIComponent(slug)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        router.push('/developer/packages');
      } else {
        alert(data.error || 'Failed to delete package');
      }
    } catch (err) {
      alert(err.message || 'Error deleting package');
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateSuccess = (updated) => {
    if (updated?.slug && updated.slug !== slug) {
      router.push(`/developer/packages/${updated.slug}`);
    } else {
      fetchPackage();
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
        
        <span className="text-xs font-normal">Loading subscription tier...</span>
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded bg-rose-50 text-rose-500 mx-auto flex items-center justify-center text-2xl">
          
        </div>
        <h2 className="text-lg font-medium text-slate-900 dark:text-white">Package Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {error || `No subscription package matching slug "${slug}" exists.`}
        </p>
        <Link
          href="/developer/packages"
          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium transition-all"
        >
          
          <span>Return to Packages</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header and Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 sm:p-8 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-normal text-slate-500 dark:text-slate-400">
            <Link href="/developer" className="hover:text-secondary">Dashboard</Link>
            <span>/</span>
            <Link href="/developer/packages" className="hover:text-secondary">Packages</Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 truncate max-w-50">{pkg.name || 'Package'}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded bg-secondary/10 text-secondary flex items-center justify-center text-xl shrink-0">
              
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-medium text-slate-900 dark:text-white tracking-tight">
                Edit Package
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-lg">
                Manage quotas, pricing models, and module entitlements for &quot;{pkg.name}&quot;
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/developer/packages"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-all"
          >
            
            <span>All Packages</span>
          </Link>

          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/30 text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
            title="Delete package permanently"
          >
            
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Direct Update Form */}
      <PackageForm
        initialData={pkg}
        onSuccess={handleUpdateSuccess}
        onCancel={() => router.push('/developer/packages')}
      />
    </div>
  );
}
