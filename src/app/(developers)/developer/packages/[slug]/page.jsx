'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PackageForm from 'src/component/marketing/developer/forms/PackageForm';
import LoadingScreen from 'src/component/common/LoadingScreen';

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
    return <LoadingScreen fullScreen={false} label="Loading subscription tier..." />;
  }

  if (error || !pkg) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 text-center space-y-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Package Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {error || `No subscription package matching slug "${slug}" exists.`}
        </p>
        <Link
          href="/developer/packages"
          className="inline-block px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium transition-colors"
        >
          Return to Packages
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header and Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1 text-xs text-slate-500">
            <Link href="/developer" className="hover:underline">Dashboard</Link>
            <span>/</span>
            <Link href="/developer/packages" className="hover:underline">Packages</Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-medium">{pkg.name || 'Package'}</span>
          </div>

          <div>
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">
              Edit Package: {pkg.name}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage quotas, pricing models, and module entitlements for &quot;{pkg.name}&quot;
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/developer/packages"
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
          >
            All Packages
          </Link>

          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="px-3 py-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
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
