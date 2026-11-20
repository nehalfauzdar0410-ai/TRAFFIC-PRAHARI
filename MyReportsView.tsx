import { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronLeft, MapPin, Search, ShieldCheck } from 'lucide-react';
import { fetchReportDetails, formatTimestamp } from '../lib/firestoreData';
import {
  COMPLAINT_STATUSES,
  VIOLATION_CATEGORIES,
  type ReportEvidenceDoc,
  type ReportStatusHistoryDoc,
  type TrafficReportDoc,
} from '../types/domain';
import { LeafletMapPicker } from './LeafletMapPicker';
import { ProtectedImage } from './ProtectedImage';
import { StatusTag } from './StatusBadge';

interface MyReportsViewProps {
  reports: TrafficReportDoc[];
  loading: boolean;
  selectedReportId: string | null;
  onSelectReport: (reportId: string | null) => void;
}

export function MyReportsView({
  reports,
  loading,
  selectedReportId,
  onSelectReport,
}: MyReportsViewProps) {
  const [searchId, setSearchId] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState('');

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailReport, setDetailReport] = useState<TrafficReportDoc | null>(null);
  const [detailEvidence, setDetailEvidence] = useState<ReportEvidenceDoc[]>([]);
  const [detailHistory, setDetailHistory] = useState<ReportStatusHistoryDoc[]>([]);

  useEffect(() => {
    if (!selectedReportId) {
      setDetailReport(null);
      setDetailEvidence([]);
      setDetailHistory([]);
      return;
    }

    let active = true;
    async function load() {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const res = await fetchReportDetails(selectedReportId!);
        if (active) {
          setDetailReport(res.report);
          setDetailEvidence(res.evidence);
          setDetailHistory(res.history);
        }
      } catch (err) {
        if (active) {
          setDetailError(err instanceof Error ? err.message : 'Unable to load complaint details.');
        }
      } finally {
        if (active) setDetailLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [selectedReportId]);

  const filteredReports = useMemo(() => {
    const q = searchId.trim().toUpperCase();
    return reports.filter((r) => {
      if (
        q &&
        !r.complaintCode.toUpperCase().includes(q) &&
        !r.vehicleRegNumber.toUpperCase().includes(q) &&
        !r.locationText.toUpperCase().includes(q)
      ) {
        return false;
      }
      if (statusFilter !== 'ALL' && r.status !== statusFilter) {
        return false;
      }
      if (categoryFilter !== 'ALL' && r.violationType !== categoryFilter) {
        return false;
      }
      if (dateFilter && r.incidentDate !== dateFilter) {
        return false;
      }
      return true;
    });
  }, [reports, searchId, statusFilter, categoryFilter, dateFilter]);

  if (selectedReportId) {
    return (
      <div className="space-y-6 animate-page-enter">
        <button
          type="button"
          onClick={() => onSelectReport(null)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#171A1D] hover:text-[#F15A24] cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to My Reports</span>
        </button>

        {detailLoading ? (
          <div className="bg-white border border-[#E2DFD7] p-8 space-y-4">
            <div className="h-6 w-48 bg-[#F5F3EF] animate-pulse" />
            <div className="h-32 bg-[#F5F3EF] animate-pulse" />
          </div>
        ) : detailError ? (
          <div className="p-4 bg-[#FEE2E2] border border-[#FCA5A5] text-sm text-[#991B1B]">
            {detailError}
          </div>
        ) : !detailReport ? (
          <div className="bg-white border border-[#E2DFD7] p-8 text-sm text-[#6B7280]">
            Complaint record not found.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white border border-[#E2DFD7] p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E2DFD7] pb-4 mb-5">
                  <div>
                    <div className="font-mono text-xs text-[#6B7280]">
                      COMPLAINT ID · {detailReport.complaintCode}
                    </div>
                    <h1 className="font-display text-2xl font-bold text-[#171A1D] mt-1">
                      {detailReport.violationType}
                    </h1>
                  </div>
                  <StatusTag status={detailReport.status} />
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-xs text-[#6B7280]">Incident Date & Time</dt>
                    <dd className="font-mono text-xs text-[#171A1D] mt-1 tabular-nums">
                      {detailReport.incidentDate} · {detailReport.incidentTime}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#6B7280]">Submitted On</dt>
                    <dd className="font-mono text-xs text-[#171A1D] mt-1 tabular-nums">
                      {formatTimestamp(detailReport.createdAt)}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-[#6B7280]">Vehicle Registration</dt>
                    <dd className="font-mono text-xs font-semibold text-[#171A1D] mt-1">
                      {detailReport.vehicleRegNumber || 'Not identified'}
                      {detailReport.ocrExtractedPlate && (
                        <span className="font-normal text-[#6B7280] ml-2">
                          (OCR: {detailReport.ocrExtractedPlate} · {detailReport.ocrConfidence})
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-[#6B7280]">Incident Location</dt>
                    <dd className="text-sm text-[#171A1D] mt-1">
                      {detailReport.locationText}
                    </dd>
                  </div>
                  {detailReport.description && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-[#6B7280]">Citizen Description</dt>
                      <dd className="text-sm text-[#24282C] mt-1 leading-relaxed">
                        {detailReport.description}
                      </dd>
                    </div>
                  )}
                  {detailReport.adminRemarks && (
                    <div className="sm:col-span-2 bg-[#F5F3EF] border border-[#E2DFD7] p-3.5">
                      <dt className="text-xs font-semibold text-[#171A1D]">
                        Official Administration Remarks
                      </dt>
                      <dd className="text-sm text-[#24282C] mt-1">
                        {detailReport.adminRemarks}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="bg-white border border-[#E2DFD7] p-6">
                <h2 className="font-display text-base font-semibold text-[#171A1D] mb-4">
                  Uploaded Evidence ({detailEvidence.length})
                </h2>
                {detailEvidence.length === 0 ? (
                  <p className="text-xs text-[#6B7280]">No evidence images attached.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {detailEvidence.map((ev) => (
                      <div key={ev.id} className="border border-[#E2DFD7] bg-[#F5F3EF] p-2">
                        <ProtectedImage
                          src={ev.evidenceUrl}
                          alt={ev.fileName}
                          className="w-full h-48 object-cover"
                        />
                        <div className="mt-2 flex items-center justify-between text-xs text-[#6B7280]">
                          <span className="truncate">{ev.fileName}</span>
                          <span className="font-mono shrink-0">
                            {(ev.fileSize / 1024).toFixed(0)} KB
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white border border-[#E2DFD7] p-6">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h2 className="font-display text-base font-semibold text-[#171A1D]">
                    Pinned Coordinates
                  </h2>
                  <span className="font-mono text-xs text-[#6B7280] tabular-nums">
                    {detailReport.latitude.toFixed(5)}, {detailReport.longitude.toFixed(5)}
                  </span>
                </div>
                <LeafletMapPicker
                  latitude={detailReport.latitude}
                  longitude={detailReport.longitude}
                  heightClassName="h-56"
                />
              </div>

              <div className="bg-white border border-[#E2DFD7] p-6">
                <h2 className="font-display text-base font-semibold text-[#171A1D] mb-4">
                  Action-History Timeline
                </h2>
                {detailHistory.length === 0 ? (
                  <p className="text-xs text-[#6B7280]">No history events recorded.</p>
                ) : (
                  <ol className="space-y-3">
                    {detailHistory.map((item) => (
                      <li
                        key={item.id}
                        className="border border-[#E2DFD7] bg-[#F5F3EF] p-3.5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <StatusTag status={item.status} />
                          <span className="text-xs text-[#6B7280] tabular-nums">
                            {formatTimestamp(item.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-[#24282C] leading-relaxed">
                          {item.remarks}
                        </p>
                        <div className="text-[11px] font-mono text-[#6B7280] flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-[#F15A24]" />
                          <span>
                            Actor: {item.actorRole === 'admin' ? 'Traffic Administration' : 'Citizen'}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-page-enter">
      <div>
        <p className="text-xs font-mono uppercase tracking-[0.14em] text-[#F15A24] font-semibold">
          Complaint Management
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#171A1D] mt-1">
          My Reports
        </h1>
        <p className="text-sm text-[#4B5563] mt-1">
          Filter submitted complaints by status, violation category, or date, and click any record to view evidence and timeline history.
        </p>
      </div>

      {/* Status Segmented Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-white border border-[#E2DFD7]">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-[#171A1D] text-white'
              : 'text-[#6B7280] hover:text-[#171A1D]'
          }`}
        >
          All ({reports.length})
        </button>
        {COMPLAINT_STATUSES.map((st) => {
          const count = reports.filter((r) => r.status === st).length;
          return (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#171A1D] text-white'
                  : 'text-[#6B7280] hover:text-[#171A1D]'
              }`}
            >
              {st} ({count})
            </button>
          );
        })}
      </div>

      {/* Search & Category/Date Filters */}
      <div className="bg-white border border-[#E2DFD7] p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-[#92969A] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder="Search by Complaint ID (TP-...), plate, or location..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
          />
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
          >
            <option value="ALL">All Violation Categories</option>
            {VIOLATION_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Calendar className="w-4 h-4 text-[#92969A] absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
          />
        </div>
      </div>

      {/* Report List Table */}
      <div className="bg-white border border-[#E2DFD7]">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((row) => (
              <div
                key={row}
                className="h-12 bg-[#F5F3EF] border border-[#E2DFD7] animate-pulse"
              />
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#6B7280]">
            No complaints match your current search or filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2DFD7] bg-[#F5F3EF] text-[11px] font-mono uppercase tracking-wider text-[#6B7280]">
                  <th className="py-3 px-4">Complaint ID</th>
                  <th className="py-3 px-4">Violation & Location</th>
                  <th className="py-3 px-4">Vehicle Reg</th>
                  <th className="py-3 px-4">Submitted Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DFD7] text-sm">
                {filteredReports.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => onSelectReport(r.id)}
                    className="hover:bg-[#F5F3EF]/70 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-[#171A1D] whitespace-nowrap">
                      {r.complaintCode}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#171A1D]">{r.violationType}</div>
                      <div className="text-xs text-[#6B7280] flex items-center gap-1 mt-0.5 max-w-xs truncate">
                        <MapPin className="w-3 h-3 shrink-0 text-[#F15A24]" />
                        <span className="truncate">{r.locationText}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-[#24282C] whitespace-nowrap">
                      {r.vehicleRegNumber || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-[#4B5563] tabular-nums whitespace-nowrap">
                      {formatTimestamp(r.createdAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusTag status={r.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectReport(r.id);
                        }}
                        className="px-3 py-1.5 text-xs font-medium border border-[#D4D0C8] bg-white hover:bg-[#171A1D] hover:text-white hover:border-[#171A1D] transition-colors cursor-pointer"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
