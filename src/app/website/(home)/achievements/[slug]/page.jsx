'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FiArrowLeft, FiAward, FiStar } from 'react-icons/fi';

const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
};

const AchievementDetailPage = () => {
  const { slug } = useParams();
  const [achievement, setAchievement] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievement = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/achievements/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setAchievement(data.paylod?.achievement || null);
        }
      } catch (err) {
        console.error('Error fetching achievement:', err);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchAchievement();
  }, [slug]);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-slate-50/50 py-16 px-4 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 text-xs font-semibold">Loading achievement details...</p>
        </div>
      </div>
    );
  }

  if (!achievement) {
    return (
      <div className="w-full min-h-screen bg-slate-50/50 py-16 px-4">
        <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-slate-100 shadow-xs text-center space-y-4">
          <FiAward className="text-4xl text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Achievement Not Found</h2>
          <p className="text-slate-500 text-xs">The milestone or award record could not be found.</p>
          <Link
            href="/achievements"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all"
          >
            <FiArrowLeft /> Back to Achievements
          </Link>
        </div>
      </div>
    );
  }

  const coverImage = achievement.image_url || achievement.image;

  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation */}
        <div>
          <Link
            href="/achievements"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <FiArrowLeft />
            <span>Back to Achievements List</span>
          </Link>
        </div>

        {/* Achievement Card Detail */}
        <article className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
          {coverImage && (
            <div className="w-full h-64 md:h-96 bg-slate-100 overflow-hidden relative">
              <img
                src={coverImage}
                alt={achievement.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6 md:p-10 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-primary bg-primary-light px-3 py-1 rounded-full uppercase tracking-wider w-fit">
                <FiAward className="text-sm" /> Campus Milestone
              </div>
              <h1 className="text-2xl md:text-4xl font-semibold text-slate-900 tracking-tight leading-snug">
                {achievement.title}
              </h1>
            </div>

            <div className="prose prose-slate max-w-none text-slate-700 text-sm md:text-base leading-relaxed whitespace-pre-wrap border-t border-slate-100 pt-6">
              {stripHtml(achievement.description)}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

export default AchievementDetailPage;
