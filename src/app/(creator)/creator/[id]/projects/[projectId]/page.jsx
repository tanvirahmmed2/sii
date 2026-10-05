'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function CreatorSingleProjectPage() {
  const params = useParams();
  const creatorId = params?.id;
  const projectId = params?.projectId;

  const [project, setProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchProjectThread = useCallback(async (showLoading = false) => {
    if (!projectId || !creatorId) return;
    try {
      if (showLoading) setLoading(true);
      setError('');
      const res = await fetch(`/api/marketing/creator/projects/${projectId}?creatorId=${creatorId}`);
      const data = await res.json();
      if (data.success && data.project) {
        setProject(data.project);
        setMessages(data.messages || []);
      } else {
        setError(data.error || 'Custom project not found.');
      }
    } catch (_) {
      setError('Network error while loading project conversation.');
    } finally {
      setLoading(false);
    }
  }, [projectId, creatorId]);

  useEffect(() => {
    fetchProjectThread(true);
  }, [fetchProjectThread]);

  // Polling every 5s
  useEffect(() => {
    if (!projectId || !creatorId) return;
    const interval = setInterval(() => {
      fetchProjectThread(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [projectId, creatorId, fetchProjectThread]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchProjectThread(false);
    setRefreshing(false);
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || sendingReply) return;

    setSendingReply(true);
    try {
      const res = await fetch(`/api/marketing/creator/projects/${projectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderType: 'CREATOR',
          creatorId: Number(creatorId),
          message: replyMessage.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setReplyMessage('');
        await fetchProjectThread(false);
      } else {
        alert(data.error || 'Failed to send message.');
      }
    } catch {
      alert('Network error sending message.');
    } finally {
      setSendingReply(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-xs text-slate-500 font-medium">
        Loading project details...
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="w-full py-8 text-center space-y-3 text-xs">
        <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
          {error || 'Project not found.'}
        </div>
        <Link
          href={`/creator/${creatorId}/projects`}
          className="text-slate-800 font-semibold underline"
        >
          &larr; Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 text-xs text-slate-800">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href={`/creator/${creatorId}/projects`}
          className="text-slate-600 hover:text-slate-900 font-medium"
        >
          &larr; Back to Projects
        </Link>
        <button
          type="button"
          onClick={handleManualRefresh}
          className="px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Project Overview Card */}
      <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] uppercase font-semibold text-slate-400">
                Project #{project.id}
              </span>
              <span
                className={`text-[9px] font-medium px-1.5 py-0.2 rounded border ${
                  project.status === 'COMPLETED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : project.status === 'IN_PROGRESS'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {project.status || 'PENDING'}
              </span>
            </div>
            <h1 className="text-sm font-semibold text-slate-900">{project.title}</h1>
          </div>

          <div className="text-right font-mono text-[11px] text-slate-500">
            <div>Budget: <span className="font-semibold text-slate-900">${(Number(project.budget_in_cents || 0) / 100).toFixed(2)}</span></div>
            <div>Deadline: {project.target_deadline ? new Date(project.target_deadline).toLocaleDateString() : '—'}</div>
          </div>
        </div>

        {project.description && (
          <p className="text-slate-600 text-xs leading-normal bg-slate-50 p-2.5 rounded border border-slate-100">
            {project.description}
          </p>
        )}
      </div>

      {/* Developer Collaboration Chat */}
      <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
        <div className="border-b border-slate-100 pb-2">
          <h2 className="text-xs font-semibold text-slate-900">
            Developer Collaboration & Updates ({messages.length})
          </h2>
        </div>

        <div className="space-y-3 min-h-[160px] max-h-[400px] overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <p className="text-slate-400 italic text-center py-6">
              No messages in this project thread yet. Use the input below to collaborate with developers.
            </p>
          ) : (
            messages.map((m) => {
              const isCreator = m.sender_type === 'CREATOR';

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isCreator ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-slate-400">
                    <span className="font-medium text-slate-700">
                      {isCreator ? 'You' : m.sender_name || 'Assigned Developer'}
                    </span>
                    <span>&middot;</span>
                    <span className="font-mono">
                      {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  <div
                    className={`p-2.5 rounded max-w-md text-xs leading-normal ${
                      isCreator
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-900 border border-slate-200'
                    }`}
                  >
                    {m.message}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Form */}
        <form onSubmit={handleSendReply} className="pt-2 border-t border-slate-100 flex gap-2">
          <input
            type="text"
            required
            placeholder="Send message to developers..."
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            className="flex-1 bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
          />
          <button
            type="submit"
            disabled={sendingReply || !replyMessage.trim()}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium disabled:opacity-50 cursor-pointer"
          >
            {sendingReply ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
