'use client';

import React, { useEffect, useState } from 'react';
import { FiUsers } from 'react-icons/fi';
import { ClubCard } from '@/component/cards';

const ClubsPage = () => {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const res = await fetch('/api/clubs');
        if (res.ok) {
          const data = await res.json();
          setClubs(data.paylod?.clubs || []);
        }
      } catch (err) {
        console.error('Failed to fetch clubs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchClubs();
  }, []);

  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full space-y-10">
        
        <div className="text-center space-y-2">
          
          <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
            Our Student Clubs
          </h1>
          <p className="text-slate-500 max-w-xl mx-auto text-sm sm:text-base">
            Join one of our student activity communities. Build new skills, coordinate group exhibitions, and showcase innovations.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs animate-pulse space-y-4">
                <div className="w-full h-40 bg-slate-200 rounded-xl"></div>
                <div className="w-3/4 h-5 bg-slate-200 rounded"></div>
                <div className="w-full h-12 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : clubs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {clubs.map((club) => (
              <ClubCard key={club.id} club={club} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto text-xl mb-3">
              <FiUsers />
            </div>
            <h3 className="font-bold text-slate-800 text-base">No active clubs found</h3>
            <p className="text-slate-500 text-xs mt-1">
              There are currently no listed student clubs in our records.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default ClubsPage;
