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
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-slate-200/80 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href={tenantUrl('/about')}
              className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              ← Back to About
            </Link>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-slate-900 dark:text-white tracking-tight">
            Governing Body & Board of Members
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Distinguished leadership, trustees, and governing executives steering the academic,
            ethical, and strategic advancement of {schoolName}.
          </p>
        </div>

        {/* Governance Charter Notice */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 flex items-start gap-4 shadow-xs">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5 border border-primary/20">
            <FiShield className="w-5 h-5" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-serif text-base font-semibold text-slate-900 dark:text-white">
              Institutional Governance Framework
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              The Governing Body ensures institutional integrity, adherence to academic standards,
              fiscal responsibility, and long-term sustainability in coordination with government
              education directives and stakeholder goals.
            </p>
          </div>
        </div>

        {/* Board Members Grid */}
        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-16 flex flex-col items-center justify-center gap-3 shadow-xs">
            <Loader />
            <span className="text-xs text-slate-500 dark:text-slate-400 animate-pulse">
              Loading board member profiles...
            </span>
          </div>
        ) : boardMembers.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center space-y-2 shadow-xs">
            <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <FiUsers className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-base font-semibold text-slate-900 dark:text-white">
              No Board Members Published Yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Governing board members and trustees will appear here as they are published by the
              administration.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {boardMembers.map((member, idx) => (
              <div
                key={member.id || idx}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300"
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
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-primary/20 bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <FiUsers className="w-7 h-7" />
                    </div>
                  )}

                  {/* Name & Designation */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400">
                        #{member.order_no ?? idx + 1}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 truncate">
                        {member.designation}
                      </span>
                    </div>

                    <h2 className="font-serif text-base sm:text-lg font-semibold text-slate-900 dark:text-white truncate">
                      {member.title ? `${member.title} ` : ''}
                      {member.name}
                    </h2>
                  </div>
                </div>

                {/* Biography */}
                {member.bio && (
                  <div
                    className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed prose dark:prose-invert max-w-none border-t border-slate-100 dark:border-slate-800/80 pt-3"
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
                      className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary transition"
                    >
                      <FiExternalLink className="w-3.5 h-3.5" />
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
