'use client';

import React, { useEffect, useState, useContext } from 'react';
import { Context } from '@/component/helper/Context';
import AuthorityCard from '@/component/cards/AuthorityCard';
import { FiUsers, FiAward, FiBriefcase } from 'react-icons/fi';

const AuthoritiesPage = () => {
  const { designations: contextDesignations } = useContext(Context);

  const [authorities, setAuthorities] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all authority members
        const authRes = await fetch('/api/authorities');
        if (authRes.ok) {
          const authData = await authRes.json();
          const payload = authData.paylod || authData.payload || {};
          setAuthorities(payload.authorities || []);
        }

        if (contextDesignations && contextDesignations.length > 0) {
          setDesignations(contextDesignations);
        } else {
          const desRes = await fetch('/api/authorities/designations');
          if (desRes.ok) {
            const desData = await desRes.json();
            const desPayload = desData.paylod || desData.payload || {};
            setDesignations(desPayload.designations || []);
          }
        }
      } catch (err) {
        console.error('Error fetching authority data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [contextDesignations]);

  const isHeadFlag = (val) => val === true || val === 'true' || val === 1 || val === '1';

  const sortedDesignations = [...designations].sort((a, b) => {
    if (isHeadFlag(a.is_head) && !isHeadFlag(b.is_head)) return -1;
    if (!isHeadFlag(a.is_head) && isHeadFlag(b.is_head)) return 1;
    return (a.id || 0) - (b.id || 0);
  });

  const designationGroups = sortedDesignations
    .map((des) => {
      const members = authorities.filter(
        (a) =>
          a.designation_id === des.id ||
          (a.designation || '').toLowerCase() === (des.slug || '').toLowerCase() ||
          (a.designation_title || '').toLowerCase() === (des.title || '').toLowerCase()
      );
      return { designation: des, members };
    })
    .filter((group) => group.members.length > 0);

  const groupedAuthIds = new Set(
    designationGroups.flatMap((g) => g.members.map((m) => m.id))
  );

  const remainingAuthorities = authorities.filter((a) => !groupedAuthIds.has(a.id));

  const remainingGroupsMap = {};
  remainingAuthorities.forEach((a) => {
    const title = a.designation_title || a.designation || 'Other Authorities';
    if (!remainingGroupsMap[title]) {
      remainingGroupsMap[title] = [];
    }
    remainingGroupsMap[title].push(a);
  });

  const remainingGroups = Object.keys(remainingGroupsMap).map((title) => ({
    designation: { id: title, title, description: null, is_head: false },
    members: remainingGroupsMap[title],
  }));

  const allGroups = [...designationGroups, ...remainingGroups];
  const hasAuthorities = allGroups.some((g) => g.members.length > 0);

  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full space-y-10">
        
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Governance &amp; Authorities
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
            Institutional leadership profiles and departmental governance directories.
          </p>
        </div>

        {loading ? (
          <div className="space-y-8">
            {[1, 2].map((n) => (
              <div key={n} className="space-y-4">
                <div className="h-6 bg-slate-200 rounded w-48 animate-pulse" />
                <div className="flex flex-wrap justify-center items-center gap-6">
                  <div className="w-80 h-96 bg-white rounded-xl border border-slate-100 animate-pulse" />
                  <div className="w-80 h-96 bg-white rounded-xl border border-slate-100 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : hasAuthorities ? (
          <div className="space-y-12 w-full">
            {allGroups.map(({ designation, members }) => (
              <div key={designation.id || designation.title} className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                  <div className="flex items-center gap-2.5">
                    {isHeadFlag(designation.is_head) ? (
                      <FiAward className="text-primary text-lg shrink-0" />
                    ) : (
                      <FiBriefcase className="text-primary text-base shrink-0" />
                    )}
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-wide">
                        {designation.title}
                      </h2>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full shrink-0">
                    {members.length} {members.length === 1 ? 'member' : 'members'}
                  </span>
                </div>

                <div className="w-full flex flex-wrap justify-center items-center gap-6">
                  {members.map((member) => (
                    <AuthorityCard key={member.id} authority={member} isRole={false} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center space-y-3">
            <FiUsers className="text-slate-300 text-3xl mx-auto" />
            <h3 className="text-sm font-semibold text-slate-700">No Authority Profiles Available</h3>
            <p className="text-xs text-slate-500">
              There are currently no leadership or governance profiles listed.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default AuthoritiesPage;
