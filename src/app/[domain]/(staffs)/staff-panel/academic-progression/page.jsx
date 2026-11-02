'use client';

import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiTrendingUp, FiCpu, FiUsers, FiAward, FiPlus, FiTrash2, FiRefreshCw, FiRadio } from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import Loader from 'src/component/common/Loader';

export default function AcademicProgressionStaffPage() {
  const { website, getApiEndpoint } = useContext(TenantWebsiteContext);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('devices'); // devices | biometric | promotions | alumni
  const [data, setData] = useState({ promotions: [], devices: [], biometric_logs: [], alumni: [] });

  // Device Modal
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [deviceIp, setDeviceIp] = useState('');
  const [devicePort, setDevicePort] = useState(4370);
  const [deviceType, setDeviceType] = useState('zkteco');
  const [deviceLocation, setDeviceLocation] = useState('Main Gate');
  const [submittingDevice, setSubmittingDevice] = useState(false);

  // Alumni Modal
  const [isAlumniModalOpen, setIsAlumniModalOpen] = useState(false);
  const [alumniName, setAlumniName] = useState('');
  const [gradYear, setGradYear] = useState(2025);
  const [alumniClass, setAlumniClass] = useState('Class 10 (SSC)');
  const [alumniProfession, setAlumniProfession] = useState('');
  const [alumniCompany, setAlumniCompany] = useState('');
  const [submittingAlumni, setSubmittingAlumni] = useState(false);

  const apiEndpoint = useMemo(() => getApiEndpoint('staff/panel/academic-progression'), [getApiEndpoint]);

  const fetchData = useCallback(async (showToast = false) => {
    if (!apiEndpoint) return;
    try {
      if (showToast) setRefreshing(true);
      const res = await axios.get(apiEndpoint);
      if (res.data?.success) {
        setData(res.data);
        if (showToast) toast.success('Progression & Biometric data refreshed');
      } else {
        toast.error(res.data?.error || 'Failed to load records');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Error connecting to service');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiEndpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRegisterDevice = async (e) => {
    e.preventDefault();
    if (!deviceName.trim()) return;
    setSubmittingDevice(true);
    try {
      const res = await axios.post(apiEndpoint, {
        action: 'register_device',
        device_name: deviceName.trim(),
        device_ip: deviceIp.trim(),
        device_port: devicePort,
        device_type: deviceType,
        location: deviceLocation.trim(),
      });
      if (res.data?.success) {
        toast.success('Biometric device registered');
        setIsDeviceModalOpen(false);
        setDeviceName('');
        setDeviceIp('');
        fetchData();
      } else {
        toast.error(res.data?.error || 'Failed to register device');
      }
    } catch (err) {
      toast.error('Error saving device');
    } finally {
      setSubmittingDevice(false);
    }
  };

  const handleAddAlumni = async (e) => {
    e.preventDefault();
    if (!alumniName.trim()) return;
    setSubmittingAlumni(true);
    try {
      const res = await axios.post(apiEndpoint, {
        action: 'add_alumni',
        name: alumniName.trim(),
        graduation_year: gradYear,
        passing_class: alumniClass.trim(),
        current_profession: alumniProfession.trim(),
        company_name: alumniCompany.trim(),
      });
      if (res.data?.success) {
        toast.success('Alumni record added');
        setIsAlumniModalOpen(false);
        setAlumniName('');
        fetchData();
      } else {
        toast.error(res.data?.error || 'Failed to add alumni');
      }
    } catch (err) {
      toast.error('Error adding alumni');
    } finally {
      setSubmittingAlumni(false);
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    if (!confirm('Are you sure you want to delete this hardware terminal?')) return;
    try {
      const res = await axios.delete(`${apiEndpoint}?device_id=${deviceId}`);
      if (res.data?.success) {
        toast.success('Device removed');
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to delete device');
    }
  };

  if (loading) {
    return <Loader message="Loading Academic Progression & Hardware Biometrics..." />;
  }

  const { promotions, devices, biometric_logs, alumni } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FiTrendingUp className="text-primary" /> Academic Progression, Biometrics & Alumni
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage year-over-year student roll promotions, RFID/fingerprint attendance hardware sync, and alumni directory.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <FiRefreshCw className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={() => setIsDeviceModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition shadow-sm"
          >
            <FiPlus /> Add Biometric Terminal
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('devices')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === 'devices'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiCpu /> Biometric Terminals ({devices.length})
        </button>
        <button
          onClick={() => setActiveTab('biometric')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === 'biometric'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiRadio /> Raw Punch Logs ({biometric_logs.length})
        </button>
        <button
          onClick={() => setActiveTab('promotions')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === 'promotions'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiTrendingUp /> Student Promotions ({promotions.length})
        </button>
        <button
          onClick={() => setActiveTab('alumni')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === 'alumni'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiAward /> Alumni Network ({alumni.length})
        </button>
      </div>

      {/* Tab 1: Devices */}
      {activeTab === 'devices' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3">Device Name</th>
                  <th className="px-6 py-3">Brand / Protocol</th>
                  <th className="px-6 py-3">IP Address : Port</th>
                  <th className="px-6 py-3">Physical Location</th>
                  <th className="px-6 py-3">Sync Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {devices.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                      No biometric attendance terminals registered. Add your ZKTeco or Hikvision hardware terminal.
                    </td>
                  </tr>
                ) : (
                  devices.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                        <FiCpu className="text-primary" /> {d.device_name}
                      </td>
                      <td className="px-6 py-4 uppercase text-xs font-bold">{d.device_type}</td>
                      <td className="px-6 py-4 font-mono text-xs">{d.device_ip || 'DHCP'}:{d.device_port}</td>
                      <td className="px-6 py-4 text-xs">{d.location || 'Campus Gate'}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-800">
                          {d.status || 'online'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDeleteDevice(d.id)} className="text-red-500 hover:text-red-700">
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Punch Logs */}
      {activeTab === 'biometric' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3">Punch Timestamp</th>
                  <th className="px-6 py-3">Device User ID</th>
                  <th className="px-6 py-3">User Type</th>
                  <th className="px-6 py-3">State</th>
                  <th className="px-6 py-3">Verification Mode</th>
                  <th className="px-6 py-3">Hardware Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {biometric_logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                      No raw biometric punches recorded yet.
                    </td>
                  </tr>
                ) : (
                  biometric_logs.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">
                        {new Date(b.punch_time).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white font-mono">
                        #{b.user_id_on_device}
                      </td>
                      <td className="px-6 py-4 text-xs capitalize">{b.user_type}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800 capitalize">
                          {b.punch_state}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs capitalize">{b.verification_mode}</td>
                      <td className="px-6 py-4 text-xs text-slate-400">{b.device_name || 'Terminal'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Alumni */}
      {activeTab === 'alumni' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Alumni Directory</h2>
            <button
              onClick={() => setIsAlumniModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition"
            >
              <FiPlus /> Add Alumni Record
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {alumni.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-sm">
                No alumni profiles recorded yet.
              </div>
            ) : (
              alumni.map((a) => (
                <div key={a.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white">{a.name}</div>
                  <div className="text-xs text-primary font-semibold">Graduated {a.graduation_year} ({a.passing_class || 'Class 10'})</div>
                  <p className="text-xs text-slate-500">{a.current_profession || 'Professional'} at {a.company_name || 'Organization'}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Promotions */}
      {activeTab === 'promotions' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Historical Progression Logs</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Student Name</th>
                  <th className="px-6 py-3">Roll Transition</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {promotions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-400">
                      No promotion history logged yet.
                    </td>
                  </tr>
                ) : (
                  promotions.map((p) => (
                    <tr key={p.id}>
                      <td className="px-6 py-4 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{p.student_name}</td>
                      <td className="px-6 py-4 font-mono text-xs">{p.previous_roll || 'N/A'} → {p.new_roll}</td>
                      <td className="px-6 py-4 capitalize text-emerald-600 font-semibold text-xs">{p.promotion_status}</td>
                      <td className="px-6 py-4 text-xs text-slate-400">{p.remarks || 'Annual promotion'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Register Device Modal */}
      {isDeviceModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Register Biometric Device</h3>
            <form onSubmit={handleRegisterDevice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Device Name</label>
                <input
                  type="text"
                  placeholder="e.g. Main Gate ZKTeco Terminal 01"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">IP Address</label>
                  <input
                    type="text"
                    placeholder="192.168.1.201"
                    value={deviceIp}
                    onChange={(e) => setDeviceIp(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Port</label>
                  <input
                    type="number"
                    value={devicePort}
                    onChange={(e) => setDevicePort(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 font-mono text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Protocol / Brand</label>
                <select
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="zkteco">ZKTeco (UDP/TCP 4370)</option>
                  <option value="hikvision">Hikvision ISAPI / Face Terminal</option>
                  <option value="dahua">Dahua Biometrics</option>
                  <option value="rfid_usb">RFID USB Desktop Reader</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeviceModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDevice}
                  className="px-4 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-dark"
                >
                  {submittingDevice ? 'Connecting...' : 'Register Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Alumni Modal */}
      {isAlumniModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Add Alumni Record</h3>
            <form onSubmit={handleAddAlumni} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Alumni Name</label>
                <input
                  type="text"
                  placeholder="e.g. Tanvir Ahmed"
                  value={alumniName}
                  onChange={(e) => setAlumniName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Graduation Year</label>
                  <input
                    type="number"
                    value={gradYear}
                    onChange={(e) => setGradYear(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Passing Class</label>
                  <input
                    type="text"
                    value={alumniClass}
                    onChange={(e) => setAlumniClass(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAlumniModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAlumni}
                  className="px-4 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-dark"
                >
                  {submittingAlumni ? 'Saving...' : 'Add Alumni'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

