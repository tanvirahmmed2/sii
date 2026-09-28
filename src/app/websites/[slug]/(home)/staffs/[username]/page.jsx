'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FiArrowLeft, FiMail, FiUser, FiBriefcase, FiShield,
  FiDroplet, FiGlobe, FiCalendar, FiPhone, FiClock, FiStar, FiMapPin
} from 'react-icons/fi';
import Image from 'next/image';

const StaffPublicProfilePage = () => {
  const params = useParams();
  const { username } = params;

  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/staff/${username}`);
        if (res.ok) {
          const data = await res.json();
          setStaff(data.paylod?.staff || null);
        }
      } catch (err) {
        console.error('Error fetching staff:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [username]);

  const getInitials = (name) =>
    name ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'S';

  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const formatRole = (role) => {
    if (!role) return 'Staff Member';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <div className="w-full min-h-screen bg-slate-50/60 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <Link href="/staffs" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-primary transition-colors bg-white border border-slate-200/80 px-3.5 py-2 rounded-xl shadow-2xs">
            <FiArrowLeft className="text-sm" /> Back to Staff Directory
          </Link>
          {staff?.username && (
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">@{staff.username}</span>
          )}
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-2xs space-y-6 animate-pulse">
            <div className="flex gap-6 items-center">
              <div className="w-24 h-24 bg-slate-200 rounded-3xl shrink-0" />
              <div className="space-y-3 flex-1">
                <div className="h-6 bg-slate-200 rounded w-1/2" />
                <div className="h-4 bg-slate-200 rounded w-1/3" />
              </div>
            </div>
            <div className="h-32 bg-slate-100 rounded-2xl" />
          </div>
        ) : staff ? (
          <div className="space-y-6 animate-fade-up">

            <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-2xs">
              <div className="h-36 bg-linear-to-tr from-primary-dark to-primary-light relative">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
                <div className="absolute top-4 right-5">
                  
                </div>
              </div>

              <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 -mt-14">
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
                  <div className="w-28 h-28 rounded-3xl ring-4 ring-white shadow-lg overflow-hidden shrink-0">
                    {staff.image ? (
                      <Image width={400} height={400} src={staff.image} alt={staff.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-linear-to-tr from-primary-light to-primary-dark text-white flex items-center justify-center text-3xl font-bold">
                        {getInitials(staff.name)}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 mb-1">
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">{staff.name}</h1>
                    <p className="text-xs text-slate-500 font-medium flex items-center justify-center sm:justify-start gap-1.5">
                      <FiBriefcase className="text-emerald-500 text-xs" /> {formatRole(staff.role)}
                    </p>
                    {staff.bio && <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">{staff.bio}</p>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 text-xs font-medium">
                  {staff.email && (
                    <a href={`mailto:${staff.email}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-white hover:border-emerald-500 transition-all text-slate-700">
                      <FiMail className="text-emerald-500" /> {staff.email}
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: FiDroplet, label: 'Blood Group', value: staff.blood_group },
                { icon: FiGlobe, label: 'Nationality', value: staff.nationality },
                { icon: FiCalendar, label: 'Date of Birth', value: staff.date_of_birth ? new Date(staff.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null },
                { icon: FiUser, label: 'Gender', value: staff.gender },
              ].filter(item => item.value).map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="text-emerald-500 text-xs" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{value}</p>
                </div>
              ))}
            </div>

            {/* Experience */}
            {staff.experiences?.length > 0 && (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-4">
                <div className="flex items-center pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <FiStar className="text-emerald-500 text-base" /> Work Experience ({staff.experiences.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {staff.experiences.map((exp) => (
                    <div key={exp.id} className="p-4 bg-slate-50/70 border border-slate-200/70 rounded-2xl hover:bg-white transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5 flex-1">
                          <h3 className="font-bold text-slate-800 text-xs">{exp.title}</h3>
                          <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                            <FiBriefcase className="text-[10px]" /> {exp.organization}
                          </p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                            <FiClock className="text-[10px]" />
                            {formatDate(exp.start_date)} – {exp.is_current ? <span className="text-emerald-500 font-semibold">Present</span> : formatDate(exp.end_date)}
                          </p>
                          {exp.description && <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{exp.description}</p>}
                        </div>
                        {exp.is_current && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-bold rounded-full shrink-0">Current</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center max-w-md mx-auto shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
              <FiUser />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Staff Profile Not Found</h3>
            <p className="text-xs text-slate-400">The requested staff profile does not exist or has been deactivated.</p>
            <Link href="/staffs" className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:underline mt-2">
              <FiArrowLeft className="text-xs" /> View Staff Directory
            </Link>
          </div>
        )}

      </div>
    </div>
  );
};

export default StaffPublicProfilePage;
