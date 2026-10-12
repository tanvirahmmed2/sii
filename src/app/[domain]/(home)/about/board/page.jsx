/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { FiUsers, FiExternalLink, FiShield } from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import Loader from 'src/component/common/Loader';

const BoardMembersPage = () => {
  const { website, tenantUrl, getApiEndpoint } = useContext(TenantWebsiteContext);
  const schoolName = website?.name || 'Our Institution';

  const [boardMembers, setBoardMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const fetchBoard = async () => {
      try {
        const endpoint = getApiEndpoint('home/institutional?type=board_members');
        const res = await fetch(endpoint);
        if (!ignore && res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.board_members)) {
            setBoardMembers(data.board_members);
          }
        }
      } catch (err) {
        console.error('Error fetching board members:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchBoard();
    return () => {
      ignore = true;
    };
  }, [getApiEndpoint]);

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={tenantUrl('/about')}
              className="text-xs text-primary font-medium hover:underline"
            >
              ← Back to About
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Governing Body & Board of Members
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Distinguished leadership, trustees, and governing executives steering the academic,
            ethical, and strategic advancement of {schoolName}.
          </p>
        </div>

        {/* Governance Charter Notice */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 flex items-start gap-3 shadow-xs">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
            <FiShield className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
              Institutional Governance Framework
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              The Governing Body ensures institutional integrity, adherence to academic standards,
              fiscal responsibility, and long-term sustainability in coordination with government
              education directives and stakeholder goals.
            </p>
          </div>
        </div>

        {/* Board Members Grid */}
        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-16 flex flex-col items-center justify-center gap-3">
            <Loader />
            <span className="text-xs text-slate-500 dark:text-slate-400 animate-pulse">
              Loading board member profiles...
            </span>
          </div>
        ) : boardMembers.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <FiUsers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No Board Members Published Yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Governing board members and trustees will appear here as they are published by the
              administration.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {boardMembers.map((member, idx) => (
              <div
                key={member.id || idx}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                <div className="flex items-start gap-4">
                  {/* Portrait */}
                  {member.image ? (
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-primary/20 bg-slate-100 dark:bg-slate-800 shrink-0">
                      <img
                        src={member.image}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                      <FiUsers className="w-7 h-7" />
                    </div>
                  )}

                  {/* Name & Designation */}
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400">
                        #{member.order_no ?? idx + 1}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 truncate">
                        {member.designation}
                      </span>
                    </div>

                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                      {member.title ? `${member.title} ` : ''}
                      {member.name}
                    </h2>
                  </div>
                </div>

                {/* Biography */}
                {member.bio && (
                  <div
                    className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed prose dark:prose-invert max-w-none border-t border-slate-100 dark:border-slate-800/80 pt-3"
                    dangerouslySetInnerHTML={{ __html: member.bio }}
                  />
                )}

                {/* Image Link if present */}
                {member.image && (
                  <div className="flex justify-end pt-1">
                    <a
                      href={member.image}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-primary transition"
                    >
                      <FiExternalLink className="w-3 h-3" />
                      <span>View Official Photo</span>
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardMembersPage;
