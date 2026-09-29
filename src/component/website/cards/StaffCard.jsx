'use client';

import React from 'react';
import Link from 'next/link';
import { FiUser, FiMail, FiPhone, FiMapPin, FiShield } from 'react-icons/fi';
import Image from 'next/image';

const StaffCard = ({ staff, className = '' }) => {
  const formatRole = (role) => {
    if (!role) return 'Staff Member';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <Link
      href={`/staffs/${staff.username}`}
      className={`group bg-white rounded-xl items-center w-full max-w-70 justify-center flex-col border border-slate-100 hover:border-primary hover:shadow-md transition-all duration-250 overflow-hidden flex ${className}`}
    >
      <div className="w-full  aspect-square shrink-0 relative  overflow-hidden flex items-center justify-center">
        {staff.image ? (
          <Image width={500} height={500}
            src={staff.image}
            alt={staff.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-4">
            <div className="w-20 h-20 rounded-full bg-white border border-primary-light flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-xs">
              <FiUser className="text-primary text-3xl" />
            </div>
          </div>
        )}
      </div>

      <div className="w-full items-center p-5 flex flex-col justify-center gap-2">



        <h4 className="text-base font-semibold text-slate-900 group-hover:text-primary transition-colors leading-tight truncate">
          {staff.name}
        </h4>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-primary-light text-secondary border border-primary-light uppercase tracking-wider">

            {formatRole(staff.role)}
          </span>
        </div>
        {staff.email && (
            <div className="flex items-center gap-1.5 truncate text-xs">
              <FiMail className="text-slate-400 shrink-0 text-xs" />
              <span className="truncate">{staff.email}</span>
            </div>
          )}
      </div>
    </Link>
  );
};

export default StaffCard;
