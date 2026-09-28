'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiAward, FiArrowLeft } from 'react-icons/fi';
import RecognitionCard from '@/component/cards/RecognitionCard';

const RecognitionsPage = () => {
  const [recognitions, setRecognitions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecognitions = async () => {
      try {
        const res = await fetch('/api/recognitions');
        if (res.ok) {
          const data = await res.json();
          const list = data.paylod?.recognitions || data.payload?.recognitions || data.recognitions || [];
          setRecognitions(list);
        }
      } catch (err) {
        console.error('Error fetching recognitions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecognitions();
  }, []);

  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors mb-8"
        >
          <FiArrowLeft />
          Back to Home
        </Link>

        <div className="text-center mb-12">
         
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">
            All Recognitions
          </h1>
          <p className="text-slate-500 mt-3 max-w-xl mx-auto text-sm">
            A full record of honours and awards received by our institution.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recognitions.length > 0 ? (
          <div className="w-full flex flex-wrap items-center justify-center gap-4">
            {recognitions.map((item) => (
              <RecognitionCard key={item.id} recognition={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto text-2xl mb-4">
              <FiAward />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">No recognitions recorded yet</h3>
            <p className="text-slate-500 text-sm mt-1">Check back later for updates.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecognitionsPage;
