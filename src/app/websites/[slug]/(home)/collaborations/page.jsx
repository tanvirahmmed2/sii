'use client';

import React, { useEffect, useState } from 'react';
import { FiUsers, FiBriefcase } from 'react-icons/fi';

const CollaborationsPage = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCollaborations = async () => {
      try {
        const res = await fetch('/api/collaborations');
        if (res.ok) {
          const data = await res.json();
          setPartners(data.paylod.collaborations || []);
        }
      } catch (err) {
        console.error('Error fetching collaborations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCollaborations();
  }, []);

  const gradients = [
    'bg-primary text-secondary',
    'from-blue-500 to-sky-650',
    'from-orange-500 to-amber-600',
    'from-emerald-500 to-teal-650',
  ];

  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-primary bg-primary-light px-3 py-1 rounded-full uppercase tracking-widest">
            Global Network
          </span>
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-3 tracking-tight">
            Our Collaborations
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl mx-auto text-sm md:text-base">
            We partner with leading universities, tech giants, and global research institutions to offer world-class exposure to our faculty and students.
          </p>
        </div>

        {/* Dynamic Partner Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-semibold text-slate-400">Loading collaborations...</span>
          </div>
        ) : partners.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 animate-fade-up">
            {partners.map((partner, idx) => {
              const color = gradients[idx % gradients.length];
              return (
                <div
                  key={partner.id}
                  className="bg-white rounded-3xl border border-slate-100 hover:border-primary-light hover:shadow-lg transition-all duration-300 p-8 flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Visual gradient accent on hover */}
                  <div className={`absolute top-0 left-0 w-2 h-full bg-primary ${color} opacity-80`}></div>

                  <div className="flex gap-5 items-start pl-2">
                    {partner.logo ? (
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 p-2 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                        <img src={partner.logo} alt={partner.institution_name} className="max-w-full max-h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-primary-light text-primary flex items-center justify-center text-2xl shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                        <FiBriefcase />
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5 w-full">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                        Academic Partner
                      </span>
                      <h3 className="font-semibold text-slate-900 text-lg group-hover:text-primary transition-colors">
                        {partner.institution_name}
                      </h3>
                      
                      <div
                        className="text-slate-500 text-xs md:text-sm leading-relaxed mt-2.5 tiptap-content"
                        dangerouslySetInnerHTML={{ __html: partner.description || '' }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl p-8 mb-12 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto text-2xl mb-4">
              <FiBriefcase />
            </div>
            <h3 className="font-semibold text-slate-800 text-lg">No collaborations to display</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
              We are currently finalizing our network partnerships. Please check back later.
            </p>
          </div>
        )}

        {/* Global Network Section */}
        <div className="bg-primaryr from-slate-900 to-sky-950 text-white rounded-3xl p-8 md:p-12 text-center flex flex-col items-center gap-6 relative overflow-hidden shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent"></div>
          <div className="flex flex-col gap-3 relative z-10">
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight">
              Interested in Partnering with FIT?
            </h2>
            <p className="text-secondary text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
              We are constantly seeking innovative researchers, corporate trainers, and universities to join our collaborative networks. Contact our external relations office to initiate joint ventures.
            </p>
          </div>
          <a
            href="mailto:collaborations@fit.edu.bd"
            className="inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-semibold px-6 py-3 rounded-xl shadow-md hover:scale-[1.02] transition-all relative z-10 text-sm"
          >
            <FiUsers />
            <span>Connect with External Relations</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default CollaborationsPage;
