'use client';

import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  BiArrowBack,
  BiRefresh,
  BiTrash,
  BiSend,
  BiBriefcase,
  BiUser,
  BiCheckCircle,
  BiTimeFive,
  BiLoaderAlt,
  BiEnvelope,
  BiCheckShield,
  BiLinkExternal,
  BiX,
  BiDollarCircle,
  BiCalendar,
  BiImage,
  BiFile,
  BiEdit,
  BiSave,
} from 'react-icons/bi';
import { Context } from '@/components/helper/Context';

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
      const res = await fetch(`/api/developer/projects/${projectId}`);
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
    } catch (err) {
      console.error('Error fetching project details:', err);
      setError('Network error while loading project.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectDetails(true);
  }, [fetchProjectDetails]);

  // Polling every 4 seconds
  useEffect(() => {
    if (!projectId) return;
    const interval = setInterval(() => {
      fetchProjectDetails(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [projectId, fetchProjectDetails]);

  const handleManualRefresh = async () => {
    if (!projectId || refreshing) return;
    setRefreshing(true);
    await fetchProjectDetails(false);
    setRefreshing(false);
  };

  // 1. Send Reply Message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!replyMessage.trim() || sendingReply || !projectId) return;

    const messageText = replyMessage.trim();
    const imageUrl = replyImageUrl.trim() || null;
    setSendingReply(true);

    try {
      const res = await fetch(`/api/developer/projects/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          message: messageText,
          sender_name: user?.name || 'Developer Support',
          image_url: imageUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setReplyMessage('');
        setReplyImageUrl('');
        setShowAttachmentInput(false);
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
        }
        if (data.image) {
          setImages((prev) => [...prev, data.image]);
        }
        fetchProjectDetails(false);
      } else {
        notify(data.error || 'Failed to send reply.', 'error');
      }
    } catch (err) {
      console.error('Error sending developer message:', err);
      notify('Network error sending message.', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  // 2. Save Working Status
  const handleSaveWorkingStatus = async () => {
    if (!projectId || savingStatus) return;
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/developer/projects/${projectId}`, {
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
        notify(`Working status updated to ${data.project.working_status}!`);
      } else {
        notify(data.error || 'Failed to update working status.', 'error');
      }
    } catch (err) {
      notify('Network error updating status.', 'error');
    } finally {
      setSavingStatus(false);
    }
  };

  // 3. Save Payment & Quotation
  const handleSavePayment = async () => {
    if (!projectId || savingPayment) return;
    setSavingPayment(true);
    try {
      const budgetCents = Math.round(parseFloat(budgetVal || 0) * 100);
      const paidCents = Math.round(parseFloat(paidVal || 0) * 100);

      const res = await fetch(`/api/developer/projects/${projectId}`, {
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
        notify('Project quotation and payment terms updated!');
      } else {
        notify(data.error || 'Failed to update payment.', 'error');
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
      const res = await fetch(`/api/developer/projects/${projectId}`, {
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
      const res = await fetch(`/api/developer/projects/${projectId}`, {
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
      const res = await fetch(`/api/developer/projects/${projectId}`, {
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
    PENDING_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
    ACCEPTED: 'bg-blue-50 text-blue-700 border-blue-200',
    IN_PROGRESS: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    UNDER_REVIEW: 'bg-purple-50 text-purple-700 border-purple-200',
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ON_HOLD: 'bg-slate-100 text-slate-700 border-slate-200',
    CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const paymentStatusStyles = {
    PENDING_QUOTE: 'bg-amber-50 text-amber-700 border-amber-200',
    UNPAID: 'bg-rose-50 text-rose-700 border-rose-200',
    PARTIAL: 'bg-blue-50 text-blue-700 border-blue-200',
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REFUNDED: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <BiLoaderAlt className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading project workspace...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-lg mx-auto my-12">
        <BiBriefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Custom Project Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          {error || 'The requested custom project does not exist or was deleted.'}
        </p>
        <Link
          href="/developer/projects"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
        >
          <BiArrowBack className="w-4 h-4" />
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {actionNotice.text && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-xs transition-all ${
            actionNotice.type === 'error'
              ? 'bg-rose-50 border border-rose-200 text-rose-800'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          <span>{actionNotice.text}</span>
          <button
            onClick={() => setActionNotice({ text: '', type: '' })}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <BiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <Link
              href="/developer/projects"
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer mt-0.5"
              title="Back to projects"
            >
              <BiArrowBack className="w-5 h-5" />
            </Link>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  #{project.project_number}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                    workingStatusStyles[project.working_status] || 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {project.working_status ? project.working_status.replace('_', ' ') : 'PENDING'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                    paymentStatusStyles[project.payment_status] || 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {project.payment_status ? project.payment_status.replace('_', ' ') : 'PENDING QUOTE'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  {project.category || 'Custom Project'}
                </span>
              </div>

              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{project.title}</h1>

              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                <span>
                  Creator:{' '}
                  <strong className="text-slate-700">
                    {project.creator_name || `Creator #${project.creator_id}`}
                  </strong>{' '}
                  ({project.creator_email})
                </span>
                <span>•</span>
                <span>Created {new Date(project.created_at).toLocaleString()}</span>
                {project.assigned_dev_name && (
                  <>
                    <span>•</span>
                    <span className="text-indigo-600 font-medium">
                      Assigned to {project.assigned_dev_name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh discussion"
            >
              <BiRefresh className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {canManage && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                title="Delete project"
              >
                <BiTrash className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Discussion & Activity Thread (2 cols on lg) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Initial Scope / Description Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
              <BiFile className="w-4 h-4 text-indigo-500" />
              Project Scope & Requirements
            </h3>
            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-3.5">
              {project.description || 'No detailed scope provided.'}
            </p>
          </div>

          {/* Conversation Thread */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col h-[560px]">
            {/* Thread Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BiBriefcase className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900">Custom Project Discussion</h3>
                <span className="text-[10px] text-slate-500 font-mono bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  {messages.length} messages
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Live sync active</span>
            </div>

            {/* Scrollable Messages Container */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                  <BiBriefcase className="w-8 h-8 text-slate-300 mb-2" />
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
                          className={`text-[11px] font-bold ${
                            isStaff ? 'text-indigo-600' : 'text-slate-700'
                          }`}
                        >
                          {m.sender_name || (isStaff ? 'Developer' : 'Creator')}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase ${
                            isStaff
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
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
                        className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                          isStaff
                            ? 'bg-indigo-600 text-white rounded-tr-xs'
                            : 'bg-slate-100 text-slate-800 rounded-tl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.message}</p>

                        {/* Attachments if any */}
                        {msgImages.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-white/20 flex flex-wrap gap-2">
                            {msgImages.map((img) => (
                              <button
                                key={img.id}
                                type="button"
                                onClick={() => setPreviewImage(img.image_url)}
                                className="group relative rounded-lg overflow-hidden border border-white/30 bg-black/10 hover:opacity-90 transition-opacity"
                              >
                                <img
                                  src={img.image_url}
                                  alt={img.file_name || 'Attachment'}
                                  className="w-24 h-24 object-cover"
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
            <div className="p-3 border-t border-slate-200 bg-white">
              {showAttachmentInput && (
                <div className="mb-2 p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-xs">
                  <BiImage className="w-4 h-4 text-slate-400" />
                  <input
                    type="url"
                    value={replyImageUrl}
                    onChange={(e) => setReplyImageUrl(e.target.value)}
                    placeholder="Enter image / mockup URL (https://...)"
                    className="flex-1 bg-transparent border-none text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setReplyImageUrl('');
                      setShowAttachmentInput(false);
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <BiX className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAttachmentInput((prev) => !prev)}
                  className={`p-2.5 rounded-xl border border-slate-200 transition-colors ${
                    showAttachmentInput || replyImageUrl
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                  title="Attach mockup or screenshot URL"
                >
                  <BiImage className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type an update or response to the creator..."
                  disabled={sendingReply}
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-400 focus:bg-white"
                />

                <button
                  type="submit"
                  disabled={sendingReply || !replyMessage.trim()}
                  className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {sendingReply ? (
                    <BiLoaderAlt className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Send</span>
                      <BiSend className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: Project Control Panel & Details */}
        <div className="space-y-6">
          {/* 1. Working Status Selector Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Working Progress Status</span>
              <span
                className={`text-[9px] px-2 py-0.5 rounded-full font-bold border uppercase ${
                  workingStatusStyles[project.working_status] || 'bg-slate-100 text-slate-600'
                }`}
              >
                {project.working_status}
              </span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Change Project Phase
                </label>
                <select
                  value={targetWorkingStatus}
                  onChange={(e) => setTargetWorkingStatus(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-indigo-400"
                >
                  <option value="PENDING_REVIEW">PENDING REVIEW (Under evaluation)</option>
                  <option value="ACCEPTED">ACCEPTED (Approved & scheduled)</option>
                  <option value="IN_PROGRESS">IN PROGRESS (Actively developing)</option>
                  <option value="UNDER_REVIEW">UNDER REVIEW (Client QA & testing)</option>
                  <option value="COMPLETED">COMPLETED (Delivered & closed)</option>
                  <option value="ON_HOLD">ON HOLD</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleSaveWorkingStatus}
                disabled={savingStatus || targetWorkingStatus === project.working_status}
                className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {savingStatus ? (
                  <BiLoaderAlt className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <BiCheckCircle className="w-3.5 h-3.5" />
                    <span>Save Working Status</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 2. Quotation & Financials Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Financial Quotation & Payments</span>
              <BiDollarCircle className="w-4 h-4 text-emerald-600" />
            </h3>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Quoted Budget
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={budgetVal}
                      onChange={(e) => setBudgetVal(e.target.value)}
                      className="w-full pl-6 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-indigo-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Amount Paid
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={paidVal}
                      onChange={(e) => setPaidVal(e.target.value)}
                      className="w-full pl-6 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-indigo-400"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Payment Status
                </label>
                <select
                  value={targetPaymentStatus}
                  onChange={(e) => setTargetPaymentStatus(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-indigo-400"
                >
                  <option value="PENDING_QUOTE">PENDING QUOTE</option>
                  <option value="UNPAID">UNPAID (Quote presented)</option>
                  <option value="PARTIAL">PARTIAL (Deposit received)</option>
                  <option value="PAID">PAID (Fully paid)</option>
                  <option value="REFUNDED">REFUNDED</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Currency
                </label>
                <select
                  value={currencyVal}
                  onChange={(e) => setCurrencyVal(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden"
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
                className="w-full py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {savingPayment ? (
                  <BiLoaderAlt className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <BiDollarCircle className="w-4 h-4" />
                    <span>Update Quotation & Terms</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3. Assign Developer Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <BiUser className="w-4 h-4 text-indigo-500" />
              Assigned Developer
            </h3>

            <div className="space-y-3">
              <select
                value={assignedDevId}
                onChange={(e) => setAssignedDevId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-indigo-400"
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
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {savingDev ? (
                  <BiLoaderAlt className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Save Assignment</span>
                )}
              </button>
            </div>
          </div>

          {/* 4. Deliverables, Priority & Notes */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <BiLinkExternal className="w-4 h-4 text-slate-500" />
              Deliverables & Specs
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Deliverable / Preview URL
                </label>
                <input
                  type="url"
                  value={deliverableUrl}
                  onChange={(e) => setDeliverableUrl(e.target.value)}
                  placeholder="https://staging.domain.com or repo link"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-indigo-400"
                />
                {deliverableUrl && (
                  <a
                    href={deliverableUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline mt-1"
                  >
                    <span>Test link</span>
                    <BiLinkExternal className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Priority
                  </label>
                  <select
                    value={priorityVal}
                    onChange={(e) => setPriorityVal(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Target Deadline
                  </label>
                  <input
                    type="date"
                    value={deadlineVal}
                    onChange={(e) => setDeadlineVal(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Internal Engineering Notes
                </label>
                <textarea
                  rows={3}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Private engineering notes, API credentials, milestones..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-indigo-400"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveDeliverables}
                disabled={savingDeliverables}
                className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {savingDeliverables ? (
                  <BiLoaderAlt className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <BiSave className="w-3.5 h-3.5" />
                    <span>Save Specifications</span>
                  </>
                )}
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
              className="max-w-full max-h-[90vh] rounded-xl object-contain"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 p-1.5 bg-white text-slate-800 rounded-full shadow-lg"
            >
              <BiX className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
