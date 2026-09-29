'use client';

import React, { useContext } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiRefreshCw, FiArrowRight } from 'react-icons/fi';
import { TenantWebsiteContext } from '../helper/WebsiteContext';

const Back = () => {
  const router = useRouter();
  const tenantContext = useContext(TenantWebsiteContext);

  const handleBack = () => {
    if (tenantContext?.goBack) {
      tenantContext.goBack();
    } else {
      router.back();
    }
  };

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    } else {
      router.refresh();
    }
  };

  const handleNext = () => {
    router.forward();
  };

  return (
    <div className="grid grid-cols-3 gap-1.5 w-full mb-1">
      <button
        type="button"
        onClick={handleBack}
        className="flex items-center justify-center gap-1 px-2 py-2 bg-secondary text-primary hover:bg-primary-light border border-secondary/30 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-2xs group"
        title="Go Back"
      >
        <FiArrowLeft className="text-xs group-hover:-translate-x-0.5 transition-transform" />
        <span>Back</span>
      </button>

      <button
        type="button"
        onClick={handleReload}
        className="flex items-center justify-center gap-1 px-2 py-2 bg-secondary text-primary hover:bg-primary-light border border-secondary/30 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-2xs group"
        title="Reload Page"
      >
        <FiRefreshCw className="text-xs group-hover:rotate-180 transition-transform duration-300" />
        <span>Reload</span>
      </button>

      <button
        type="button"
        onClick={handleNext}
        className="flex items-center justify-center gap-1 px-2 py-2 bg-secondary text-primary hover:bg-primary-light border border-secondary/30 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-2xs group"
        title="Go Forward"
      >
        <span>Next</span>
        <FiArrowRight className="text-xs group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
};

export default Back;