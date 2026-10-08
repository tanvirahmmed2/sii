'use client';

import React, { useEffect, useState, useRef, useContext } from 'react';
import Link from 'next/link';
import RecognitionCard from 'src/component/website/cards/RecognitionCard';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const Recognition = () => {
  const { tenantUrl, getApiEndpoint } = useContext(TenantWebsiteContext);
  const [recognitions, setRecognitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const sliderRef = useRef(null);

  useEffect(() => {
    const fetchRecognitions = async () => {
      try {
        const res = await fetch(getApiEndpoint('recognitions'));
        if (res.ok) {
          const data = await res.json();
          const list =
            data.payload?.recognitions ||
            data.paylod?.recognitions ||
            data.recognitions ||
            [];
          setRecognitions(list);
        }
      } catch (err) {
        console.error('Error fetching recognitions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecognitions();
  }, [getApiEndpoint]);

  const handleScroll = (direction) => {
    if (sliderRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (loading) return null;
  if (recognitions.length === 0) return null;

  return (
    <section className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
              Accreditations &amp; Honors
            </span>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Institutional Recognitions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Honors, academic awards, and regulatory certifications achieved by our campus.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Previous recognitions"
            >
              &larr; Prev
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Next recognitions"
            >
              Next &rarr;
            </button>
            <Link
              href={tenantUrl('/recognitions')}
              className="px-3 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
            >
              View All ({recognitions.length})
            </Link>
          </div>
        </div>

        <div
          ref={sliderRef}
          className="flex items-stretch gap-4 overflow-x-auto pb-2 scroll-smooth"
        >
          {recognitions.map((item) => (
            <div key={item.id} className="w-56 shrink-0">
              <RecognitionCard recognition={item} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Recognition;