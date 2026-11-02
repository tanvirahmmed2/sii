'use client';

import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiBookOpen, FiVideo, FiPlayCircle, FiPlus, FiTrash2, FiRefreshCw, FiCalendar, FiClock, FiExternalLink } from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import Loader from 'src/component/common/Loader';

export default function LMSCoursesStaffPage() {
  const { website, getApiEndpoint } = useContext(TenantWebsiteContext);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('courses'); // courses | live | videos
  const [data, setData] = useState({ courses: [], live_classes: [], video_assets: [], classes: [], teachers: [] });

  // Course Modal
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseSlug, setCourseSlug] = useState('');
  const [courseClassId, setCourseClassId] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [coursePublished, setCoursePublished] = useState(true);
  const [submittingCourse, setSubmittingCourse] = useState(false);

  // Live Class Modal
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [liveTitle, setLiveTitle] = useState('');
  const [liveProvider, setLiveProvider] = useState('zoom');
  const [liveJoinUrl, setLiveJoinUrl] = useState('');
  const [liveMeetingId, setLiveMeetingId] = useState('');
  const [livePassword, setLivePassword] = useState('');
  const [liveStartTime, setLiveStartTime] = useState('');
  const [liveDuration, setLiveDuration] = useState(45);
  const [submittingLive, setSubmittingLive] = useState(false);

  const apiEndpoint = useMemo(() => getApiEndpoint('staff/panel/lms-courses'), [getApiEndpoint]);

  const fetchData = useCallback(async (showToast = false) => {
    if (!apiEndpoint) return;
    try {
      if (showToast) setRefreshing(true);
      const res = await axios.get(apiEndpoint);
      if (res.data?.success) {
        setData(res.data);
        if (showToast) toast.success('LMS & Live Class records refreshed');
      } else {
        toast.error(res.data?.error || 'Failed to load LMS data');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Error connecting to LMS service');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiEndpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!courseTitle.trim()) return;
    setSubmittingCourse(true);
    try {
      const res = await axios.post(apiEndpoint, {
        action: 'create_course',
        title: courseTitle.trim(),
        slug: courseSlug.trim(),
        class_id: courseClassId || null,
        description: courseDesc.trim(),
        is_published: coursePublished,
      });
      if (res.data?.success) {
        toast.success('Course created');
        setIsCourseModalOpen(false);
        setCourseTitle('');
        setCourseSlug('');
        fetchData();
      } else {
        toast.error(res.data?.error || 'Failed to create course');
      }
    } catch (err) {
      toast.error('Error creating course');
    } finally {
      setSubmittingCourse(false);
    }
  };

  const handleScheduleLive = async (e) => {
    e.preventDefault();
    if (!liveTitle.trim() || !liveJoinUrl.trim() || !liveStartTime) {
      toast.error('Please fill in title, join URL, and start time');
      return;
    }
    setSubmittingLive(true);
    try {
      const res = await axios.post(apiEndpoint, {
        action: 'schedule_live_class',
        title: liveTitle.trim(),
        provider: liveProvider,
        join_url: liveJoinUrl.trim(),
        meeting_id: liveMeetingId.trim(),
        meeting_password: livePassword.trim(),
        start_time: liveStartTime,
        duration_minutes: liveDuration,
      });
      if (res.data?.success) {
        toast.success('Live class scheduled');
        setIsLiveModalOpen(false);
        setLiveTitle('');
        setLiveJoinUrl('');
        fetchData();
      } else {
        toast.error(res.data?.error || 'Failed to schedule live class');
      }
    } catch (err) {
      toast.error('Error scheduling live class');
    } finally {
      setSubmittingLive(false);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      const res = await axios.delete(`${apiEndpoint}?course_id=${courseId}`);
      if (res.data?.success) {
        toast.success('Course deleted');
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to delete course');
    }
  };

  if (loading) {
    return <Loader message="Loading True LMS & Live Classes Console..." />;
  }

  const { courses, live_classes, video_assets, classes } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FiBookOpen className="text-primary" /> True LMS & Live Virtual Classes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Build structured video curriculum courses, stream HLS media, and schedule live Zoom / Google Meet lectures.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <FiRefreshCw className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={() => setIsCourseModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition shadow-sm"
          >
            <FiPlus /> New Course
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('courses')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === 'courses'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiBookOpen /> Courses ({courses.length})
        </button>
        <button
          onClick={() => setActiveTab('live')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === 'live'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiVideo /> Live Virtual Classes ({live_classes.length})
        </button>
        <button
          onClick={() => setActiveTab('videos')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === 'videos'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiPlayCircle /> HLS Video Assets ({video_assets.length})
        </button>
      </div>

      {/* Tab 1: Courses */}
      {activeTab === 'courses' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {courses.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              No online courses published yet. Click &quot;New Course&quot; to build an interactive video curriculum.
            </div>
          ) : (
            courses.map((c) => (
              <div key={c.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col justify-between">
                <div>
                  <div className="aspect-video bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    {c.thumbnail_url ? (
                      <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" />
                    ) : (
                      <FiPlayCircle className="text-4xl text-primary/40" />
                    )}
                  </div>
                  <div className="p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider font-mono">
                        /{c.slug}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 text-emerald-800">
                        {c.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{c.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2">{c.description || 'Comprehensive curriculum modules.'}</p>
                  </div>
                </div>
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>{c.module_count || 0} Modules • {c.lesson_count || 0} Lessons</span>
                  <button onClick={() => handleDeleteCourse(c.id)} className="text-red-500 hover:text-red-700">
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Live Classes */}
      {activeTab === 'live' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Scheduled Live Sessions</h2>
            <button
              onClick={() => setIsLiveModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition"
            >
              <FiPlus /> Schedule Live Class
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3">Class Title</th>
                  <th className="px-6 py-3">Platform</th>
                  <th className="px-6 py-3">Start Time</th>
                  <th className="px-6 py-3">Duration</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Join Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {live_classes.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                      No live virtual classes scheduled.
                    </td>
                  </tr>
                ) : (
                  live_classes.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{l.title}</td>
                      <td className="px-6 py-4 uppercase text-xs font-bold font-mono text-primary">{l.provider}</td>
                      <td className="px-6 py-4 text-xs">{new Date(l.start_time).toLocaleString()}</td>
                      <td className="px-6 py-4 text-xs">{l.duration_minutes} mins</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 text-xs uppercase font-bold rounded bg-blue-100 text-blue-800">
                          {l.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <a
                          href={l.join_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold"
                        >
                          Launch <FiExternalLink />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Video Streaming Assets */}
      {activeTab === 'videos' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Video Assets & HLS Streaming Streams</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {video_assets.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-sm">
                No video streaming assets uploaded yet.
              </div>
            ) : (
              video_assets.map((v) => (
                <div key={v.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-slate-900 dark:text-white">{v.title}</div>
                  <div className="text-xs text-slate-500 font-mono">Provider: {v.video_provider}</div>
                  <div className="text-[10px] text-emerald-600 font-bold uppercase">{v.status}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Create Course Modal */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Create Online Course</h3>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Course Title</label>
                <input
                  type="text"
                  placeholder="e.g. Advanced Chemistry & Organic Reactions"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">URL Slug</label>
                <input
                  type="text"
                  placeholder="e.g. advanced-chemistry"
                  value={courseSlug}
                  onChange={(e) => setCourseSlug(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  placeholder="Summary of course content and learning goals..."
                  value={courseDesc}
                  onChange={(e) => setCourseDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCourseModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCourse}
                  className="px-4 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-dark"
                >
                  {submittingCourse ? 'Saving...' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Live Modal */}
      {isLiveModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Schedule Live Virtual Class</h3>
            <form onSubmit={handleScheduleLive} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Class Title</label>
                <input
                  type="text"
                  placeholder="e.g. Physics Q&A Session with Dr. Rahman"
                  value={liveTitle}
                  onChange={(e) => setLiveTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Platform</label>
                <select
                  value={liveProvider}
                  onChange={(e) => setLiveProvider(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="zoom">Zoom Video</option>
                  <option value="google_meet">Google Meet</option>
                  <option value="agora">Agora WebRTC</option>
                  <option value="jitsi">Jitsi Meet</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Meeting Join URL</label>
                <input
                  type="url"
                  placeholder="https://zoom.us/j/123456789"
                  value={liveJoinUrl}
                  onChange={(e) => setLiveJoinUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={liveStartTime}
                    onChange={(e) => setLiveStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    value={liveDuration}
                    onChange={(e) => setLiveDuration(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLiveModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLive}
                  className="px-4 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-dark"
                >
                  {submittingLive ? 'Scheduling...' : 'Schedule Live'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

