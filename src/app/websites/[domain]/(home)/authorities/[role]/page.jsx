'use client';

import React, { useEffect, useState, useContext, use } from 'react';
import Link from 'next/link';
import { Context } from '@/component/helper/Context';
import AuthorityCard from '@/component/cards/AuthorityCard';
import { FiChevronRight, FiShield, FiUsers, FiArrowLeft, FiAlertCircle } from 'react-icons/fi';

const RoleAuthoritiesPage = ({ params: paramsPromise }) => {
  const params = use(paramsPromise);
  const roleSlug = params?.role;

  const { designations } = useContext(Context);
  const [roleData, setRoleData] = useState(null);
  const [authorities, setAuthorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!roleSlug) return;

    const fetchRoleAuthorities = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/authorities/role/${encodeURIComponent(roleSlug)}`);
        if (res.ok) {
          const data = await res.json();
          const payload = data.paylod || data.payload || {};
          setRoleData(payload.designation || null);
          setAuthorities(payload.authorities || []);
        } else {
          const fallbackRes = await fetch(`/api/authorities?role=${encodeURIComponent(roleSlug)}`);
          if (fallbackRes.ok) {
            const fbData = await fallbackRes.json();
            const fbPayload = fbData.paylod || fbData.payload || {};
            const auths = fbPayload.authorities || [];
            setAuthorities(auths);
            if (auths.length > 0) {
              setRoleData({
                title: auths[0].designation_title || roleSlug,
                slug: roleSlug,
                description: null
              });
            }
          } else {
            setError('Failed to load authorities for this role.');
          }
        }
      } catch (err) {
        console.error('Error fetching role authorities:', err);
        setError('An unexpected error occurred while fetching role details.');
      } finally {
        setLoading(false);
      }
    };

    fetchRoleAuthorities();
  }, [roleSlug]);

  const displayTitle = roleData?.title || roleSlug?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Authority Role';

  return (
    <div className="w-full min-h-screen bg-slate-50/60 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500 overflow-x-auto py-1">
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <FiChevronRight className="text-slate-400 shrink-0" />
          <Link href="/authorities" className="hover:text-primary transition-colors">
            Authorities
          </Link>
          <FiChevronRight className="text-slate-400 shrink-0" />
          <span className="text-primary font-bold truncate">{displayTitle}</span>
        </nav>

       
        <div className='w-full'>
          {loading ? (
            <div className="grid grid-cols-1 gap-6">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs animate-pulse flex flex-col sm:flex-row gap-6"
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-3 py-1">
                    <div className="h-5 bg-slate-200 rounded w-1/3" />
                    <div className="h-4 bg-slate-100 rounded w-1/4" />
                    <div className="h-12 bg-slate-100 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-50/60 border border-red-100 rounded-2xl p-8 text-center max-w-lg mx-auto space-y-3">
              <FiAlertCircle className="text-red-500 text-3xl mx-auto" />
              <h3 className="text-base font-bold text-red-900">Unable to Load Role Data</h3>
              <p className="text-xs text-red-600">{error}</p>
              <Link
                href="/authorities"
                className="inline-block px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
              >
                Back to Authorities
              </Link>
            </div>
          ) : authorities.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary-light text-primary border border-primary-light flex items-center justify-center mx-auto text-2xl">
                <FiUsers />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-slate-900">No Members Listed Yet</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                  There are currently no registered authority members under the &quot;{displayTitle}&quot; role. Check back soon or explore other leadership roles.
                </p>
              </div>
              <Link
                href="/authorities"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-all shadow-sm"
              >
                Browse All Authorities
              </Link>
            </div>
          ) : (
            <div className="space-y-6 w-full">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Members ({authorities.length})
                </h2>
              </div>
              <div className="w-full flex-wrap flex items-center justify-center gap-6">
                {authorities.map((member) => (
                  <AuthorityCard key={member.id} authority={member} isRole={false} />
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default RoleAuthoritiesPage;
