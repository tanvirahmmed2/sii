'use client';

import React, { useEffect, useState } from 'react';
import { FiPlus, FiFileText, FiImage, FiCalendar, FiUsers, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import ClubNewsCreateForm from '@/component/forms/ClubNewsCreateForm';

const RegistrarClubNewsPage = () => {
  const [clubNews, setClubNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchClubNews = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/club-news');
      if (res.ok) {
        const data = await res.json();
        setClubNews(data.clubNews || []);
      }
    } catch (err) {
      console.error('Error fetching club news:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubNews();
  }, []);

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-primary bg-primary-light px-3 py-1 rounded-full uppercase tracking-widest">
            Registrar Panel
          </span>
          <h1 className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
            Club Announcements & News
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Publish and manage campus student club announcements and activities updates.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-xs cursor-pointer"
        >
          {showAddForm ? (
            <>
              <FiX className="text-lg" /> Cancel
            </>
          ) : (
            <>
              <FiPlus className="text-lg" /> Write Club News
            </>
          )}
        </button>
      </div>

      {showAddForm ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.01)] max-w-3xl">
          <ClubNewsCreateForm
            onSuccess={() => {
              setShowAddForm(false);
              fetchClubNews();
            }}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-semibold text-slate-400">Loading club announcements...</span>
            </div>
          ) : clubNews.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs text-slate-655">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400 pl-6">Cover</th>
                    <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400">Club</th>
                    <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400">Announcement Title</th>
                    <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400">Published Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold text-slate-800">
                  {clubNews.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-4 pl-6">
                        {item.image_url ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                            <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
                            <FiImage className="text-sm" />
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-primary bg-primary-light px-2 py-0.5 rounded uppercase tracking-wider">
                          <FiUsers className="text-xs" />
                          {item.club_name}
                        </span>
                      </td>
                      <td className="p-4 max-w-xs md:max-w-sm">
                        <div className="truncate font-semibold text-slate-900">{item.title}</div>
                        <div className="truncate text-slate-450 text-[10px] mt-0.5 max-w-[260px] font-medium">{item.content}</div>
                      </td>
                      <td className="p-4 text-slate-500 font-medium">
                        <span className="flex items-center gap-1.5">
                          <FiCalendar />
                          {new Date(item.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto text-xl mb-4">
                <FiFileText />
              </div>
              <h3 className="font-bold text-slate-800 text-base">No announcements published</h3>
              <p className="text-slate-500 text-xs mt-1">
                Club announcements published by registrar or administration will show here.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RegistrarClubNewsPage;
