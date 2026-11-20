import React, { useEffect, useMemo, useState } from 'react';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  CheckSquare,
  ClipboardList,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchAdminActivityLogs,
  fetchAllReportsAdmin,
  fetchReportDetails,
  formatTimestamp,
  updateReportStatusAdmin,
} from '../lib/firestoreData';
import {
  COMPLAINT_STATUSES,
  VIOLATION_CATEGORIES,
  type AdminActivityLogDoc,
  type ComplaintStatus,
  type ReportEvidenceDoc,
  type ReportStatusHistoryDoc,
  type TrafficReportDoc,
} from '../types/domain';
import { LeafletMapPicker } from './LeafletMapPicker';
import { ProtectedImage } from './ProtectedImage';
import { StatusTag } from './StatusBadge';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

export function AdminPanelView() {
  const { firebaseUser, isAdmin } = useAuth();
  const [tab, setTab] = useState<'complaints' | 'logs'>('complaints');

  const [reports, setReports] = useState<TrafficReportDoc[]>([]);
  const [logs, setLogs] = useState<AdminActivityLogDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchId, setSearchId] = useState('');
  const [violationFilter, setViolationFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const [selectedReport, setSelectedReport] = useState<TrafficReportDoc | null>(null);
  const [evidence, setEvidence] = useState<ReportEvidenceDoc[]>([]);
  const [history, setHistory] = useState<ReportStatusHistoryDoc[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [newStatus, setNewStatus] = useState<ComplaintStatus>('Under Review');
  const [remarks, setRemarks] = useState('');
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  async function loadAdminData() {
    setLoading(true);
    setError(null);
    try {
      const [allReports, allLogs] = await Promise.all([
        fetchAllReportsAdmin(),
        fetchAdminActivityLogs(),
      ]);
      setReports(allReports);
      setLogs(allLogs);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load administrative records.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) {
      void loadAdminData();
    }
  }, [isAdmin]);

  async function openComplaint(report: TrafficReportDoc) {
    setSelectedReport(report);
    setNewStatus(report.status);
    setRemarks(report.adminRemarks || '');
    setUpdateSuccess(null);
    setDetailLoading(true);
    try {
      const details = await fetchReportDetails(report.id);
      setEvidence(details.evidence);
      setHistory(details.history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load complaint evidence.');
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleStatusSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedReport || !firebaseUser) return;
    setSavingUpdate(true);
    setError(null);
    setUpdateSuccess(null);

    try {
      await updateReportStatusAdmin({
        report: selectedReport,
        newStatus,
        adminRemarks: remarks,
        adminUid: firebaseUser.uid,
        adminEmail: firebaseUser.email || 'admin@taffic-prahari',
      });
      setUpdateSuccess(`Complaint ${selectedReport.complaintCode} updated to ${newStatus}.`);
      await loadAdminData();
      const refreshedDetails = await fetchReportDetails(selectedReport.id);
      if (refreshedDetails.report) {
        setSelectedReport(refreshedDetails.report);
      }
      setHistory(refreshedDetails.history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed updating complaint status.');
    } finally {
      setSavingUpdate(false);
    }
  }

  const filteredReports = useMemo(() => {
    const q = searchId.trim().toUpperCase();
    const locQ = locationFilter.trim().toLowerCase();
    return reports.filter((r) => {
      if (
        q &&
        !r.complaintCode.toUpperCase().includes(q) &&
        !r.vehicleRegNumber.toUpperCase().includes(q)
      ) {
        return false;
      }
      if (violationFilter !== 'ALL' && r.violationType !== violationFilter) {
        return false;
      }
      if (statusFilter !== 'ALL' && r.status !== statusFilter) {
        return false;
      }
      if (dateFilter && r.incidentDate !== dateFilter) {
        return false;
      }
      if (locQ && !r.locationText.toLowerCase().includes(locQ)) {
        return false;
      }
      return true;
    });
  }, [reports, searchId, violationFilter, statusFilter, dateFilter, locationFilter]);

  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto bg-white border border-[#E2DFD7] p-8 text-center animate-page-enter">
        <ShieldAlert className="w-8 h-8 text-[#B91C1C] mx-auto mb-3" />
        <h1 className="font-display text-xl font-bold text-[#171A1D] mb-2">
          Administrator Authorization Required
        </h1>
        <p className="text-sm text-[#4B5563]">
          Your account does not hold Traffic Administration privileges. Normal citizen accounts cannot access the administrative queue or audit logs.
        </p>
      </div>
    );
  }

  const pendingCount = reports.filter((r) => r.status === 'Submitted').length;
  const activeReviewCount = reports.filter(
    (r) => r.status === 'Under Review' || r.status === 'Verified'
  ).length;
  const resolvedCount = reports.filter(
    (r) => r.status === 'Action Taken' || r.status === 'Resolved'
  ).length;

  const categoryCounts = VIOLATION_CATEGORIES.map(
    (cat) => reports.filter((r) => r.violationType === cat).length
  );
  const statusCounts = COMPLAINT_STATUSES.map(
    (st) => reports.filter((r) => r.status === st).length
  );

  return (
    <div className="space-y-8 animate-page-enter">
      {/* Dark Admin Header */}
      <section className="bg-[#171A1D] text-white border border-[#24282C] p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#F15A24] font-semibold">
            Traffic Administration Console
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
            Complaint Verification & Oversight
          </h1>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#24282C] border border-[#343A40] self-start">
          <button
            type="button"
            onClick={() => setTab('complaints')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              tab === 'complaints'
                ? 'bg-[#F15A24] text-white'
                : 'text-[#92969A] hover:text-white'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Review Queue ({reports.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('logs')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              tab === 'logs'
                ? 'bg-[#F15A24] text-white'
                : 'text-[#92969A] hover:text-white'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Audit Logs ({logs.length})</span>
          </button>
        </div>
      </section>

      {error && (
        <div className="p-4 bg-[#FEE2E2] border border-[#FCA5A5] text-sm text-[#991B1B]">
          {error}
        </div>
      )}

      {/* Real Complaint Statistics */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2DFD7] border-t-2 border-t-[#171A1D] p-5">
          <div className="text-xs text-[#6B7280] font-medium">Total Queue</div>
          <div className="font-mono tabular-nums text-3xl font-semibold text-[#171A1D] mt-2">
            {loading ? '—' : reports.length}
          </div>
        </div>
        <div className="bg-white border border-[#E2DFD7] border-t-2 border-t-[#F15A24] p-5">
          <div className="text-xs text-[#6B7280] font-medium">Awaiting Triage</div>
          <div className="font-mono tabular-nums text-3xl font-semibold text-[#F15A24] mt-2">
            {loading ? '—' : pendingCount}
          </div>
        </div>
        <div className="bg-white border border-[#E2DFD7] border-t-2 border-t-[#2563EB] p-5">
          <div className="text-xs text-[#6B7280] font-medium">Under Review / Verified</div>
          <div className="font-mono tabular-nums text-3xl font-semibold text-[#1E40AF] mt-2">
            {loading ? '—' : activeReviewCount}
          </div>
        </div>
        <div className="bg-white border border-[#E2DFD7] border-t-2 border-t-[#16A34A] p-5">
          <div className="text-xs text-[#6B7280] font-medium">Actioned / Resolved</div>
          <div className="font-mono tabular-nums text-3xl font-semibold text-[#166534] mt-2">
            {loading ? '—' : resolvedCount}
          </div>
        </div>
      </section>

      {/* Chart.js Real Analytics */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-[#E2DFD7] p-6">
          <h2 className="font-display text-sm font-semibold text-[#171A1D] mb-4">
            Submitted Violations by Category
          </h2>
          <div className="h-60">
            <Bar
              data={{
                labels: VIOLATION_CATEGORIES.map((c) => c.replace('Driving without ', 'No ')),
                datasets: [
                  {
                    label: 'Reports',
                    data: categoryCounts,
                    backgroundColor: '#F15A24',
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, ticks: { precision: 0 } },
                },
              }}
            />
          </div>
        </div>

        <div className="lg:col-span-4 bg-white border border-[#E2DFD7] p-6">
          <h2 className="font-display text-sm font-semibold text-[#171A1D] mb-4">
            Status Breakdown
          </h2>
          <div className="h-60">
            <Doughnut
              data={{
                labels: [...COMPLAINT_STATUSES],
                datasets: [
                  {
                    data: statusCounts,
                    backgroundColor: [
                      '#92969A',
                      '#D97706',
                      '#2563EB',
                      '#F15A24',
                      '#16A34A',
                      '#B91C1C',
                    ],
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
                },
              }}
            />
          </div>
        </div>
      </section>

      {tab === 'logs' ? (
        <section className="bg-white border border-[#E2DFD7]">
          <div className="px-6 py-4 border-b border-[#E2DFD7]">
            <h2 className="font-display text-base font-semibold text-[#171A1D]">
              Administrative Activity Audit Trail
            </h2>
          </div>
          {logs.length === 0 ? (
            <div className="p-8 text-sm text-[#6B7280]">No administrative actions logged yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E2DFD7] bg-[#F5F3EF] text-[11px] font-mono uppercase text-[#6B7280]">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Admin Operator</th>
                    <th className="py-3 px-4">Complaint ID</th>
                    <th className="py-3 px-4">Transition</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2DFD7]">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-3 px-4 text-xs text-[#6B7280] tabular-nums whitespace-nowrap">
                        {formatTimestamp(log.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-[#171A1D]">
                        {log.adminEmail}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-[#171A1D]">
                        {log.targetComplaintCode}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {log.previousStatus} → <strong>{log.newStatus}</strong>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#24282C]">{log.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-6">
          <div className="bg-white border border-[#E2DFD7] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#92969A] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Complaint ID / Plate..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
              />
            </div>

            <select
              value={violationFilter}
              onChange={(e) => setViolationFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
            >
              <option value="ALL">All Violations</option>
              {VIOLATION_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
            >
              <option value="ALL">All Statuses</option>
              {COMPLAINT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="Filter location..."
              className="px-3 py-2 text-sm border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
            />

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 bg-white border border-[#E2DFD7]">
              {loading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-[#F5F3EF] animate-pulse" />
                  ))}
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="p-8 text-sm text-[#6B7280]">No matching complaints found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[#E2DFD7] bg-[#F5F3EF] text-[11px] font-mono uppercase text-[#6B7280]">
                        <th className="py-3 px-4">ID</th>
                        <th className="py-3 px-4">Violation</th>
                        <th className="py-3 px-4">Plate</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2DFD7]">
                      {filteredReports.map((r) => (
                        <tr
                          key={r.id}
                          onClick={() => void openComplaint(r)}
                          className={`hover:bg-[#F5F3EF]/70 cursor-pointer transition-colors ${
                            selectedReport?.id === r.id ? 'bg-[#F5F3EF]' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono text-xs font-semibold text-[#171A1D] whitespace-nowrap">
                            {r.complaintCode}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-[#171A1D]">{r.violationType}</div>
                            <div className="text-xs text-[#6B7280] truncate max-w-[200px]">
                              {r.locationText}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">
                            {r.vehicleRegNumber || '—'}
                          </td>
                          <td className="py-3 px-4">
                            <StatusTag status={r.status} />
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void openComplaint(r);
                              }}
                              className="px-3 py-1.5 text-xs font-medium border border-[#171A1D] bg-white hover:bg-[#171A1D] hover:text-white transition-colors cursor-pointer"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="lg:col-span-5 bg-white border border-[#E2DFD7] p-6">
              {!selectedReport ? (
                <div className="text-sm text-[#6B7280] py-10 text-center">
                  Select any complaint from the review queue to inspect evidence photographs, GPS location, and update its official status.
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="border-b border-[#E2DFD7] pb-3 flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono text-xs text-[#6B7280]">
                        {selectedReport.complaintCode}
                      </div>
                      <h3 className="font-display text-lg font-bold text-[#171A1D]">
                        {selectedReport.violationType}
                      </h3>
                    </div>
                    <StatusTag status={selectedReport.status} />
                  </div>

                  <div className="text-xs space-y-1.5 text-[#24282C]">
                    <div>
                      <strong>Date / Time:</strong> {selectedReport.incidentDate} ·{' '}
                      {selectedReport.incidentTime}
                    </div>
                    <div>
                      <strong>Vehicle Plate:</strong>{' '}
                      <span className="font-mono font-semibold">
                        {selectedReport.vehicleRegNumber || 'Not provided'}
                      </span>{' '}
                      {selectedReport.ocrExtractedPlate && (
                        <span className="text-[#6B7280]">
                          (OCR: {selectedReport.ocrExtractedPlate}, {selectedReport.ocrConfidence})
                        </span>
                      )}
                    </div>
                    <div>
                      <strong>Location:</strong> {selectedReport.locationText}
                    </div>
                    <div>
                      <strong>GPS:</strong>{' '}
                      <span className="font-mono">
                        {selectedReport.latitude.toFixed(5)}, {selectedReport.longitude.toFixed(5)}
                      </span>
                    </div>
                    {selectedReport.description && (
                      <div>
                        <strong>Citizen Notes:</strong> {selectedReport.description}
                      </div>
                    )}
                  </div>

                  <LeafletMapPicker
                    latitude={selectedReport.latitude}
                    longitude={selectedReport.longitude}
                    heightClassName="h-44"
                  />

                  <div>
                    <h4 className="text-xs font-semibold text-[#171A1D] mb-2">
                      Submitted Evidence ({evidence.length})
                    </h4>
                    {detailLoading ? (
                      <div className="h-24 bg-[#F5F3EF] animate-pulse" />
                    ) : evidence.length === 0 ? (
                      <p className="text-xs text-[#6B7280]">No evidence images.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {evidence.map((ev) => (
                          <ProtectedImage
                            key={ev.id}
                            src={ev.evidenceUrl}
                            alt={ev.fileName}
                            className="w-full h-32 object-cover border border-[#E2DFD7]"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {updateSuccess && (
                    <div className="p-3 bg-[#DCFCE7] border border-[#86EFAC] text-xs text-[#166534] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>{updateSuccess}</span>
                    </div>
                  )}

                  <form
                    onSubmit={handleStatusSubmit}
                    className="border-t border-[#E2DFD7] pt-4 space-y-3"
                  >
                    <div>
                      <label className="block text-xs font-medium text-[#24282C] mb-1">
                        Official Status Action
                      </label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value as ComplaintStatus)}
                        className="w-full px-3 py-2 text-sm border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
                      >
                        {COMPLAINT_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#24282C] mb-1">
                        Administrative Remarks *
                      </label>
                      <textarea
                        required
                        rows={2}
                        maxLength={1000}
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Record verification decision or enforcement remarks..."
                        className="w-full px-3 py-2 text-sm border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={savingUpdate}
                      className="w-full py-2.5 px-4 bg-[#F15A24] hover:bg-[#D94A17] text-white text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {savingUpdate ? 'Recording Official Update...' : 'Save Status & Audit Log'}
                    </button>
                  </form>

                  {history.length > 0 && (
                    <div className="border-t border-[#E2DFD7] pt-4">
                      <h4 className="text-xs font-semibold text-[#171A1D] mb-2">
                        Action History
                      </h4>
                      <ul className="space-y-2 text-xs">
                        {history.map((h) => (
                          <li key={h.id} className="bg-[#F5F3EF] border border-[#E2DFD7] p-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-[#171A1D]">{h.status}</span>
                              <span className="text-[#6B7280] tabular-nums">
                                {formatTimestamp(h.createdAt)}
                              </span>
                            </div>
                            <div className="text-[#4B5563] mt-1">{h.remarks}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
