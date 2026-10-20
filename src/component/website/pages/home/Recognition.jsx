'use client';

import React, { useEffect, useState, useRef, useContext } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
    <section className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-16 px-4 sm:px-6 lg:px-8 transition-colors overflow-hidden">
      <div className="w-full max-w-6xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5"
        >
          <div>
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-primary block">
              Accreditations &amp; Honors
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight mt-1">
              Institutional Recognitions
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Honors, academic awards, and regulatory certifications achieved by our campus.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => handleScroll('left')}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-primary hover:text-primary transition-colors cursor-pointer shadow-xs"
              aria-label="Previous recognitions"
            >
              &larr; Prev
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => handleScroll('right')}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-primary hover:text-primary transition-colors cursor-pointer shadow-xs"
              aria-label="Next recognitions"
            >
              Next &rarr;
            </motion.button>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Link
                href={tenantUrl('/recognitions')}
                className="inline-block px-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 hover:border-primary text-slate-800 dark:text-slate-200 hover:text-primary font-semibold transition-colors shadow-xs"
              >
                View All ({recognitions.length})
              </Link>
            </motion.div>
          </div>
        </motion.div>

        <div
          ref={sliderRef}
          className="flex items-stretch gap-5 overflow-x-auto pb-4 scroll-smooth"
        >
          {recognitions.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.3) }}
              className="w-64 shrink-0"
            >
              <RecognitionCard recognition={item} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Recognition;