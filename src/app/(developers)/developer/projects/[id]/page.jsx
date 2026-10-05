'use client';

import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';

export default function DeveloperSingleProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id;

  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canManage = permissions.includes('projects') || permissions.includes('support') || user?.role_id === 1;

  const [project, setProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [images, setImages] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [actionNotice, setActionNotice] = useState({ text: '', type: '' });

  // Reply state
  const [replyMessage, setReplyMessage] = useState('');
  const [replyImageUrl, setReplyImageUrl] = useState('');
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  // Status & payment edit states
  const [targetWorkingStatus, setTargetWorkingStatus] = useState('PENDING_REVIEW');
  const [savingStatus, setSavingStatus] = useState(false);

  const [budgetVal, setBudgetVal] = useState('0.00');
  const [paidVal, setPaidVal] = useState('0.00');
  const [targetPaymentStatus, setTargetPaymentStatus] = useState('PENDING_QUOTE');
  const [currencyVal, setCurrencyVal] = useState('USD');
  const [savingPayment, setSavingPayment] = useState(false);

  const [assignedDevId, setAssignedDevId] = useState('');
  const [savingDev, setSavingDev] = useState(false);

  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [deadlineVal, setDeadlineVal] = useState('');
  const [priorityVal, setPriorityVal] = useState('MEDIUM');
  const [savingDeliverables, setSavingDeliverables] = useState(false);

  const [previewImage, setPreviewImage] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const notify = (text, type = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => setActionNotice({ text: '', type: '' }), 5000);
  };

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch project details
  const fetchProjectDetails = useCallback(async (showLoading = false) => {
    if (!projectId) return;
    try {
      if (showLoading) setLoading(true);
      setError('');
      const res = await fetch(`/api/marketing/developer/projects/${projectId}`);
      const data = await res.json();
      if (data.success && data.project) {
        setProject(data.project);
        setMessages(data.messages || []);
        setImages(data.images || []);
        if (data.developers) setDevelopers(data.developers);

        // Sync form inputs
        setTargetWorkingStatus(data.project.working_status || 'PENDING_REVIEW');
        setTargetPaymentStatus(data.project.payment_status || 'PENDING_QUOTE');
        setBudgetVal((Number(data.project.budget_in_cents || 0) / 100).toFixed(2));
        setPaidVal((Number(data.project.paid_amount_in_cents || 0) / 100).toFixed(2));
        setCurrencyVal(data.project.currency || 'USD');
        setAssignedDevId(data.project.assigned_developer_id ? String(data.project.assigned_developer_id) : '');
        setDeliverableUrl(data.project.deliverable_url || '');
        setInternalNotes(data.project.notes || '');
        setPriorityVal(data.project.priority || 'MEDIUM');
        if (data.project.deadline) {
          const d = new Date(data.project.deadline);
          setDeadlineVal(d.toISOString().split('T')[0]);
        }
      } else {
        setError(data.error || 'Project not found.');
      }
    } catch (e) {
      console.error(e);
      setError('Network error fetching project.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectDetails(true);
  }, [fetchProjectDetails]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchProjectDetails(false);
    setRefreshing(false);
    notify('Project refreshed.');
  };

  // 1. Send Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || sendingReply || !projectId) return;

    setSendingReply(true);
    try {
      const res = await fetch(`/api/marketing/developer/projects/${projectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyMessage.trim(),
          image_url: replyImageUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReplyMessage('');
        setReplyImageUrl('');
        setShowAttachmentInput(false);
        if (data.newMessage) {
          setMessages((prev) => [...prev, data.newMessage]);
        }
        if (data.newImage) {
          setImages((prev) => [...prev, data.newImage]);
        }
        await fetchProjectDetails(false);
      } else {
        notify(data.error || 'Failed to send message.', 'error');
      }
    } catch (err) {
      console.error(err);
      notify('Network error sending message.', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  // 2. Update Working Status
  const handleSaveWorkingStatus = async () => {
    if (!projectId || savingStatus) return;
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/marketing/developer/projects/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_working_status',
          working_status: targetWorkingStatus,
        }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        setProject(data.project);
        notify(`Status updated to ${targetWorkingStatus}!`);
        await fetchProjectDetails(false);
      } else {
        notify(data.error || 'Failed to update working status.', 'error');
      }
    } catch (err) {
      notify('Network error updating status.', 'error');
    } finally {
      setSavingStatus(false);
    }
  };

  // 3. Update Payment & Quotation
  const handleSavePayment = async () => {
    if (!projectId || savingPayment) return;
    setSavingPayment(true);
    try {
      const budgetCents = Math.round(parseFloat(budgetVal || 0) * 100);
      const paidCents = Math.round(parseFloat(paidVal || 0) * 100);

      const res = await fetch(`/api/marketing/developer/projects/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_payment',
          budget_in_cents: budgetCents,
          paid_amount_in_cents: paidCents,
          payment_status: targetPaymentStatus,
          currency: currencyVal,
        }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        setProject(data.project);
        notify('Project finances & terms updated successfully!');
      } else {
        notify(data.error || 'Failed to update payment details.', 'error');
      }
    } catch (err) {
      notify('Network error updating payment.', 'error');
    } finally {
      setSavingPayment(false);
    }
  };

  // 4. Assign Developer
  const handleAssignDev = async () => {
    if (!projectId || savingDev) return;
    setSavingDev(true);
    try {
      const res = await fetch(`/api/marketing/developer/projects/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_developer',
          assigned_developer_id: assignedDevId ? Number(assignedDevId) : null,
        }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        setProject(data.project);
        notify('Assigned developer updated!');
      } else {
        notify(data.error || 'Failed to assign developer.', 'error');
      }
    } catch (err) {
      notify('Network error assigning developer.', 'error');
    } finally {
      setSavingDev(false);
    }
  };

  // 5. Update Deliverables & Notes
  const handleSaveDeliverables = async () => {
    if (!projectId || savingDeliverables) return;
    setSavingDeliverables(true);
    try {
      const res = await fetch(`/api/marketing/developer/projects/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_deliverable',
          deliverable_url: deliverableUrl,
          notes: internalNotes,
          priority: priorityVal,
          deadline: deadlineVal ? new Date(deadlineVal).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        setProject(data.project);
        notify('Deliverable links and project notes updated!');
      } else {
        notify(data.error || 'Failed to save deliverables.', 'error');
      }
    } catch (err) {
      notify('Network error saving deliverables.', 'error');
    } finally {
      setSavingDeliverables(false);
    }
  };

  // 6. Delete Project
  const handleDelete = async () => {
    if (!projectId || !canManage) return;
    if (!confirm('Are you sure you want to permanently delete this project?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/marketing/developer/projects/${projectId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        router.push('/developer/projects');
      } else {
        notify(data.error || 'Failed to delete project.', 'error');
        setDeleting(false);
      }
    } catch (err) {
      notify('Network error deleting project.', 'error');
      setDeleting(false);
    }
  };

  const workingStatusStyles = {
    PENDING_REVIEW: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    ACCEPTED: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    IN_PROGRESS: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    UNDER_REVIEW: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    COMPLETED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    ON_HOLD: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    CANCELLED: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  };

  const paymentStatusStyles = {
    PENDING_QUOTE: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    UNPAID: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    PARTIAL: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    PAID: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    REFUNDED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-2">
        <p className="text-xs text-slate-400 font-medium">Loading project workspace...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center max-w-lg mx-auto shadow-xs space-y-3">
        <h2 className="text-base font-medium text-slate-900 dark:text-white">Custom Project Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {error || 'The requested custom project does not exist or was deleted.'}
        </p>
        <Link
          href="/developer/projects"
          className="inline-flex items-center px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded text-xs font-normal hover:bg-slate-800 transition-colors"
        >
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Toast Alert */}
      {actionNotice.text && (
        <div
          className={`p-3 rounded flex items-center justify-between text-xs font-normal shadow-xs transition-all ${
            actionNotice.type === 'error'
              ? 'bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
          }`}
        >
          <span>{actionNotice.text}</span>
          <button
            type="button"
            onClick={() => setActionNotice({ text: '', type: '' })}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer font-medium ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link
              href="/developer/projects"
              className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-normal transition-colors cursor-pointer mt-0.5"
            >
              Back
            </Link>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-mono text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                  #{project.project_number}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wider ${
                    workingStatusStyles[project.working_status] || 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {project.working_status ? project.working_status.replace('_', ' ') : 'PENDING'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wider ${
                    paymentStatusStyles[project.payment_status] || 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {project.payment_status ? project.payment_status.replace('_', ' ') : 'PENDING QUOTE'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  {project.category || 'Custom Project'}
                </span>
              </div>

              <h1 className="text-xl font-medium text-slate-900 dark:text-white tracking-tight">{project.title}</h1>

              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Creator:{' '}
                  <strong className="text-slate-700 dark:text-slate-200 font-medium">
                    {project.creator_name || `Creator #${project.creator_id}`}
                  </strong>{' '}
                  ({project.creator_email})
                </span>
                <span>•</span>
                <span>Created {new Date(project.created_at).toLocaleString()}</span>
                {project.assigned_dev_name && (
                  <>
                    <span>•</span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Assigned to {project.assigned_dev_name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-normal transition-colors cursor-pointer disabled:opacity-50"
            >
              Refresh
            </button>

            {canManage && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1.5 rounded border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-normal transition-colors cursor-pointer disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Discussion & Activity Thread (2 cols on lg) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Project Initial Scope / Description Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
            <h3 className="text-xs font-medium text-slate-900 dark:text-white uppercase tracking-wider mb-2">
              Project Scope &amp; Requirements
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded p-3">
              {project.description || 'No detailed scope provided.'}
            </p>
          </div>

          {/* Conversation Thread */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden flex flex-col h-[540px]">
            {/* Thread Header */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-medium text-slate-900 dark:text-white">Custom Project Discussion</h3>
                <span className="text-[10px] text-slate-500 font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  {messages.length} messages
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Live sync active</span>
            </div>

            {/* Scrollable Messages Container */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                  No messages yet. Send a message to get started!
                </div>
              ) : (
                messages.map((m) => {
                  const isStaff = m.sender_type === 'DEVELOPER' || m.sender_type === 'ADMIN';
                  const msgImages = images.filter((img) => img.message_id === m.id);

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span
                          className={`text-[11px] font-medium ${
                            isStaff ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {m.sender_name || (isStaff ? 'Developer' : 'Creator')}
                        </span>
                        <span
                          className={`text-[9px] font-medium px-1.5 py-0.2 rounded border uppercase ${
                            isStaff
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {m.sender_type}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(m.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div
                        className={`max-w-[85%] rounded p-3 text-xs leading-relaxed ${
                          isStaff
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.message}</p>

                        {/* Attachments if any */}
                        {msgImages.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-white/20 dark:border-slate-700 flex flex-wrap gap-2">
                            {msgImages.map((img) => (
                              <button
                                key={img.id}
                                type="button"
                                onClick={() => setPreviewImage(img.image_url)}
                                className="group relative rounded overflow-hidden border border-white/30 bg-black/10 hover:opacity-90 transition-opacity"
                              >
                                <img
                                  src={img.image_url}
                                  alt={img.file_name || 'Attachment'}
                                  className="w-20 h-20 object-cover"
                                />
                                <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-medium transition-opacity">
                                  View
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer Footer */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              {showAttachmentInput && (
                <div className="mb-2 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded flex items-center gap-2 text-xs">
                  <input
                    type="url"
                    value={replyImageUrl}
                    onChange={(e) => setReplyImageUrl(e.target.value)}
                    placeholder="Enter image / mockup URL (https://...)"
                    className="flex-1 bg-transparent border-none text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setReplyImageUrl('');
                      setShowAttachmentInput(false);
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAttachmentInput((prev) => !prev)}
                  className={`px-3 py-2 rounded border border-slate-200 dark:border-slate-700 text-xs transition-colors cursor-pointer ${
                    showAttachmentInput || replyImageUrl
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                      : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Attach
                </button>

                <input
                  type="text"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type an update or response to the creator..."
                  disabled={sendingReply}
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
                />

                <button
                  type="submit"
                  disabled={sendingReply || !replyMessage.trim()}
                  className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded text-xs font-medium hover:bg-slate-800 dark:hover:bg-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {sendingReply ? 'Sending...' : 'Send'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: Project Control Panel & Details */}
        <div className="space-y-4">
          {/* 1. Working Status Selector Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-900 dark:text-white uppercase tracking-wider">Working Progress Status</span>
              <span
                className={`text-[9px] px-2 py-0.5 rounded font-medium border uppercase ${
                  workingStatusStyles[project.working_status] || 'bg-slate-100 text-slate-600'
                }`}
              >
                {project.working_status}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Change Project Phase
                </label>
                <select
                  value={targetWorkingStatus}
                  onChange={(e) => setTargetWorkingStatus(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="PENDING_REVIEW">PENDING REVIEW (Under evaluation)</option>
                  <option value="ACCEPTED">ACCEPTED (Approved &amp; scheduled)</option>
                  <option value="IN_PROGRESS">IN PROGRESS (Actively developing)</option>
                  <option value="UNDER_REVIEW">UNDER REVIEW (Client QA &amp; testing)</option>
                  <option value="COMPLETED">COMPLETED (Delivered &amp; closed)</option>
                  <option value="ON_HOLD">ON HOLD</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleSaveWorkingStatus}
                disabled={savingStatus || targetWorkingStatus === project.working_status}
                className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 rounded text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                {savingStatus ? 'Saving Working Status...' : 'Save Working Status'}
              </button>
            </div>
          </div>

          {/* 2. Quotation & Financials Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
            <h3 className="text-xs font-medium text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              Financial Quotation &amp; Payments
            </h3>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Quoted Budget
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-normal text-xs">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={budgetVal}
                      onChange={(e) => setBudgetVal(e.target.value)}
                      className="w-full pl-6 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Amount Paid
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-normal text-xs">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={paidVal}
                      onChange={(e) => setPaidVal(e.target.value)}
                      className="w-full pl-6 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Payment Status
                </label>
                <select
                  value={targetPaymentStatus}
                  onChange={(e) => setTargetPaymentStatus(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="PENDING_QUOTE">PENDING QUOTE</option>
                  <option value="UNPAID">UNPAID (Quote presented)</option>
                  <option value="PARTIAL">PARTIAL (Deposit received)</option>
                  <option value="PAID">PAID (Fully paid)</option>
                  <option value="REFUNDED">REFUNDED</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Currency
                </label>
                <select
                  value={currencyVal}
                  onChange={(e) => setCurrencyVal(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="BDT">BDT (৳)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleSavePayment}
                disabled={savingPayment}
                className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                {savingPayment ? 'Updating...' : 'Update Quotation & Terms'}
              </button>
            </div>
          </div>

          {/* 3. Assign Developer Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
            <h3 className="text-xs font-medium text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              Assigned Developer
            </h3>

            <div className="space-y-3">
              <select
                value={assignedDevId}
                onChange={(e) => setAssignedDevId(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-white focus:outline-none"
              >
                <option value="">-- Unassigned --</option>
                {developers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.role_name || 'Staff'})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleAssignDev}
                disabled={savingDev}
                className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                {savingDev ? 'Assigning...' : 'Save Assignment'}
              </button>
            </div>
          </div>

          {/* 4. Deliverables, Priority & Notes */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
            <h3 className="text-xs font-medium text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              Deliverables &amp; Specs
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Deliverable / Preview URL
                </label>
                <input
                  type="url"
                  value={deliverableUrl}
                  onChange={(e) => setDeliverableUrl(e.target.value)}
                  placeholder="https://staging.domain.com or repo link"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-white focus:outline-none"
                />
                {deliverableUrl && (
                  <a
                    href={deliverableUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-slate-700 dark:text-slate-300 hover:underline mt-1"
                  >
                    Test link →
                  </a>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Priority
                  </label>
                  <select
                    value={priorityVal}
                    onChange={(e) => setPriorityVal(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-white focus:outline-none"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Target Deadline
                  </label>
                  <input
                    type="date"
                    value={deadlineVal}
                    onChange={(e) => setDeadlineVal(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Internal Engineering Notes
                </label>
                <textarea
                  rows={3}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Private engineering notes, API credentials, milestones..."
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveDeliverables}
                disabled={savingDeliverables}
                className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 rounded text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                {savingDeliverables ? 'Saving...' : 'Save Specifications'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewImage}
              alt="Attachment preview"
              className="max-w-full max-h-[90vh] rounded object-contain"
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 px-2 py-1 bg-white text-slate-800 rounded shadow text-xs font-medium cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
