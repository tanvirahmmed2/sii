'use client';

import React from 'react';
import Link from 'next/link';
import { FiUser, FiArrowRight, FiBriefcase } from 'react-icons/fi';
import Image from 'next/image';

const TeacherCard = ({ teacher, className = '' }) => {
  return (
    <Link
          href={`/teachers/${teacher.username}`}
      className={`group bg-primary w-full rounded-xl flex-col  shadow-sm hover:shadow-md transition-all duration-250 overflow-hidden flex ${className}`}
    >
      <div className="w-full shrink-0 relative rounded-xl overflow-hidden">
        {teacher.image ? (
          <Image width={500} height={500}
            src={teacher.image}
            alt={teacher.name}
            className="w-full h-full object-cover aspect-square  transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-full aspect-square  bg-white  flex items-center justify-center transition-transform duration-300">
              <FiUser className="text-primary text-3xl" />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 p-5 flex flex-col justify-center items-center gap-2">
      
        <h4 className="text-base font-semibold text-secondary transition-colors leading-tight truncate">
          {teacher.name}
        </h4>

        <span className="flex items-center gap-1 ">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-primary-light text-secondary border border-primary-light uppercase tracking-wider">{teacher.designation || 'Faculty Member'}</span>
        </span>

        
       
      </div>
    </Link>
  );
};

export default TeacherCard;
