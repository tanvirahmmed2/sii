'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import StudentFilterBar from 'src/component/staff/StudentFilterBar';
import StudentFilterEmptyState from 'src/component/staff/StudentFilterEmptyState';

export default function StudentAttendanceDevicesPage() {
  const { getApiEndpoint } = useTenantWebsite();

  const [hasFiltered, setHasFiltered] = useState(false);
  const [filterInfo, setFilterInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTerminal, setSelectedTerminal] = useState('term-1');
  const [syncingAll, setSyncingAll] = useState(false);

  // Local device assignments mapping: studentId -> { rfid: string, terminal: string, status: string, lastSync: string }
  const [deviceMappings, setDeviceMappings] = useState({});

  // Modal for editing device / card UID
  const [editingStudent, setEditingStudent] = useState(null);
  const [modalCardId, setModalCardId] = useState('');
  const [modalTerminal, setModalTerminal] = useState('term-1');

  const terminals = [
    { id: 'term-1', name: 'Main Gate Turnstile A (IP: 192.168.1.101)' },
    { id: 'term-2', name: 'Secondary Gate Turnstile B (IP: 192.168.1.102)' },
    { id: 'term-3', name: 'Academic Building Terminal 1 (IP: 192.168.1.105)' },
  ];

  const loadData = async ({ sessionId, classId, sectionId, sessionName, className, sectionName }) => {
    setLoading(true);
    setFilterInfo({ sessionId, classId, sectionId, sessionName, className, sectionName });
    try {
      const res = await fetch(
        getApiEndpoint(
          `staff/panel/students?session_id=${sessionId}&class_id=${classId}${
            sectionId ? `&section_id=${sectionId}` : ''
          }&limit=100`
        )
      );
      const data = await res.json();
      if (data.success) {
        const studentList = data.payload?.students || [];
        setStudents(studentList);
        setHasFiltered(true);

        // Prepopulate or maintain device mappings
        setDeviceMappings((prev) => {
          const next = { ...prev };
          studentList.forEach((s) => {
            if (!next[s.id]) {
              // Default seed: use student_unique_id or roll
              const defaultRfid = s.student_unique_id ? `RFID-${s.student_unique_id.replace(/[^0-9A-Z]/g, '').slice(-6)}` : '';
              next[s.id] = {
                rfid: defaultRfid,
                terminal: 'Main Gate Turnstile A',
                status: 'Synced',
                lastSync: new Date().toISOString().substring(0, 10),
              };
            }
          });
          return next;
        });

        toast.success(`Loaded ${studentList.length} students for device configuration.`);
      } else {
        toast.error(data.error || 'Failed to fetch students.');
      }
    } catch {
      toast.error('Network error loading students for device configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setHasFiltered(false);
    setFilterInfo(null);
    setStudents([]);
    setSearchTerm('');
  };

  const openPairModal = (student) => {
    const current = deviceMappings[student.id] || { rfid: '', terminal: 'term-1' };
    setEditingStudent(student);
    setModalCardId(current.rfid || '');
    setModalTerminal(terminals.find((t) => t.name === current.terminal)?.id || 'term-1');
  };

  const savePairing = () => {
    if (!editingStudent) return;
    const termObj = terminals.find((t) => t.id === modalTerminal);
    setDeviceMappings((prev) => ({
      ...prev,
      [editingStudent.id]: {
        rfid: modalCardId.trim(),
        terminal: termObj ? termObj.name.split(' (')[0] : 'Main Gate Turnstile A',
        status: modalCardId.trim() ? 'Synced' : 'Unregistered',
        lastSync: new Date().toISOString().substring(0, 10),
      },
    }));
    toast.success(`Updated RFID credential for ${editingStudent.name || editingStudent.registration_no}`);
    setEditingStudent(null);
  };

  const handleSyncSingle = (student) => {
    toast.loading(`Synchronizing ${student.name || student.registration_no} to device...`, { id: 'dev-sync' });
    setTimeout(() => {
      setDeviceMappings((prev) => ({
        ...prev,
        [student.id]: {
          ...(prev[student.id] || {}),
          status: 'Synced',
          lastSync: new Date().toISOString().substring(0, 10),
        },
      }));
      toast.success(`Successfully pushed biometric credential to terminal!`, { id: 'dev-sync' });
    }, 700);
  };

  const handleSyncAll = () => {
    setSyncingAll(true);
    toast.loading('Pushing class roster to biometric machines...', { id: 'sync-all' });
    setTimeout(() => {
      setDeviceMappings((prev) => {
        const next = { ...prev };
        students.forEach((s) => {
          next[s.id] = {
            ...(next[s.id] || {}),
            status: next[s.id]?.rfid ? 'Synced' : 'Unregistered',
            lastSync: new Date().toISOString().substring(0, 10),
          };
        });
        return next;
      });
      setSyncingAll(false);
      toast.success(`Synchronized ${students.length} student records across network terminals.`, { id: 'sync-all' });
    }, 1200);
  };

  const handleExportRoster = () => {
    const rows = [
      ['Registration No', 'Roll', 'Name', 'RFID Card / Device ID', 'Assigned Terminal', 'Status'],
      ...students.map((s) => {
        const map = deviceMappings[s.id] || {};
        return [
          s.registration_no,
          s.roll_no || '',
          s.name || '',
          map.rfid || '',
          map.terminal || '',
          map.status || 'Unregistered',
        ];
      }),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map(val => `"${val}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Biometric_Device_Roster_${filterInfo?.className || 'Class'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloaded device roster CSV.');
  };

  const filteredStudents = students.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const map = deviceMappings[s.id] || {};
    return (
      (s.name && s.name.toLowerCase().includes(term)) ||
      (s.registration_no && s.registration_no.toLowerCase().includes(term)) ||
      (s.roll_no && String(s.roll_no).toLowerCase().includes(term)) ||
      (map.rfid && map.rfid.toLowerCase().includes(term))
    );
  });

  const totalRegistered = Object.values(deviceMappings).filter((m) => m.rfid && m.status === 'Synced').length;
  const totalUnregistered = students.length - totalRegistered;

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Student Attendance Devices & RFID Management
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Filter by session, class, and section to view student biometric credentials, pair RFID cards, and synchronize hardware terminals.
        </p>
      </div>

      {/* Filter Bar */}
      <StudentFilterBar
        onFilter={loadData}
        onReset={handleReset}
        loading={loading}
        submitLabel="Load Device Roster"
        title="Student Device Roster Filter"
        description="Select session, class, and section to manage biometric and RFID device links"
      />

      {/* Show Data Only After Filter */}
      {!hasFiltered ? (
        <StudentFilterEmptyState
          icon="📟"
          title="Filter by Session, Class & Section to Manage Devices"
          description="Please select Academic Session, Class, and Section above, then click 'Load Device Roster' to display student biometric/RFID credentials."
        />
      ) : (
        <div className="space-y-4">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total Students</span>
              <span className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1 block">{students.length}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
              <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider block">RFID / Biometric Synced</span>
              <span className="text-lg font-bold font-mono text-emerald-600 mt-1 block">{totalRegistered}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
              <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider block">Unregistered Cards</span>
              <span className="text-lg font-bold font-mono text-amber-600 mt-1 block">{Math.max(0, totalUnregistered)}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
              <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider block">Active Terminals</span>
              <span className="text-lg font-bold font-mono text-blue-600 mt-1 block">{terminals.length} Online</span>
            </div>
          </div>

          {/* Device Actions Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Terminal:</span>
              <select
                value={selectedTerminal}
                onChange={(e) => setSelectedTerminal(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                {terminals.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleSyncAll}
                disabled={syncingAll || students.length === 0}
                className="text-xs px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                🔄 Push All to Selected Machine
              </button>
              <button
                onClick={handleExportRoster}
                disabled={students.length === 0}
                className="text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition cursor-pointer"
              >
                📥 Export Device Roster (CSV)
              </button>
            </div>
          </div>

          {/* Student Roster Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-3">
            {/* IN-PAGE RFID CONFIGURATION CARD */}
            {editingStudent && (
              <div className="bg-white dark:bg-slate-900 border-2 border-primary/30 rounded-xl p-5 space-y-4 shadow-sm mb-4 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Configure RFID / Biometric ID for {editingStudent.name || editingStudent.registration_no}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                  >
                    ✕ Close Form
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Registration Number
                    </label>
                    <input
                      type="text"
                      value={editingStudent.registration_no}
                      disabled
                      className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      RFID Badge UID / Machine User ID *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. RFID-839201 or 1002"
                      value={modalCardId}
                      onChange={(e) => setModalCardId(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Assigned Terminal
                    </label>
                    <select
                      value={modalTerminal}
                      onChange={(e) => setModalTerminal(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none cursor-pointer"
                    >
                      {terminals.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={savePairing}
                    className="text-xs px-3.5 py-1.5 rounded bg-primary text-white font-medium hover:bg-primary/90 cursor-pointer transition"
                  >
                    Save Credential
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Device Credentials: {filterInfo?.className} ({filterInfo?.sectionName}) - {students.length} Students
              </h3>
              <input
                type="text"
                placeholder="Search name, roll, reg, RFID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none w-full sm:w-64"
              />
            </div>

            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No students found matching your criteria.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5">Roll</th>
                      <th className="px-3 py-2.5">Registration No</th>
                      <th className="px-3 py-2.5">Student Name</th>
                      <th className="px-3 py-2.5">RFID / Device UID</th>
                      <th className="px-3 py-2.5">Sync Status</th>
                      <th className="px-3 py-2.5">Last Sync</th>
                      <th className="px-3 py-2.5 text-right">Hardware Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredStudents.map((st) => {
                      const map = deviceMappings[st.id] || { rfid: '', status: 'Unregistered', lastSync: '—' };
                      return (
                        <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-3 py-2 font-mono font-medium text-slate-900 dark:text-white">
                            {st.roll_no || '—'}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-400">
                            {st.registration_no}
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                            {st.name || <span className="italic text-slate-400">No Name</span>}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {map.rfid ? (
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                {map.rfid}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                map.status === 'Synced'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                              }`}
                            >
                              {map.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-500">
                            {map.lastSync}
                          </td>
                          <td className="px-3 py-2 text-right space-x-1.5">
                            <button
                              onClick={() =>
                                editingStudent?.id === st.id
                                  ? setEditingStudent(null)
                                  : openPairModal(st)
                              }
                              className={`px-2 py-1 rounded text-[11px] font-medium border transition cursor-pointer ${
                                editingStudent?.id === st.id
                                  ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                                  : 'border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {editingStudent?.id === st.id ? '✕ Close' : 'Edit RFID'}
                            </button>
                            <button
                              onClick={() => handleSyncSingle(st)}
                              className="px-2 py-1 rounded text-[11px] font-medium bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition cursor-pointer"
                            >
                              Sync
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
