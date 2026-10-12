'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiEdit2 } from 'react-icons/fi';

const SectionEditForm = ({ section, classes, onSuccess, onCancel }) => {
  const [classId, setClassId] = useState(section.class_id);
  const [name, setName] = useState(section.name);
  const [capacity, setCapacity] = useState(section.capacity);
  const [roomNumber, setRoomNumber] = useState(section.room_number || '');
  const [updating, setUpdating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!classId || !name) {
      toast.error('Class and Section Name are required.');
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`/api/sections/${section.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: classId,
          name,
          capacity,
          room_number: roomNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update section.');
      }

      toast.success(data.message || 'Section updated successfully!');
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="w-full bg-white border border-primary-light rounded-3xl p-6 md:p-8 shadow-[0_10px_30px_rgba(59,130,246,0.02)] animate-fade-up">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <FiEdit2 className="text-primary" /> Edit Section: {section.name}
      </h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Class
          </label>
          <select
            required
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            disabled={updating}
            className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 bg-slate-50"
          >
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls.code})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Section Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={updating}
            className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 bg-slate-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Capacity
          </label>
          <input
            type="number"
            value={editCapacity}
            onChange={(e) => setCapacity(e.target.value)}
            disabled={updating}
            className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 bg-slate-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Room Number
          </label>
          <input
            type="text"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            disabled={updating}
            className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 bg-slate-50"
          />
        </div>

        <div className="flex justify-end gap-3 md:col-span-4 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors duration-150 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updating}
            className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-all duration-150 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {updating ? (
              <div className="loader loader-sm loader-white" />
            ) : (
              'Update Section'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SectionEditForm;
