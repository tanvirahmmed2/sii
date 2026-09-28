'use client';

import React, { useEffect, useState } from 'react';
import { FiUsers, FiAward } from 'react-icons/fi';
import AuthorityCard from '@/component/cards/AuthorityCard';

const AdministrationPage = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuthorities = async () => {
      try {
        const res = await fetch('/api/authorities');
        if (res.ok) {
          const data = await res.json();
          const list = data.payload?.authorities || data.paylod?.authorities || [];
          setMembers(list);
        }
      } catch (err) {
        console.error('Failed to fetch authorities in AdministrationPage:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAuthorities();
  }, []);

  // Filter ONLY Chairman and Principal roles
  const filteredMembers = members.filter((m) => {
    const slug = (m.designation || '').toLowerCase();
    const title = (m.designation_title || '').toLowerCase();
    return (
      slug.includes('chairman') ||
      slug.includes('principal') ||
      title.includes('chairman') ||
      title.includes('principal')
    );
  });

  const chairmanMembers = filteredMembers.filter((m) => {
    const slug = (m.designation || '').toLowerCase();
    const title = (m.designation_title || '').toLowerCase();
    return slug.includes('chairman') || title.includes('chairman');
  });

  const principalMembers = filteredMembers.filter((m) => {
    const slug = (m.designation || '').toLowerCase();
    const title = (m.designation_title || '').toLowerCase();
    return (
      (slug.includes('principal') || title.includes('principal')) &&
      !slug.includes('chairman') &&
      !title.includes('chairman')
    );
  });

  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-12">

        <div className="text-center">
          
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-3 tracking-tight">
            Executive Leadership & Administration
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl mx-auto text-xs sm:text-sm md:text-base leading-relaxed">
            Leading the academic vision, institutional governance, and administrative direction.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-wrap justify-center gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white w-80 h-96 rounded-xl border border-slate-100 p-4 animate-pulse flex flex-col gap-4">
                <div className="w-full aspect-square bg-slate-200 rounded-lg"></div>
                <div className="w-3/4 h-5 bg-slate-200 rounded"></div>
                <div className="w-1/2 h-4 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="w-full text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-xs flex flex-col items-center justify-center gap-3">
            <FiUsers className="text-4xl text-slate-300" />
            <p className="text-sm font-semibold text-slate-500">No Chairman or Principal authorities listed yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-12">
            {/* Chairman Section */}
            {chairmanMembers.length > 0 && (
              <div className="flex flex-col items-center gap-6">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 w-full justify-center">
                  <FiAward className="text-xl text-primary" />
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">Chairman</h2>
                </div>
                <div className="flex flex-wrap justify-center gap-8 w-full">
                  {chairmanMembers.map((member) => (
                    <AuthorityCard key={member.id} authority={member} />
                  ))}
                </div>
              </div>
            )}

            {/* Principal Section */}
            {principalMembers.length > 0 && (
              <div className="flex flex-col items-center gap-6">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 w-full justify-center">
                  <FiUsers className="text-xl text-primary" />
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">Principal Leadership</h2>
                </div>
                <div className="flex flex-wrap justify-center gap-8 w-full">
                  {principalMembers.map((member) => (
                    <AuthorityCard key={member.id} authority={member} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdministrationPage;