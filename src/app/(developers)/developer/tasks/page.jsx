'use client';

import { useState, useEffect, useContext } from 'react';
import { Context } from 'src/component/helper/Context';

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

      const res = await fetch(`/api/marketing/developer/tasks?${params.toString()}`);
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
      const res = await fetch(`/api/marketing/developer/tasks/${task.id}/comments`);
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
      const res = await fetch('/api/marketing/developer/tasks', {
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
      const res = await fetch(`/api/marketing/developer/tasks/${taskId}`, {
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
      const res = await fetch(`/api/marketing/developer/tasks/${taskId}`, { method: 'DELETE' });
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
      const res = await fetch(`/api/marketing/developer/tasks/${selectedTask.id}/comments`, {
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
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'LOW':
        return 'bg-slate-50 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const COLUMNS = [
    { key: 'TODO', label: 'To Do' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'IN_REVIEW', label: 'In Review' },
    { key: 'COMPLETED', label: 'Completed' },
  ];

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded p-4">
        <div>
          <h1 className="text-base font-semibold text-slate-900">
            Team Sprints &amp; Task Board
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sprint tracking, task delegation, and cross-team comments for all platform developers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-0.5 rounded text-xs font-medium">
            <button
              onClick={() => setViewMode('board')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                viewMode === 'board' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              List
            </button>
          </div>
          {canManage && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              New Task
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-600">
            Filter:
          </span>
          <button
            onClick={() => setAssigneeFilter(assigneeFilter === 'me' ? 'ALL' : 'me')}
            className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
              assigneeFilter === 'me'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            My Assigned Tasks
          </button>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
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
            className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
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
          className="px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors cursor-pointer"
        >
          Refresh
        </button>
      </div>

      {/* Main View: Kanban Board */}
      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {COLUMNS.map((col) => {
            const columnTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div
                key={col.key}
                className="bg-slate-50 rounded p-3 border border-slate-200 flex flex-col min-h-[460px]"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
                  <span className="font-semibold text-slate-800 text-xs uppercase">
                    {col.label}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[10px] font-mono font-medium">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="flex-1 space-y-2.5 overflow-y-auto">
                  {columnTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => openTaskDetail(t)}
                      className="p-3 rounded bg-white border border-slate-200 hover:border-slate-400 transition-colors cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[9px] font-medium px-1.5 py-0.2 rounded border ${getPriorityStyle(
                            t.priority
                          )}`}
                        >
                          {t.priority}
                        </span>
                        {t.due_date && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(t.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <h4 className="font-semibold text-slate-900 text-xs line-clamp-2">
                        {t.title}
                      </h4>

                      {t.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2">{t.description}</p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <span className="truncate max-w-[120px] text-[11px] text-slate-600 font-normal">
                          {t.assignee_name || 'Unassigned'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {t.comments_count || 0} comments
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
        <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                  <th className="pb-2">Task Title</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Priority</th>
                  <th className="pb-2">Assignee</th>
                  <th className="pb-2">Due Date</th>
                  <th className="pb-2 text-right">Comments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {tasks.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => openTaskDetail(t)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 font-semibold text-slate-900">{t.title}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {t.status}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getPriorityStyle(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-2.5 text-xs text-slate-600">
                      {t.assignee_name || <span className="text-slate-400">Unassigned</span>}
                    </td>
                    <td className="py-2.5 text-xs text-slate-400 font-mono">
                      {t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-2.5 text-right text-xs text-slate-400 font-mono">
                      {t.comments_count || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task Detail Modal & Discussion */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded border border-slate-200 shadow-lg max-w-2xl w-full p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${getPriorityStyle(selectedTask.priority)}`}>
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
                    className="px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium cursor-pointer"
                  >
                    Delete
                  </button>
                )}
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">{selectedTask.title}</h2>
              {selectedTask.description && (
                <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {selectedTask.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-semibold">Status</span>
                  <select
                    value={selectedTask.status}
                    onChange={(e) => handleUpdateStatus(selectedTask.id, e.target.value)}
                    className="mt-1 bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-semibold">Assignee</span>
                  <div className="mt-1 text-slate-800 font-normal">
                    {selectedTask.assignee_name || 'Unassigned'}
                  </div>
                </div>

                {selectedTask.due_date && (
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-semibold">Due Date</span>
                    <div className="mt-1 text-slate-800 font-mono">
                      {new Date(selectedTask.due_date).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Comments Stream */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-semibold text-slate-900">
                Discussion &amp; Activity ({taskComments.length})
              </h3>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {taskComments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No comments yet.</p>
                ) : (
                  taskComments.map((c) => (
                    <div key={c.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-800">{c.author_name} ({c.author_role})</span>
                        <span className="text-slate-400 font-mono">
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
                  className="flex-1 bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
                <button
                  type="submit"
                  disabled={postingComment || !commentInput.trim()}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded border border-slate-200 shadow-lg max-w-lg w-full p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Create New Team Task</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Task Title <span className="text-rose-600">*</span></label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Optimize website database index latency"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Task scope, acceptance criteria, or repro steps..."
                  className="w-full bg-white border border-slate-300 rounded p-3 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={createForm.due_date}
                    onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Developer</label>
                <select
                  value={createForm.assigned_to_developer_id}
                  onChange={(e) => setCreateForm({ ...createForm, assigned_to_developer_id: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                >
                  <option value="">Unassigned</option>
                  {developers.map((dev) => (
                    <option key={dev.id} value={dev.id}>
                      {dev.name} ({dev.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTask}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
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
