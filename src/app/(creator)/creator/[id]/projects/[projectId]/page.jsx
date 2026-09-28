'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCreator } from '../../layout';
import {
  BiArrowBack,
  BiSend,
  BiRefresh,
  BiCheckCircle,
  BiTimeFive,
  BiLoaderAlt,
  BiBriefcase,
  BiUser,
  BiX,
  BiCheckShield,
  BiDollarCircle,
  BiImage,
  BiLinkExternal,
  BiCalendar,
  BiFile,
} from 'react-icons/bi';

export default function CreatorSingleProjectPage() {
  const params = useParams();
  const router = useRouter();
  const creatorId = params?.id;
  const projectId = params?.projectId;

  const { creator } = useCreator();

  const [project, setProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [replyImageUrl, setReplyImageUrl] = useState('');
  const [showAttachment, setShowAttachment] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch project details and discussion thread
  const fetchProjectThread = useCallback(async (showLoading = false) => {
    if (!projectId || !creatorId) return;
    try {
      if (showLoading) setLoading(true);
      setError('');
      const res = await fetch(`/api/creator/projects/${projectId}?creatorId=${creatorId}`);
      const data = await res.json();
      if (data.success && data.project) {
        setProject(data.project);
        setMessages(data.messages || []);
        setImages(data.images || []);
      } else {
        setError(data.error || 'Custom project not found.');
      }
    } catch (err) {
      console.error('Error fetching project thread:', err);
      setError('Network error while loading project conversation.');
    } finally {
      setLoading(false);
    }
  }, [projectId, creatorId]);

  useEffect(() => {
    fetchProjectThread(true);
  }, [fetchProjectThread]);

  // Real-time polling every 4 seconds
  useEffect(() => {
    if (!projectId || !creatorId) return;
    const interval = setInterval(() => {
      fetchProjectThread(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [projectId, creatorId, fetchProjectThread]);

  const handleManualRefresh = async () => {
    if (!projectId || refreshing) return;
    setRefreshing(true);
    await fetchProjectThread(false);
    setRefreshing(false);
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!replyMessage.trim() || sendingReply || !projectId) return;

    const messageText = replyMessage.trim();
    const imageUrl = replyImageUrl.trim() || null;
    setSendingReply(true);

    try {
      const res = await fetch(`/api/creator/projects/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: Number(creatorId),
          message: messageText,
          image_url: imageUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setReplyMessage('');
        setReplyImageUrl('');
        setShowAttachment(false);
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
        }
        if (data.image) {
          setImages((prev) => [...prev, data.image]);
        }
        fetchProjectThread(false);
      } else {
        alert(data.error || 'Failed to send message.');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Network error sending message.');
    } finally {
      setSendingReply(false);
    }
  };

  const workingStatusStyles = {
    PENDING_REVIEW: {
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      label: 'Pending Review',
      description: 'Our engineering team is evaluating your specifications and preparing a quote.',
      progress: '15%',
    },
    ACCEPTED: {
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      label: 'Accepted',
      description: 'Project accepted! Scheduled for development kickoff.',
      progress: '30%',
    },
    IN_PROGRESS: {
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      label: 'In Progress',
      description: 'Developers are actively writing code and building your features.',
      progress: '65%',
    },
    UNDER_REVIEW: {
      badge: 'bg-purple-50 text-purple-700 border-purple-200',
      label: 'Under Review',
      description: 'Initial build complete! Ready for your testing and review.',
      progress: '85%',
    },
    COMPLETED: {
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      label: 'Completed',
      description: 'All milestones completed and delivered.',
      progress: '100%',
    },
    ON_HOLD: {
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
      label: 'On Hold',
      description: 'On hold awaiting further clarification.',
      progress: '25%',
    },
    CANCELLED: {
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      label: 'Cancelled',
      description: 'Project has been cancelled.',
      progress: '0%',
    },
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
      <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto my-12 shadow-xs">
        <BiBriefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Custom Project Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          {error || 'This custom project does not exist or has been removed.'}
        </p>
        <Link
          href={`/creator/${creatorId}/projects`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-semibold transition-colors"
        >
          <BiArrowBack className="w-4 h-4" />
          Back to Custom Projects
        </Link>
      </div>
    );
  }

  const statusInfo = workingStatusStyles[project.working_status] || {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    label: project.working_status,
    description: 'Working status updated.',
    progress: '50%',
  };

  const budgetDollars = (Number(project.budget_in_cents || 0) / 100).toFixed(2);
  const paidDollars = (Number(project.paid_amount_in_cents || 0) / 100).toFixed(2);
  const balanceDollars = Math.max(0, (Number(project.budget_in_cents || 0) - Number(project.paid_amount_in_cents || 0)) / 100).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Top Navigation & Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <Link
              href={`/creator/${creatorId}/projects`}
              className="p-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer mt-1"
              title="Back to projects"
            >
              <BiArrowBack className="w-5 h-5" />
            </Link>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                  #{project.project_number}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusInfo.badge}`}
                >
                  {statusInfo.label}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                    paymentStatusStyles[project.payment_status] || 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {project.payment_status ? project.payment_status.replace('_', ' ') : 'PENDING QUOTE'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  {project.category ? project.category.replace('_', ' ') : 'Custom Project'}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {project.title}
              </h1>

              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                {project.deadline && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                      <BiCalendar className="w-3.5 h-3.5 text-slate-400" />
                      Target Deadline: {new Date(project.deadline).toLocaleDateString()}
                    </span>
                  </>
                )}
                {project.assigned_dev_name && (
                  <>
                    <span>•</span>
                    <span className="text-indigo-600 font-medium">
                      Lead Developer: {project.assigned_dev_name}
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
              className="p-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh discussion"
            >
              <BiRefresh className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Status Progress & Quotation Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Working Status Tracker */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <BiTimeFive className="w-4 h-4 text-indigo-500" />
                Working Phase
              </span>
              <span className="text-xs font-bold text-indigo-600">{statusInfo.label}</span>
            </div>

            <p className="text-xs text-slate-600 mb-4">{statusInfo.description}</p>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{ width: statusInfo.progress }}
              />
            </div>
          </div>

          {/* Deliverable preview link if developer delivered */}
          {project.deliverable_url && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Project Deliverable / Preview:</span>
              <a
                href={project.deliverable_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors"
              >
                <span>Open Deliverable Preview</span>
                <BiLinkExternal className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Financial & Quotation Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <BiDollarCircle className="w-4 h-4 text-emerald-600" />
                Quotation & Billing
              </span>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                  paymentStatusStyles[project.payment_status] || 'bg-slate-100 text-slate-600'
                }`}
              >
                {project.payment_status ? project.payment_status.replace('_', ' ') : 'PENDING'}
              </span>
            </div>

            <div className="space-y-1.5 mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Quoted Budget:</span>
                <span className="font-bold text-slate-900">
                  {Number(project.budget_in_cents || 0) > 0
                    ? `$${budgetDollars} ${project.currency || 'USD'}`
                    : 'Awaiting Quote'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Paid Amount:</span>
                <span className="font-bold text-emerald-600">${paidDollars}</span>
              </div>

              {Number(project.budget_in_cents || 0) > 0 && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <span className="text-slate-700 font-medium">Balance Due:</span>
                  <span className="font-bold text-slate-900">${balanceDollars}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Payment terms and invoices are finalized directly in coordination with our development team.
          </div>
        </div>
      </div>

      {/* Main Conversation & Details Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Scope & Project Specs (1 col on lg) */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <BiFile className="w-4 h-4 text-indigo-500" />
              Project Specifications
            </h3>
            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 border border-slate-100 rounded-2xl p-4">
              {project.description || 'No detailed specifications.'}
            </p>

            {/* Images attached initially */}
            {images.filter((img) => !img.message_id).length > 0 && (
              <div className="mt-4">
                <span className="text-[11px] font-semibold text-slate-600 block mb-2">
                  Initial Mockups & Attachments:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {images
                    .filter((img) => !img.message_id)
                    .map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setPreviewImage(img.image_url)}
                        className="group relative rounded-xl overflow-hidden border border-slate-200 hover:opacity-90"
                      >
                        <img
                          src={img.image_url}
                          alt={img.file_name || 'Mockup'}
                          className="w-full h-24 object-cover"
                        />
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Discussion Thread (2 cols on lg) */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden flex flex-col h-[600px]">
            {/* Thread Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BiBriefcase className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Project Discussion & Coordination</h3>
                <span className="text-[10px] text-slate-500 font-mono bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  {messages.length} messages
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Real-time sync</span>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                  <BiBriefcase className="w-10 h-10 text-slate-300 mb-2" />
                  <span>No messages yet. Send a message to discuss your project!</span>
                </div>
              ) : (
                messages.map((m) => {
                  const isCreator = m.sender_type === 'CREATOR';
                  const msgImages = images.filter((img) => img.message_id === m.id);

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isCreator ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span
                          className={`text-[11px] font-bold ${
                            isCreator ? 'text-indigo-600' : 'text-slate-800'
                          }`}
                        >
                          {m.sender_name || (isCreator ? 'You' : 'Engineering Team')}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase ${
                            isCreator
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {m.sender_type === 'CREATOR' ? 'Creator' : 'Developer'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(m.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div
                        className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                          isCreator
                            ? 'bg-slate-900 text-white rounded-tr-xs shadow-xs'
                            : 'bg-slate-100 text-slate-800 rounded-tl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.message}</p>

                        {/* Images */}
                        {msgImages.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-white/20 flex flex-wrap gap-2">
                            {msgImages.map((img) => (
                              <button
                                key={img.id}
                                type="button"
                                onClick={() => setPreviewImage(img.image_url)}
                                className="group relative rounded-xl overflow-hidden border border-white/30 hover:opacity-90"
                              >
                                <img
                                  src={img.image_url}
                                  alt={img.file_name || 'Attachment'}
                                  className="w-24 h-24 object-cover"
                                />
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

            {/* Reply Composer */}
            <div className="p-3 sm:p-4 border-t border-slate-200 bg-white">
              {showAttachment && (
                <div className="mb-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-2 text-xs">
                  <BiImage className="w-4 h-4 text-slate-400" />
                  <input
                    type="url"
                    value={replyImageUrl}
                    onChange={(e) => setReplyImageUrl(e.target.value)}
                    placeholder="Paste reference image or mockup URL (https://...)"
                    className="flex-1 bg-transparent border-none text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setReplyImageUrl('');
                      setShowAttachment(false);
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
                  onClick={() => setShowAttachment((prev) => !prev)}
                  className={`p-2.5 rounded-2xl border border-slate-200 transition-colors ${
                    showAttachment || replyImageUrl
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                  title="Attach mockup or screenshot"
                >
                  <BiImage className="w-5 h-5" />
                </button>

                <input
                  type="text"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your message to the developers..."
                  disabled={sendingReply}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-slate-400 focus:bg-white"
                />

                <button
                  type="submit"
                  disabled={sendingReply || !replyMessage.trim()}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {sendingReply ? (
                    <BiLoaderAlt className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Send</span>
                      <BiSend className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
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
              alt="Preview"
              className="max-w-full max-h-[90vh] rounded-2xl object-contain"
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
