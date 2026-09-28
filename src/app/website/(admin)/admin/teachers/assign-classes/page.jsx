'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  FiPlus, FiTrash2, FiX, FiAward, FiLayers, FiGrid,
  FiBook, FiUser, FiCalendar, FiUsers, FiRefreshCw
} from 'react-icons/fi';
import ClassSubjectAssignForm from '@/component/forms/ClassSubjectAssignForm';
import ClassTeacherAssignForm from '@/component/forms/ClassTeacherAssignForm';

const AdminAssignClassesPage = () => {
  const [activeTab, setActiveTab] = useState('subjects'); // 'subjects' or 'classes'
  const [assignments, setAssignments] = useState([]);
  const [classTeacherAssignments, setClassTeacherAssignments] = useState([]);
  
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch classes
      const classesRes = await fetch('/api/classes');
      const classesData = await classesRes.json();
      if (!classesRes.ok) throw new Error(classesData.message || 'Failed to fetch classes.');

      // Fetch subjects
      const subjectsRes = await fetch('/api/subjects');
      const subjectsData = await subjectsRes.json();
      if (!subjectsRes.ok) throw new Error(subjectsData.message || 'Failed to fetch subjects.');

      // Fetch teachers
      const teachersRes = await fetch('/api/teachers');
      const teachersData = await teachersRes.json();
      if (!teachersRes.ok) throw new Error(teachersData.message || 'Failed to fetch teachers.');

      setClasses(classesData.paylod?.classes || []);
      setSubjects(subjectsData.paylod?.subjects || []);
      setTeachers(teachersData.paylod?.teachers || []);

      // Fetch Subject Assignments
      const assignRes = await fetch('/api/class-subject-teachers');
      const assignData = await assignRes.json();
      if (!assignRes.ok) throw new Error(assignData.message || 'Failed to fetch subject assignments.');
      setAssignments(assignData.paylod?.assignments || []);

      // Fetch Class Teacher Assignments
      const classTeacherRes = await fetch('/api/teacher-classes');
      const classTeacherData = await classTeacherRes.json();
      if (!classTeacherRes.ok) throw new Error(classTeacherData.message || 'Failed to fetch class teachers.');
      setClassTeacherAssignments(classTeacherData.paylod?.assignments || []);

    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteAssignment = async (id, subjectName, className) => {
    const confirm = window.confirm(
      `Are you sure you want to remove the "${subjectName}" mapping from "${className}"?`
    );
    if (!confirm) return;

    try {
      const response = await fetch(`/api/class-subject-teachers/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete assignment.');
      }

      toast.success(data.message || 'Assignment deleted successfully!');
      setAssignments(assignments.filter((a) => a.id !== id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteClassTeacher = async (id, teacherName, className, sectionName) => {
    const sectionText = sectionName ? `Section ${sectionName}` : 'All Sections';
    const confirm = window.confirm(
      `Are you sure you want to remove ${teacherName} as Class Teacher of ${className} (${sectionText})?`
    );
    if (!confirm) return;

    try {
      const response = await fetch(`/api/teacher-classes/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete class teacher assignment.');
      }

      toast.success(data.message || 'Class teacher assignment removed successfully!');
      setClassTeacherAssignments(classTeacherAssignments.filter((a) => a.id !== id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-up">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FiAward className="text-primary" /> Teacher & Class Assignments
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Assign subject teachers to routines or designate homeroom Class Teachers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="flex items-center justify-center gap-2 px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <FiRefreshCw className={`text-xs ${loading ? 'animate-spin' : ''}`} /> Refresh Mappings
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer"
          >
            {showAddForm ? (
              <>
                <FiX className="text-xs" /> Close Drawer
              </>
            ) : (
              <>
                <FiPlus className="text-xs" /> {activeTab === 'subjects' ? 'Assign Subject Teacher' : 'Assign Class Teacher'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Subject Mappings</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-lg font-bold text-slate-800">{assignments.length}</span>
            <FiBook className="text-slate-400 text-sm" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Homeroom Teachers</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-lg font-bold text-primary">{classTeacherAssignments.length}</span>
            <FiUser className="text-primary text-sm" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Academic Classes</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-lg font-bold text-emerald-600">{classes.length}</span>
            <FiLayers className="text-emerald-500 text-sm" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Teachers</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-lg font-bold text-amber-600">{teachers.length}</span>
            <FiUsers className="text-amber-500 text-sm" />
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-2 flex gap-2">
        <button
          onClick={() => { setActiveTab('subjects'); setShowAddForm(false); }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'subjects'
              ? 'bg-primary text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          Subject Teacher Mappings
        </button>
        <button
          onClick={() => { setActiveTab('classes'); setShowAddForm(false); }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'classes'
              ? 'bg-primary text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          Homeroom Class Teachers
        </button>
      </div>

      {/* Add Assignment Forms */}
      {showAddForm && activeTab === 'subjects' && (
        <ClassSubjectAssignForm
          classes={classes}
          teachers={teachers}
          onSuccess={() => {
            fetchData();
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {showAddForm && activeTab === 'classes' && (
        <ClassTeacherAssignForm
          classes={classes}
          teachers={teachers}
          onSuccess={() => {
            fetchData();
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Registry Tables Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="w-full py-12 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-medium text-slate-400">Loading assignments...</span>
          </div>
        ) : activeTab === 'subjects' ? (
          // SUBJECT TEACHERS TABLE
          <>
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Active Subject Mappings Registry ({assignments.length})
              </h2>
            </div>
            {assignments.length === 0 ? (
              <div className="w-full py-12 flex flex-col items-center justify-center text-center px-4">
                <FiBook className="text-slate-300 text-3xl mb-2" />
                <p className="text-xs font-semibold text-slate-600">No Mappings Found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Map subjects to classes and assign subject teachers.</p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="px-4 py-3">Class</th>
                      <th className="px-4 py-3">Section</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Assigned Teacher</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {assignments.map((assign) => (
                      <tr key={assign.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-800">
                          {assign.class_name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                          {assign.section_name || 'All Sections'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-semibold text-slate-800">{assign.subject_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">Code: {assign.subject_code}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">
                          {assign.teacher_name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleDeleteAssignment(assign.id, assign.subject_name, assign.class_name)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove Mapping"
                          >
                            <FiTrash2 className="text-xs" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          // CLASS TEACHERS TABLE
          <>
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Active Class Teachers Registry ({classTeacherAssignments.length})
              </h2>
            </div>
            {classTeacherAssignments.length === 0 ? (
              <div className="w-full py-12 flex flex-col items-center justify-center text-center px-4">
                <FiUser className="text-slate-300 text-3xl mb-2" />
                <p className="text-xs font-semibold text-slate-600">No Class Teachers Assigned</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Designate homeroom class teachers for classes and sections.</p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="px-4 py-3">Class</th>
                      <th className="px-4 py-3">Section</th>
                      <th className="px-4 py-3">Assigned Class Teacher</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {classTeacherAssignments.map((assign) => (
                      <tr key={assign.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-800">
                          {assign.class_name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                          {assign.section_name || 'All Sections'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">
                          {assign.teacher_name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleDeleteClassTeacher(assign.id, assign.teacher_name, assign.class_name, assign.section_name)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove Class Teacher"
                          >
                            <FiTrash2 className="text-xs" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminAssignClassesPage;
