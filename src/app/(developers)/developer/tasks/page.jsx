'use client';

import { useState, useEffect, useContext } from 'react';
import {
  BiTask,
  BiPlus,
  BiCheckCircle,
  BiTime,
  BiUser,
  BiMessageSquareDetail,
  BiFilter,
  BiRefresh,
  BiCalendar,
  BiTrash,
  BiEdit,
  BiSend,
  BiCheck,
} from 'react-icons/bi';
import { Context } from '@/components/helper/Context';

export default function DeveloperTasksPage() {
  const { user } = useContext(Context);

  const [tasks, setTasks] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('board'); // 'board' or 'list'

  // Task Detail Modal & Comments
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskComments, setTaskComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Create Task Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    assigned_to_developer_id: '',
    due_date: '',
  });
  const [savingTask, setSavingTask] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);
      if (assigneeFilter !== 'ALL') params.append('assigned_to', assigneeFilter);

      const res = await fetch(`/api/developer/tasks?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks || []);
        setDevelopers(data.developers || []);
        setCanManage(Boolean(data.canManage));
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const openTaskDetail = async (task) => {
    setSelectedTask(task);
    try {
      const res = await fetch(`/api/developer/tasks/${task.id}/comments`);
      const data = await res.json();
      if (data.success) {
        setTaskComments(data.comments || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, priorityFilter, assigneeFilter]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      setSavingTask(true);
      const res = await fetch('/api/developer/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setCreateForm({
          title: '',
          description: '',
          status: 'TODO',
          priority: 'MEDIUM',
          assigned_to_developer_id: '',
          due_date: '',
        });
        fetchTasks();
      } else {
        alert(data.error || 'Failed to create task');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingTask(false);
    }
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      const res = await fetch(`/api/developer/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask({ ...selectedTask, status: newStatus });
        }
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await fetch(`/api/developer/tasks/${taskId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        if (selectedTask?.id === taskId) setSelectedTask(null);
        fetchTasks();
      } else {
        alert(data.error || 'Failed to delete task');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!selectedTask || !commentInput.trim()) return;
    try {
      setPostingComment(true);
      const res = await fetch(`/api/developer/tasks/${selectedTask.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: commentInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setTaskComments((prev) => [...prev, data.comment]);
        setCommentInput('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPostingComment(false);
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'HIGH':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'MEDIUM':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'LOW':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const COLUMNS = [
    { key: 'TODO', label: 'To Do', color: 'border-slate-300' },
    { key: 'IN_PROGRESS', label: 'In Progress', color: 'border-blue-400' },
    { key: 'IN_REVIEW', label: 'In Review', color: 'border-purple-400' },
    { key: 'COMPLETED', label: 'Completed', color: 'border-emerald-400' },
  ];

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BiTask className="text-secondary" /> Team Sprints & Task Board
          </h1>
          <p className="text-xs md:text-sm text-slate-500">
            Sprint tracking, task delegation, and cross-team comments for all platform developers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                viewMode === 'board' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              List
            </button>
          </div>
          {canManage && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/90 text-white text-xs font-bold shadow-sm transition-all"
            >
              <BiPlus className="text-base" /> New Task
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-500 flex items-center gap-1">
            <BiFilter className="text-sm" /> Filter:
          </span>
          <button
            onClick={() => setAssigneeFilter(assigneeFilter === 'me' ? 'ALL' : 'me')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
              assigneeFilter === 'me'
                ? 'bg-secondary text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            My Assigned Tasks
          </button>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-secondary text-slate-700"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-secondary text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        <button
          onClick={fetchTasks}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
          title="Refresh tasks"
        >
          <BiRefresh className="text-base" />
        </button>
      </div>

      {/* Main View: Kanban Board */}
      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const columnTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div
                key={col.key}
                className="bg-slate-50/60 rounded-3xl p-4 border border-slate-200 flex flex-col min-h-[500px]"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-xs tracking-wider uppercase">
                      {col.label}
                    </span>
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-extrabold flex items-center justify-center">
                      {columnTasks.length}
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto">
                  {columnTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => openTaskDetail(t)}
                      className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-3 group"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityStyle(
                            t.priority
                          )}`}
                        >
                          {t.priority}
                        </span>
                        {t.due_date && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                            <BiCalendar /> {new Date(t.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-slate-900 text-xs group-hover:text-secondary transition-colors line-clamp-2">
                        {t.title}
                      </h4>

                      {t.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2">{t.description}</p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <BiUser className="text-sm text-slate-400" />
                          <span className="truncate max-w-[100px] text-[11px]">
                            {t.assignee_name || 'Unassigned'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <BiMessageSquareDetail /> {t.comments_count || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Task Title</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Priority</th>
                <th className="px-6 py-3.5">Assignee</th>
                <th className="px-6 py-3.5">Due Date</th>
                <th className="px-6 py-3.5 text-right">Comments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => openTaskDetail(t)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 font-bold text-slate-900">{t.title}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getPriorityStyle(t.priority)}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                    {t.assignee_name || <span className="text-slate-400">Unassigned</span>}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">
                    {t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-slate-400 font-bold">
                    💬 {t.comments_count || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Task Detail Modal & Discussion */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getPriorityStyle(selectedTask.priority)}`}>
                  {selectedTask.priority}
                </span>
                <span className="text-xs text-slate-400">
                  Created by {selectedTask.creator_name || 'System'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {canManage && (
                  <button
                    onClick={() => handleDeleteTask(selectedTask.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors"
                    title="Delete Task"
                  >
                    <BiTrash className="text-base" />
                  </button>
                )}
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">{selectedTask.title}</h2>
              {selectedTask.description && (
                <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {selectedTask.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Status</span>
                  <select
                    value={selectedTask.status}
                    onChange={(e) => handleUpdateStatus(selectedTask.id, e.target.value)}
                    className="mt-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 font-bold text-slate-800"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Assignee</span>
                  <div className="mt-1 text-slate-800 font-semibold flex items-center gap-1">
                    <BiUser /> {selectedTask.assignee_name || 'Unassigned'}
                  </div>
                </div>

                {selectedTask.due_date && (
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-bold">Due Date</span>
                    <div className="mt-1 text-slate-800 font-semibold flex items-center gap-1">
                      <BiCalendar /> {new Date(selectedTask.due_date).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Comments Stream */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BiMessageSquareDetail className="text-secondary" /> Discussion & Activity ({taskComments.length})
              </h3>

              <div className="space-y-3 max-h-52 overflow-y-auto">
                {taskComments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No comments yet. Be the first to reply!</p>
                ) : (
                  taskComments.map((c) => (
                    <div key={c.id} className="p-3 bg-slate-50 rounded-2xl space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-800">{c.author_name} ({c.author_role})</span>
                        <span className="text-slate-400">
                          {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{c.comment}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              <form onSubmit={handlePostComment} className="flex gap-2">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Add a comment or status update..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-secondary focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={postingComment || !commentInput.trim()}
                  className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/90 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  Post
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 md:p-8 space-y-5 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Create New Team Task</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Optimize website database index latency"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-secondary focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description</label>
                <textarea
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Task scope, acceptance criteria, or repro steps..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-secondary focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Priority</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-secondary focus:bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Due Date</label>
                  <input
                    type="date"
                    value={createForm.due_date}
                    onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-secondary focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assign Developer</label>
                <select
                  value={createForm.assigned_to_developer_id}
                  onChange={(e) => setCreateForm({ ...createForm, assigned_to_developer_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-secondary focus:bg-white"
                >
                  <option value="">Unassigned</option>
                  {developers.map((dev) => (
                    <option key={dev.id} value={dev.id}>
                      {dev.name} ({dev.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTask}
                  className="px-5 py-2 rounded-xl bg-secondary hover:bg-secondary/90 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {savingTask ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
