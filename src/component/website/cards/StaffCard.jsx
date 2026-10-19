'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const StaffCard = ({ staff, className = '' }) => {
  const { tenantUrl } = useTenantWebsite();
  if (!staff) return null;

  const formatRole = (role) => {
    if (!role) return 'Staff Member';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const targetUrl = tenantUrl(`/staffs/${staff.username || staff.id}`);

  return (
    <motion.div
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="h-full"
    >
      <Link
        href={targetUrl}
        className={`group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 transition-colors duration-200 flex flex-col overflow-hidden h-full ${className}`}
      >
      <div className="w-full aspect-square bg-slate-100 dark:bg-slate-800 relative overflow-hidden flex items-center justify-center">
        {staff.image ? (
          <Image
            src={staff.image}
            alt={staff.name}
            width={400}
            height={400}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            unoptimized={staff.image.startsWith('http')}
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary border border-primary/20 text-base font-bold flex items-center justify-center">
            {staff.name?.charAt(0) || 'S'}
          </div>
        )}
      </div>

      <div className="p-3.5 flex flex-col gap-1.5 text-center items-center">
        <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate w-full group-hover:text-primary transition-colors">
          {staff.name}
        </h4>
        <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 uppercase tracking-wider truncate max-w-full">
          {formatRole(staff.role || staff.designation)}
        </span>
        {staff.email && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-full">
            {staff.email}
          </span>
        )}
      </div>
      </Link>
    </motion.div>
  );
};

export default StaffCard;
