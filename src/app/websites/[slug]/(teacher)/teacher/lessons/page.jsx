'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FiCalendar, FiBookOpen, FiPlus, FiCheck, FiInfo } from 'react-icons/fi';
import toast from 'react-hot-toast';
import TiptapEditor from '@/component/helper/TiptapEditor';

const LessonsPageContent = () => {
  const searchParams = useSearchParams();
  const classSubjectId = searchParams.get('class_subject_id');
  const subjectName = searchParams.get('subject_name') || 'Subject Details';

  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Draft'
  });

  const fetchLessons = async () => {
    try {
      const res = await fetch(`/api/lms/lesson-plans?class_subject_id=${classSubjectId}`);
      if (res.ok) {
        const data = await res.json();
        setLessons(data.paylod.lesson_plans || []);
      }
    } catch (error) {
      console.error('Error fetching lesson plans:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classSubjectId) {
      fetchLessons();
    }
  }, [classSubjectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.date) {
      toast.error('Please fill in all fields.');
      return;
    }

    try {
      const res = await fetch('/api/lms/lesson-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_subject_id: classSubjectId,
          ...formData
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Lesson plan created!');
        setFormData({
          title: '',
          description: '',
          date: new Date().toISOString().split('T')[0],
          status: 'Draft'
        });
        setShowAddForm(false);
        fetchLessons();
      } else {
        toast.error(data.message || 'Failed to create lesson plan.');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('An error occurred.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-12 h-12 border-4 border-primary-light border-t-indigo-650 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full mx-auto">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 mb-2">Lesson Planner</h1>
          <p className="text-slate-500 text-sm font-medium">Manage and structure your curriculum plans for <span className="text-primary font-bold">{subjectName}</span>.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-colors shadow-sm w-fit"
        >
          <FiPlus className="text-sm" />
          <span>{showAddForm ? 'View Lessons' : 'Add Lesson Plan'}</span>
        </button>
      </div>

      {showAddForm ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 max-w-xl mx-auto w-full shadow-sm">
          <h3 className="font-bold text-slate-800 text-lg mb-6">Create Lesson Plan</h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500">Topic / Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border border-slate-150 rounded-xl text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500">Details / Description</label>
              <TiptapEditor
                value={formData.description}
                onChange={(val) => setFormData({ ...formData, description: val })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500">Execution Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-150 rounded-xl text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-150 rounded-xl text-sm focus:outline-none focus:border-primary bg-white"
                >
                  <option value="Draft">Draft</option>
                  <option value="Approved">Approved</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="mt-4 w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold transition-colors"
            >
              Submit Lesson Plan
            </button>
          </form>
        </div>
      ) : (
        <>
          {lessons.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 mb-4">
                <FiInfo className="text-3xl" />
              </div>
              <h3 className="font-bold text-slate-800 text-base mb-1">No Lesson Plans</h3>
              <p className="text-slate-400 text-xs font-medium max-w-xs">You haven't created any lesson plans for this subject yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="bg-white border border-slate-100 rounded-3xl p-6 flex flex-col justify-between hover:shadow-md transition-shadow duration-200"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                        <FiCalendar /> {new Date(lesson.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          lesson.status === 'Completed'
                            ? 'bg-primary-light text-primary'
                            : lesson.status === 'Approved'
                            ? 'bg-primary-light text-primary'
                            : 'bg-slate-100 text-slate-650 text-slate-600'
                        }`}
                      >
                        {lesson.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-base mb-2 flex items-center gap-2">
                      <FiBookOpen className="text-primary" />
                      {lesson.title}
                    </h3>
                    <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4 whitespace-pre-line">
                      {lesson.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const LessonsPage = () => {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-12 h-12 border-4 border-primary-light border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    }>
      <LessonsPageContent />
    </Suspense>
  );
};

export default LessonsPage;
