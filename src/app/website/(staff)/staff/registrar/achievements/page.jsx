'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiPlus, FiAward, FiCalendar, FiExternalLink, FiImage, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import AchievementCreateForm from '@/component/forms/AchievementCreateForm';

const RegistrarAchievementPage = () => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchAchievements = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/achievements');
      if (res.ok) {
        const data = await res.json();
        setAchievements(data.paylod?.achievements || []);
      }
    } catch (err) {
      console.error('Error fetching achievements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, []);

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-primary bg-primary-light px-3 py-1 rounded-full uppercase tracking-widest border border-primary-light">
            Registrar Panel
          </span>
          <h1 className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
            Campus Achievements
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Publish official academic certificates, sports trophies, and recognitions awarded to campus or students.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-xs cursor-pointer"
        >
          {showAddForm ? (
            <>
              <FiX className="text-lg" /> Cancel
            </>
          ) : (
            <>
              <FiPlus className="text-lg" /> Add Achievement
            </>
          )}
        </button>
      </div>

      {/* Inline Create Form */}
      {showAddForm && (
        <div className="bg-white border border-primary-light rounded-2xl p-6 shadow-xs">
          <AchievementCreateForm
            onSuccess={() => {
              setShowAddForm(false);
              toast.success('Achievement published!');
              fetchAchievements();
            }}
          />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : achievements.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {achievements.map((item) => {
            const coverImage = item.image_url || item.image;
            const itemDate = item.created_at ? new Date(item.created_at) : null;

            return (
              <div
                key={item.id}
                className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs hover:border-primary-light hover:shadow-md transition-all flex flex-col justify-between group"
              >
                {coverImage ? (
                  <div className="w-full h-44 bg-slate-100 overflow-hidden relative">
                    <img
                      src={coverImage}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="w-full h-32 bg-primary-light flex items-center justify-center text-primary">
                    <FiAward className="text-4xl" />
                  </div>
                )}

                <div className="p-5 flex flex-col gap-2 flex-1">
                  {itemDate && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <FiCalendar className="text-xs text-primary" />
                      <span>{itemDate.toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                    </div>
                  )}

                  <h3 className="font-semibold text-slate-900 text-base leading-snug group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-slate-500 text-xs leading-relaxed line-clamp-3">
                    {item.description}
                  </p>
                </div>

                <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href={`/achievements/${item.slug || item.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary"
                  >
                    <span>View Public Page</span>
                    <FiExternalLink />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center max-w-md mx-auto shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto text-xl mb-4">
            <FiAward />
          </div>
          <h3 className="font-bold text-slate-800 text-base">No achievements found</h3>
          <p className="text-slate-500 text-xs mt-1">
            Click &quot;Add Achievement&quot; above to record a new institutional honor.
          </p>
        </div>
      )}
    </div>
  );
};

export default RegistrarAchievementPage;
