'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  BiTag,
  BiCheck,
  BiCopy,
  BiChevronLeft,
  BiChevronRight,
  BiTime,
  BiRightArrowAlt,
  BiStar,
} from 'react-icons/bi';

export default function HomePromos() {
  const [promos, setPromos] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [copiedCode, setCopiedCode] = useState<string>('');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    fetch('/api/marketing/promos')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.promos)) {
          setPromos(data.promos);
        }
      })
      .catch(() => setPromos([]));
  }, []);

  useEffect(() => {
    if (promos.length <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % promos.length);
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [promos.length, isPaused]);

  if (promos.length === 0) return null;

  const handleCopy = (code: string) => {
    if (!code) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 3000);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? promos.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % promos.length);
  };

  const isMulti = promos.length > 1;

  return (
    <section
      className="w-full relative overflow-hidden bg-slate-950 text-white select-text border-y border-slate-800/80 shadow-inner"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary/20 via-slate-950 to-slate-950 pointer-events-none" />

      <div
        className="w-full flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {promos.map((promo: any) => {
          const formattedDate = promo.ending_date
            ? new Date(promo.ending_date).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : null;

          return (
            <div
              key={promo.id}
              className="w-full shrink-0 grow-0 basis-full py-8 sm:py-10 px-4 sm:px-8 flex items-center justify-center"
            >
              <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-left">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-linear-to-br from-secondary to-amber-500 p-0.5 shadow-lg shadow-secondary/25 shrink-0 flex items-center justify-center">
                    <div className="w-full h-full bg-slate-950 rounded-[14px] flex flex-col items-center justify-center text-center p-1">
                      <span className="text-xl sm:text-2xl font-black font-mono text-secondary leading-none">
                        {promo.discount_percentage}%
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                        OFF
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary/20 text-secondary border border-secondary/30">
                        <BiStar className="text-xs" />
                        <span>Public Promotion</span>
                      </span>
                      {formattedDate && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <BiTime className="text-xs" />
                          <span>Valid through {formattedDate}</span>
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                      {promo.name}
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
                      {promo.description ||
                        `Get ${promo.discount_percentage}% discount on our subscription packages with code ${promo.code}.`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
                  <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 w-full sm:w-auto">
                    <div className="flex items-center gap-1.5">
                      <BiTag className="text-secondary text-sm" />
                      <span className="font-mono font-black text-white text-sm sm:text-base tracking-wider uppercase">
                        {promo.code}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(promo.code)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                    >
                      {copiedCode === promo.code ? (
                        <>
                          <BiCheck className="text-emerald-400 text-sm" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <BiCopy className="text-xs" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <Link
                    href={`/packages?promo=${encodeURIComponent(promo.code)}`}
                    className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-linear-to-r from-secondary to-amber-600 hover:from-secondary-dark hover:to-amber-700 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-secondary/20 cursor-pointer w-full sm:w-auto"
                  >
                    <span>Claim Deal</span>
                    <BiRightArrowAlt className="text-base" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isMulti && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 transition cursor-pointer z-20 shadow-md"
            aria-label="Previous promo slide"
          >
            <BiChevronLeft className="text-lg" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 transition cursor-pointer z-20 shadow-md"
            aria-label="Next promo slide"
          >
            <BiChevronRight className="text-lg" />
          </button>

          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
            {promos.map((_: any, idx: number) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  currentIndex === idx
                    ? 'w-6 bg-secondary'
                    : 'w-1.5 bg-slate-700 hover:bg-slate-500'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
