'use client';

import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';
import LoadingScreen from 'src/component/common/LoadingScreen';
import {
  FiCheckCircle,
  FiClock,
  FiPlus,
  FiX,
  FiTrash2,
  FiMessageSquare,
  FiUser,
  FiShield,
  FiArrowLeft,
  FiRefreshCw,
  FiCalendar,
  FiAlertCircle
} from 'react-icons/fi';

export default function DeveloperTasksPage() {
  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isOwner = Number(user?.id) === 1 || String(user?.email).toLowerCase() === 'tanvir004006@gmail.com' || permissions.includes('*');
  const isAuthorized = isOwner || permissions.includes('tasks') || permissions.includes('task');

  const [tasks, setTasks] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('board');

  const [selectedTask, setSelectedTask] = useState(null);
  const [taskComments, setTaskComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    assigned_to_developer_id: '',
    due_date: '',
  });
  const [savingTask, setSavingTask] = useState(false);

  const fetchTasks = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
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
      console.error(err);
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
    if (isAuthorized) {
      fetchTasks();
    }
  }, [statusFilter, priorityFilter, assigneeFilter, isAuthorized]);

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
        setShowCreatePanel(false);
        setCreateForm({
          title: '',
          description: '',
          status: 'TODO',
          priority: 'MEDIUM',
          assigned_to_developer_id: '',
          due_date: '',
        });
        fetchTasks(false);
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
        fetchTasks(false);
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
        fetchTasks(false);
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

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      const res = await fetch(`/api/marketing/developer/tasks/${selectedTask.id}/comments?comment_id=${commentId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setTaskComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getPriorityStyle = (priority) => {
    switch (String(priority || '').toUpperCase()) {
      case 'URGENT':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900';
      case 'HIGH':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900';
      case 'MEDIUM':
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      case 'LOW':
        return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  if (!isAuthorized && user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 rounded p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center text-xl">
            <FiShield />
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Access Restricted</h2>
          <p className="text-xs text-slate-500 mb-4">You require task management permissions to access this board.</p>
          <Link
            href="/developer/overview"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium"
          >
            <FiArrowLeft /> Return to Overview
          </Link>
        </div>
      </div>
    );
  }

  const COLUMNS = [
    { key: 'TODO', label: 'To Do' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'IN_REVIEW', label: 'In Review' },
    { key: 'COMPLETED', label: 'Completed' },
  ];

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">
              Team Sprints &amp; Task Board
            </h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              Workspace &amp; Overview
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sprint tracking, task delegation, and cross-team comments for all platform developers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                viewMode === 'board'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              List
            </button>
          </div>

          <button
            type="button"
            onClick={() => fetchTasks(true)}
            className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs cursor-pointer"
            title="Refresh Tasks"
          >
            <FiRefreshCw />
          </button>

          {canManage && (
            <button
              type="button"
              onClick={() => setShowCreatePanel(!showCreatePanel)}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <FiPlus />
              <span>{showCreatePanel ? 'Close Form' : 'New Task'}</span>
            </button>
          )}
        </div>
      </div>

      {showCreatePanel && (
        <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Create New Team Task</h3>
              <p className="text-[11px] text-slate-500">Add a ticket to the sprint board and assign to a developer</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreatePanel(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
            >
              Close
            </button>
          </div>

          <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Task Title *
              </label>
              <input
                type="text"
                required
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description &amp; Acceptance Criteria
              </label>
              <textarea
                rows={3}
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                <select
                  value={createForm.priority}
                  onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
                <input
                  type="date"
                  value={createForm.due_date}
                  onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Assign Developer</label>
                <select
                  value={createForm.assigned_to_developer_id}
                  onChange={(e) => setCreateForm({ ...createForm, assigned_to_developer_id: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {developers.map((dev) => (
                    <option key={dev.id} value={dev.id}>
                      {dev.name} ({dev.role || 'Developer'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreatePanel(false)}
                className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingTask}
                className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                {savingTask ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-600 dark:text-slate-400">Filter:</span>
          <button
            type="button"
            onClick={() => setAssigneeFilter(assigneeFilter === 'me' ? 'ALL' : 'me')}
            className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
              assigneeFilter === 'me'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            My Assigned Tasks
          </button>

          <select
            aria-label="Filter by Priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            aria-label="Filter by Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium font-mono">
          {tasks.length} total tasks
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <LoadingScreen fullScreen={false} size="sm" label="Loading tasks..." />
        </div>
      ) : viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter(
              (t) => String(t.status || '').toUpperCase() === col.key
            );

            return (
              <div
                key={col.key}
                className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded p-3 flex flex-col min-h-[420px]"
              >
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200 dark:border-slate-700">
                  <span className="font-semibold text-xs text-slate-900 dark:text-white">
                    {col.label}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No tasks in {col.label.toLowerCase()}
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => openTaskDetail(task)}
                        className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 rounded shadow-xs cursor-pointer space-y-2 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-xs text-slate-900 dark:text-white line-clamp-2">
                            {task.title}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border shrink-0 ${getPriorityStyle(
                              task.priority
                            )}`}
                          >
                            {task.priority || 'MED'}
                          </span>
                        </div>

                        {task.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500">
                          <div className="flex items-center gap-1">
                            <FiUser className="text-[11px]" />
                            <span className="truncate max-w-[90px]">
                              {task.assignee_name || 'Unassigned'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 font-mono">
                            {task.due_date && (
                              <span className="flex items-center gap-0.5">
                                <FiCalendar className="text-[10px]" />
                                {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                            <span className="flex items-center gap-0.5 text-slate-400">
                              <FiMessageSquare className="text-[10px]" />
                              {task.comments_count || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[10px] uppercase font-semibold">
                <th className="p-3">Task Title</th>
                <th className="p-3">Status</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Assignee</th>
                <th className="p-3">Due Date</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No tasks match the filter criteria.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => openTaskDetail(task)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                  >
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      {task.title}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {task.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getPriorityStyle(
                          task.priority
                        )}`}
                      >
                        {task.priority || 'MEDIUM'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      {task.assignee_name || 'Unassigned'}
                    </td>
                    <td className="p-3 font-mono text-slate-500">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task.id);
                        }}
                        className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                        title="Delete task"
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedTask && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                  Task #{selectedTask.id}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getPriorityStyle(
                    selectedTask.priority
                  )}`}
                >
                  {selectedTask.priority || 'MEDIUM'}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{selectedTask.title}</h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDeleteTask(selectedTask.id)}
                className="p-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/40 text-xs cursor-pointer"
                title="Delete task"
              >
                <FiTrash2 />
              </button>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer px-2 py-1"
              >
                Close Panel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Description
                </label>
                <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {selectedTask.description || 'No detailed description provided.'}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Discussion &amp; Comments ({taskComments.length})
                  </label>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {taskComments.length === 0 ? (
                    <div className="py-4 text-center text-slate-400 text-xs">
                      No comments posted on this task yet.
                    </div>
                  ) : (
                    taskComments.map((c) => (
                      <div
                        key={c.id}
                        className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {c.author_name || 'Developer'}
                          </span>
                          <div className="flex items-center gap-2">
                            <span>{new Date(c.created_at).toLocaleDateString()}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(c.id)}
                              className="text-rose-500 hover:text-rose-700 cursor-pointer"
                              title="Delete comment"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-800 dark:text-slate-200">{c.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handlePostComment} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    aria-label="Add a task comment"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
                  />
                  <button
                    type="submit"
                    disabled={postingComment || !commentInput.trim()}
                    className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    {postingComment ? 'Posting...' : 'Comment'}
                  </button>
                </form>
              </div>
            </div>

            <div className="space-y-3 p-4 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Change Status
                </label>
                <select
                  aria-label="Change Task Status"
                  value={String(selectedTask.status).toUpperCase()}
                  onChange={(e) => handleUpdateStatus(selectedTask.id, e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none"
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                  Assigned Developer
                </label>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {selectedTask.assignee_name || 'Unassigned'}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">{selectedTask.assignee_email || ''}</div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                  Due Date
                </label>
                <div className="font-mono text-slate-700 dark:text-slate-300">
                  {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString() : 'None set'}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                  Created Date
                </label>
                <div className="font-mono text-slate-500">
                  {selectedTask.created_at ? new Date(selectedTask.created_at).toLocaleDateString() : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
