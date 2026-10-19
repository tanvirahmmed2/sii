'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { FiTrash2 } from 'react-icons/fi';

export default function ClubModeratorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const domain = params?.domain || '';
  const initialClubId = searchParams.get('club_id');

  const [clubs, setClubs] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState(initialClubId || '');
  const [selectedClubMembers, setSelectedClubMembers] = useState([]);
  const [selectedClubChatMessages, setSelectedClubChatMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Moderator Assignment Form State
  const [assignedTeacherId, setAssignedTeacherId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Chat Box Form State
  const [chatTitle, setChatTitle] = useState('');
  const [chatDescription, setChatDescription] = useState('');
  const [creatingChat, setCreatingChat] = useState(false);
  const [chatMessageText, setChatMessageText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Inline Add Member State (NO popup)
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberStudentId, setNewMemberStudentId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('member');
  const [newMemberCanChat, setNewMemberCanChat] = useState(true);
  const [addingMember, setAddingMember] = useState(false);

  // Inline Delete State
  const [confirmDeleteMemberId, setConfirmDeleteMemberId] = useState(null);
  const [deletingMemberId, setDeletingMemberId] = useState(null);

  // Notifications
  const [toastMessage, setToastMessage] = useState(null);
  const [toastError, setToastError] = useState(null);

  const showToast = (msg, isError = false) => {
    if (isError) {
      setToastError(msg);
      setTimeout(() => setToastError(null), 4000);
    } else {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const loadData = async (targetClubId) => {
    setLoading(true);
    try {
      let url = `/api/${domain}/staff/panel/clubs/moderator`;
      if (targetClubId) {
        url += `?club_id=${targetClubId}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setClubs(data.clubs || []);
        setTeachers(data.teachers || []);
        setStudents(data.students || []);

        const activeId = targetClubId || (data.clubs?.[0]?.id ? String(data.clubs[0].id) : '');
        setSelectedClubId(String(activeId));

        if (activeId) {
          const activeClub = data.clubs.find((c) => String(c.id) === String(activeId));
          if (activeClub) {
            setAssignedTeacherId(activeClub.moderator_teacher_id ? String(activeClub.moderator_teacher_id) : '');
            setChatTitle(activeClub.chat_box_title || `${activeClub.name} Official Chat`);
          }
        }

        setSelectedClubMembers(data.selectedClubMembers || []);
        setSelectedClubChatMessages(data.selectedClubChatMessages || []);
      } else {
        showToast(data.error || 'Failed to load moderator details', true);
      }
    } catch (err) {
      console.error('Error loading moderator workstation:', err);
      showToast('Network error while loading moderator data.', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedClubId || initialClubId);
  }, [domain]);

  const handleClubSelect = (clubId) => {
    setSelectedClubId(clubId);
    loadData(clubId);
  };

  const currentClub = clubs.find((c) => String(c.id) === String(selectedClubId));

  // 1. Assign Teacher as Club Moderator
  const handleAssignModerator = async (e) => {
    e.preventDefault();
    if (!selectedClubId) {
      showToast('Please select a club first.', true);
      return;
    }

    setAssigning(true);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/clubs/moderator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_moderator',
          club_id: parseInt(selectedClubId, 10),
          teacher_id: assignedTeacherId ? parseInt(assignedTeacherId, 10) : null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Moderator assigned successfully.');
        loadData(selectedClubId);
      } else {
        showToast(data.error || 'Failed to assign moderator.', true);
      }
    } catch (err) {
      console.error('Assign moderator error:', err);
      showToast('Network error while assigning moderator.', true);
    } finally {
      setAssigning(false);
    }
  };

  // 2. Create Chat Box for Club
  const handleCreateChatBox = async (e) => {
    e.preventDefault();
    if (!selectedClubId) return;

    setCreatingChat(true);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/clubs/moderator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_chat_box',
          club_id: parseInt(selectedClubId, 10),
          title: chatTitle.trim() || `${currentClub?.name || 'Club'} Official Chat`,
          description: chatDescription.trim() || `Communication and live discussion for ${currentClub?.name}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Chat Box created successfully.');
        loadData(selectedClubId);
      } else {
        showToast(data.error || 'Failed to create chat box', true);
      }
    } catch (err) {
      console.error('Create chat error:', err);
      showToast('Network error while creating chat box.', true);
    } finally {
      setCreatingChat(false);
    }
  };

  // 3. Toggle Chat Box Status
  const handleToggleChatBox = async (newActiveStatus) => {
    if (!selectedClubId) return;
    try {
      const res = await fetch(`/api/${domain}/staff/panel/clubs/moderator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_chat_box',
          club_id: parseInt(selectedClubId, 10),
          is_active: newActiveStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Chat box status updated.');
        loadData(selectedClubId);
      } else {
        showToast(data.error || 'Failed to update chat box status', true);
      }
    } catch (err) {
      console.error('Toggle chat error:', err);
      showToast('Network error.', true);
    }
  };

  // 4. Send Message from Workstation
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessageText.trim() || !selectedClubId) return;

    setSendingMsg(true);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/clubs/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          club_id: parseInt(selectedClubId, 10),
          message: chatMessageText.trim(),
          sender_name: currentClub?.moderator_name || 'Faculty Moderator',
          sender_type: 'teacher',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setChatMessageText('');
        loadData(selectedClubId);
      } else {
        showToast(data.error || 'Failed to send message', true);
      }
    } catch (err) {
      console.error('Send message error:', err);
      showToast('Network error while sending message', true);
    } finally {
      setSendingMsg(false);
    }
  };

  // 5. Add Member with Chat Box Access (Inline)
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedClubId || !newMemberStudentId) {
      showToast('Please select a student.', true);
      return;
    }

    setAddingMember(true);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/clubs/moderator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_member',
          club_id: parseInt(selectedClubId, 10),
          student_id: parseInt(newMemberStudentId, 10),
          role: newMemberRole,
          status: 'active',
          can_access_chat: newMemberCanChat,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Student enrolled successfully.');
        setIsAddMemberOpen(false);
        setNewMemberStudentId('');
        loadData(selectedClubId);
      } else {
        showToast(data.error || 'Failed to enroll student.', true);
      }
    } catch (err) {
      console.error('Add member error:', err);
      showToast('Network error while adding club member.', true);
    } finally {
      setAddingMember(false);
    }
  };

  // 6. Toggle Member Chat Access
  const handleToggleMemberChat = async (memberId, currentAccess) => {
    try {
      const res = await fetch(`/api/${domain}/staff/panel/clubs/moderator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_member_chat',
          member_id: memberId,
          can_access_chat: !currentAccess,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        loadData(selectedClubId);
      } else {
        showToast(data.error || 'Failed to update member chat access.', true);
      }
    } catch (err) {
      console.error('Toggle member chat error:', err);
      showToast('Network error.', true);
    }
  };

  // 7. Delete Member
  const handleRemoveMember = async (memberId) => {
    setDeletingMemberId(memberId);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/clubs/members?id=${memberId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast('Member removed from club.');
        setConfirmDeleteMemberId(null);
        loadData(selectedClubId);
      } else {
        showToast(data.error || 'Failed to remove member.', true);
      }
    } catch (err) {
      console.error('Remove member error:', err);
      showToast('Network error.', true);
    } finally {
      setDeletingMemberId(null);
    }
  };

  const hasChat = currentClub?.has_chat_box || currentClub?.chat_id;
  const isChatActive = (currentClub?.chat_box_status === 'active' || currentClub?.chat_is_active) && hasChat;

  return (
    <div className="w-full space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 rounded text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-2xs">
          <span>{toastMessage}</span>
          <span className="text-[10px] font-mono uppercase">OK</span>
        </div>
      )}
      {toastError && (
        <div className="p-3 rounded text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-between shadow-2xs">
          <span>{toastError}</span>
          <span className="text-[10px] font-mono uppercase">ERROR</span>
        </div>
      )}

      {/* Top Club Selector Bar */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Club Moderator &amp; Chat Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Assign faculty moderators, initialize official chat boxes, and manage student member chat authorization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
            Select Club:
          </label>
          <select
            value={selectedClubId}
            onChange={(e) => handleClubSelect(e.target.value)}
            className="text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
          >
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.category || 'General'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="w-full p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">
          Loading moderator configuration workstation...
        </div>
      ) : !currentClub ? (
        <div className="w-full p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">
          No clubs registered yet. Please create a club first.
        </div>
      ) : (
        <div className="w-full space-y-4">
          {/* Section 1 & Section 2: Moderator Assignment & Chat Box Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Panel 1: Faculty Moderator Assignment */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Assigned Faculty Moderator
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Faculty member responsible for guiding {currentClub.name}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                    currentClub.moderator_name
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                  }`}
                >
                  {currentClub.moderator_name ? 'Assigned' : 'Vacant'}
                </span>
              </div>

              {/* Current Moderator Details */}
              {currentClub.moderator_name ? (
                <div className="flex items-center gap-3 p-3 rounded border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  {currentClub.moderator_photo ? (
                    <img
                      src={currentClub.moderator_photo}
                      alt={currentClub.moderator_name}
                      className="w-10 h-10 rounded object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center shrink-0 border border-primary/20">
                      {currentClub.moderator_name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {currentClub.moderator_name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {currentClub.moderator_designation || 'Faculty Member'} &bull; {currentClub.moderator_email}
                    </p>
                    {currentClub.moderator_phone && (
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Tel: {currentClub.moderator_phone}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
                  No teacher is currently assigned as moderator for this club.
                </div>
              )}

              {/* Change / Reassign Form */}
              <form onSubmit={handleAssignModerator} className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Assign Faculty Teacher
                  </label>
                  <select
                    value={assignedTeacherId}
                    onChange={(e) => setAssignedTeacherId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="">Unassigned (Remove Moderator)</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.designation ? `(${t.designation})` : ''} - {t.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={assigning}
                    className="px-3.5 py-1.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer transition disabled:opacity-50"
                  >
                    {assigning ? 'Updating...' : 'Save Moderator Assignment'}
                  </button>
                </div>
              </form>
            </div>

            {/* Panel 2: Club Official Chat Box */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Club Live Chat Box
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Real-time discussion box created by the assigned moderator
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                    isChatActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                      : hasChat
                      ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                      : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                  }`}
                >
                  {isChatActive ? 'Active' : hasChat ? 'Paused' : 'Not Created'}
                </span>
              </div>

              {!hasChat ? (
                /* Chat not created yet - Create Box CTA */
                <form onSubmit={handleCreateChatBox} className="space-y-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Initialize a designated chat box for <strong>{currentClub.name}</strong>. The assigned moderator teacher and approved members can communicate in real time.
                  </p>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Chat Box Title
                    </label>
                    <input
                      type="text"
                      value={chatTitle}
                      onChange={(e) => setChatTitle(e.target.value)}
                      placeholder={`${currentClub.name} Official Chat`}
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Room Description
                    </label>
                    <input
                      type="text"
                      value={chatDescription}
                      onChange={(e) => setChatDescription(e.target.value)}
                      placeholder="Official communication channel for active members"
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={creatingChat}
                      className="px-3.5 py-1.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer transition disabled:opacity-50"
                    >
                      {creatingChat ? 'Creating...' : '+ Create Chat Box'}
                    </button>
                  </div>
                </form>
              ) : (
                /* Chat is already created - Show status and toggle */
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        {currentClub.chat_title || currentClub.chat_box_title || `${currentClub.name} Chat`}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {currentClub.chat_access_count || 0} members authorized to post &bull; Status: {currentClub.chat_box_status || 'active'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleToggleChatBox(!isChatActive)}
                      className={`px-3 py-1 rounded text-xs font-medium border cursor-pointer transition ${
                        isChatActive
                          ? 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400'
                          : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {isChatActive ? 'Pause Chat' : 'Resume Chat'}
                    </button>
                  </div>

                  {/* Quick message stream preview */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded p-3 h-44 overflow-y-auto space-y-2 bg-slate-50 dark:bg-slate-950/40">
                    {selectedClubChatMessages.length === 0 ? (
                      <p className="text-center text-[11px] text-slate-400 pt-12">
                        No messages exchanged yet. Send the first announcement below.
                      </p>
                    ) : (
                      selectedClubChatMessages.map((msg) => (
                        <div key={msg.id} className="text-xs space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                              {msg.sender_name}
                            </span>
                            <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {msg.sender_type}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded px-2.5 py-1 text-[11px]">
                            {msg.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Send Moderator Broadcast Form */}
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Post an announcement or message into the club chat box..."
                      value={chatMessageText}
                      onChange={(e) => setChatMessageText(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="submit"
                      disabled={sendingMsg || !chatMessageText.trim()}
                      className="px-3.5 py-1.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer transition disabled:opacity-50"
                    >
                      {sendingMsg ? 'Posting...' : 'Send'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Club Members & Chat Access Permission Workstation */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Club Members &amp; Chat Access Control
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  The moderator can add students to the club and grant or revoke their access to the live chat box.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-500">
                  {selectedClubMembers.length} Members ({selectedClubMembers.filter((m) => m.can_access_chat).length} Chat Authorized)
                </span>
                <button
                  onClick={() => setIsAddMemberOpen(!isAddMemberOpen)}
                  className="px-3 py-1.5 rounded text-xs font-medium bg-primary hover:bg-primary-dark text-white cursor-pointer transition"
                >
                  {isAddMemberOpen ? 'Close Form' : '+ Add Club Member'}
                </button>
              </div>
            </div>

            {/* Inline Add Member Panel (NO popup) */}
            {isAddMemberOpen && (
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-primary/30 rounded p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                    Enroll Student into {currentClub.name}
                  </h4>
                  <button
                    onClick={() => setIsAddMemberOpen(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleAddMember} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Select Student *
                      </label>
                      <select
                        required
                        value={newMemberStudentId}
                        onChange={(e) => setNewMemberStudentId(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                      >
                        <option value="">Select an enrolled student...</option>
                        {students.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.registration_no || `Roll: ${s.roll_no}`}) - {s.class_name || 'Class'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Club Position / Role
                      </label>
                      <select
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                      >
                        <option value="member">General Member</option>
                        <option value="executive">Executive Committee Member</option>
                        <option value="president">President</option>
                        <option value="general_secretary">General Secretary</option>
                        <option value="treasurer">Treasurer</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="newMemberCanChat"
                        checked={newMemberCanChat}
                        onChange={(e) => setNewMemberCanChat(e.target.checked)}
                        className="rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                      />
                      <label htmlFor="newMemberCanChat" className="text-xs font-medium text-slate-900 dark:text-white cursor-pointer">
                        Grant Access to Club Chat Box
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddMemberOpen(false)}
                        className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={addingMember}
                        className="px-4 py-1.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer transition disabled:opacity-50"
                      >
                        {addingMember ? 'Enrolling...' : 'Enroll Student'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Member List Table */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Student Name</th>
                    <th className="px-3 py-2">Reg No / Roll</th>
                    <th className="px-3 py-2">Class</th>
                    <th className="px-3 py-2">Club Role</th>
                    <th className="px-3 py-2 text-center">Chat Box Access</th>
                    <th className="px-3 py-2">Membership Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                  {selectedClubMembers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-3 py-8 text-center text-slate-400">
                        No student members added to this club yet. Click &quot;+ Add Club Member&quot; to enroll members.
                      </td>
                    </tr>
                  ) : (
                    selectedClubMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                          {member.student_name || `Student #${member.student_id}`}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-500">
                          {member.registration_no || member.roll_no || '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-500">
                          {member.class_name || 'General'}
                        </td>
                        <td className="px-3 py-2">
                          <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                            {member.role?.replace('_', ' ') || 'member'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => handleToggleMemberChat(member.id, member.can_access_chat)}
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border cursor-pointer transition ${
                              member.can_access_chat
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                            }`}
                            title="Click to toggle chat box access"
                          >
                            {member.can_access_chat ? 'Granted (Can Chat)' : 'Restricted (No Chat)'}
                          </button>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border capitalize ${
                              member.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {member.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {confirmDeleteMemberId === member.id ? (
                            <div className="inline-flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-1 rounded">
                              <span className="text-[10px] text-rose-700 dark:text-rose-300">Remove?</span>
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                disabled={deletingMemberId === member.id}
                                className="px-1.5 py-0.5 bg-rose-600 text-white text-[10px] rounded cursor-pointer"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setConfirmDeleteMemberId(null)}
                                className="px-1.5 py-0.5 border border-slate-300 text-slate-600 text-[10px] rounded cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteMemberId(member.id)}
                              className="p-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer inline-flex items-center"
                              title="Remove Member"
                            >
                              <FiTrash2 className="text-xs" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
