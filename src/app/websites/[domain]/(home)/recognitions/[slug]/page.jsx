'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FiAward, FiCalendar, FiUser, FiArrowLeft } from 'react-icons/fi';
import RichTextDisplay from '@/component/helper/RichTextDisplay';
import Image from 'next/image';

const RecognitionDetailPage = () => {
  const { slug } = useParams();
  const [recognition, setRecognition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const fetchRecognition = async () => {
      try {
        const res = await fetch(`/api/recognitions/by-slug/${slug}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setRecognition(data.paylod.recognition);
        }
      } catch (err) {
        console.error('Error fetching recognition:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchRecognition();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !recognition) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50/50 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-3xl mb-4">
          <FiAward />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Recognition Not Found</h1>
        <p className="text-slate-500 text-sm mt-2">This recognition may have been removed or the link is invalid.</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary transition-colors"
        >
          <FiArrowLeft />
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors mb-8"
        >
          <FiArrowLeft />
          Back to Home
        </Link>

        <div className=" overflow-hidden ">
          
          {recognition.image ? (
            <div className="w-full overflow-hidden bg-slate-100">
              <Image width={1000} height={1000}
                src={recognition.image}
                alt={recognition.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-full h-48 bg-primaryr from-amber-50 to-sky-50 flex items-center justify-center">
              <FiAward className="text-6xl text-amber-300" />
            </div>
          )}

          <div className="p-4">
            
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight leading-tight mb-5">
              {recognition.name}
            </h1>

            <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-500 mb-6">
              <span className="flex items-center gap-1.5">
                <FiUser className="text-primary" />
                Awarded by <strong className="text-slate-700 ml-1">{recognition.awarded_by}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <FiCalendar className="text-primary" />
                {new Date(recognition.date).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>

            {/* Description */}
            {recognition.description && (
              <RichTextDisplay html={recognition.description} className="text-sm text-slate-600" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecognitionDetailPage;
