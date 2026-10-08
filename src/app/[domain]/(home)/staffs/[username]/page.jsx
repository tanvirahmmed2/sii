'use client';

import React, { useEffect, useState, useContext } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const StaffPublicProfilePage = () => {
  const params = useParams();
  const { username } = params;
  const { getApiEndpoint, tenantUrl } = useContext(TenantWebsiteContext);

  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    const fetchData = async () => {
      try {
        const res = await fetch(getApiEndpoint(`staff/${username}`));
        if (res.ok) {
          const data = await res.json();
          setStaff(data.paylod?.staff || data.payload?.staff || null);
        }
      } catch (err) {
        console.error('Error fetching staff:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [username, getApiEndpoint]);

  const getInitials = (name) =>
    name ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'S';

  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const formatRole = (role) => {
    if (!role) return 'Staff Officer';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <Link
            href={tenantUrl('/staffs')}
            className="text-xs font-medium text-primary hover:underline"
          >
            ← Back to Staff Directory
          </Link>
          {staff?.username && (
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              @{staff.username}
            </span>
          )}
        </div>

        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-xs animate-pulse space-y-4">
            <div className="flex gap-4 items-center">
              <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-1/4" />
              </div>
            </div>
          </div>
        ) : staff ? (
          <div className="space-y-6">

            {/* Profile Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden shadow-xs">
              <div className="p-6 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                  <div className="w-20 h-20 rounded-full overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 relative bg-slate-100 dark:bg-slate-800">
                    {staff.image ? (
                      <Image fill src={staff.image} alt={staff.name} className="object-cover" sizes="80px" />
                    ) : (
                      <div className="w-full h-full bg-primary text-white flex items-center justify-center text-xl font-semibold">
                        {getInitials(staff.name)}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-medium text-primary uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 inline-block">
                      {formatRole(staff.role)}
                    </span>
                    <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                      {staff.name}
                    </h1>
                    {staff.bio && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md leading-relaxed pt-1">
                        {staff.bio}
                      </p>
                    )}
                  </div>
                </div>

                {staff.email && (
                  <div className="shrink-0">
                    <a
                      href={`mailto:${staff.email}`}
                      className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      Email: {staff.email}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Blood Group', value: staff.blood_group },
                { label: 'Nationality', value: staff.nationality },
                { label: 'Date of Birth', value: staff.date_of_birth ? new Date(staff.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null },
                { label: 'Gender', value: staff.gender },
              ].filter(item => item.value).map(({ label, value }) => (
                <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs">
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">
                    {label}
                  </span>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{value}</p>
                </div>
              ))}
            </div>

            {/* Work History */}
            {staff.experiences?.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-3">
                <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                  Institutional Experience ({staff.experiences.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {staff.experiences.map((exp) => (
                    <div key={exp.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-xs">{exp.title}</h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{exp.organization}</p>
                        </div>
                        {exp.is_current && (
                          <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[9px] font-medium rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        {formatDate(exp.start_date)} &ndash; {exp.is_current ? 'Present' : formatDate(exp.end_date)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center max-w-md mx-auto space-y-2">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Staff Record Not Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">The requested staff record does not exist or has been relocated.</p>
            <Link href={tenantUrl('/staffs')} className="text-xs font-medium text-primary hover:underline block pt-1">
              ← Return to Staff Directory
            </Link>
          </div>
        )}

      </div>
    </div>
  );
};

export default StaffPublicProfilePage;
