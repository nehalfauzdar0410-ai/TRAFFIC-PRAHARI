import {
  ArrowRight,
  Car,
  CheckCircle2,
  Clock,
  Eye,
  FilePlus2,
  FileText,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { RegisteredVehicleDoc, TrafficReportDoc } from '../types/domain';
import { RoadNetworkGraphic } from './BrandMark';
import { LeafletMapPicker } from './LeafletMapPicker';
import { StatusTag } from './StatusBadge';

export type AppSection =
  | 'dashboard'
  | 'report'
  | 'my-reports'
  | 'vehicles'
  | 'nearby'
  | 'admin'
  | 'profile';

interface DashboardViewProps {
  reports: TrafficReportDoc[];
  vehicles: RegisteredVehicleDoc[];
  loading: boolean;
  error: string | null;
  onNavigate: (section: AppSection) => void;
  onOpenReport: (reportId: string) => void;
}

export function DashboardView({
  reports,
  vehicles,
  loading,
  error,
  onNavigate,
  onOpenReport,
}: DashboardViewProps) {
  const { profileDoc, userDoc, firebaseUser } = useAuth();

  const displayName =
    profileDoc?.fullName || userDoc?.fullName || firebaseUser?.displayName || 'Citizen';

  const totalComplaints = reports.length;
  const pendingReports = reports.filter((r) => r.status === 'Submitted').length;
  const underReviewReports = reports.filter(
    (r) => r.status === 'Under Review' || r.status === 'Verified'
  ).length;
  const resolvedReports = reports.filter(
    (r) => r.status === 'Action Taken' || r.status === 'Resolved'
  ).length;
  const registeredVehiclesCount = vehicles.length;

  const recentReports = reports.slice(0, 6);
  const latestPinnedReport = reports[0] || null;
  const previewLat = latestPinnedReport ? latestPinnedReport.latitude : 23.0225;
  const previewLng = latestPinnedReport ? latestPinnedReport.longitude : 72.5714;

  const statCards = [
    {
      label: 'Total Complaints',
      value: totalComplaints,
      Icon: FileText,
      topAccent: 'border-t-[#171A1D]',
      valueColor: 'text-[#171A1D]',
    },
    {
      label: 'Pending Reports',
      value: pendingReports,
      Icon: Clock,
      topAccent: 'border-t-[#92969A]',
      valueColor: 'text-[#24282C]',
    },
    {
      label: 'Under Review',
      value: underReviewReports,
      Icon: Eye,
      topAccent: 'border-t-[#2563EB]',
      valueColor: 'text-[#1E40AF]',
    },
    {
      label: 'Resolved / Actioned',
      value: resolvedReports,
      Icon: CheckCircle2,
      topAccent: 'border-t-[#16A34A]',
      valueColor: 'text-[#166534]',
    },
    {
      label: 'Registered Vehicles',
      value: registeredVehiclesCount,
      Icon: Car,
      topAccent: 'border-t-[#F15A24]',
      valueColor: 'text-[#F15A24]',
    },
  ];

  return (
    <div className="space-y-8 animate-page-enter">
      {/* Asymmetric Hero Section */}
      <section className="bg-[#171A1D] text-white border border-[#24282C] p-6 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between gap-6">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#F15A24] font-semibold mb-3">
              CITIZEN ROAD SAFETY PORTAL
            </p>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-[44px] font-bold tracking-tight text-white leading-[1.1] max-w-xl">
              Safer Roads Start With Us.
            </h1>
            <p className="text-sm sm:text-base text-[#92969A] mt-4 max-w-xl leading-relaxed">
              Welcome, <span className="text-white font-medium">{displayName}</span>. Document traffic violations with verified GPS evidence, extract registration plates via AI OCR, and track official enforcement progress from one command workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('report')}
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#F15A24] hover:bg-[#D94A17] text-white text-sm font-medium transition-colors whitespace-nowrap cursor-pointer"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>Report a Violation</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('my-reports')}
              className="inline-flex items-center gap-2 px-5 py-3 border border-[#3E454C] bg-[#24282C] hover:border-white text-white text-sm font-medium transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>Explore My Reports</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 flex items-stretch">
          <RoadNetworkGraphic />
        </div>
      </section>

      {error && (
        <div className="p-4 bg-[#FEE2E2] border border-[#FCA5A5] text-sm text-[#991B1B]">
          {error}
        </div>
      )}

      {/* Statistics Section (Real Database Counts) */}
      <section aria-label="Live complaint statistics" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card, index) => {
          const Icon = card.Icon;
          return (
            <div
              key={card.label}
              className={`bg-white border border-[#E2DFD7] border-t-2 ${card.topAccent} p-5 transition-all duration-150 hover:border-[#92969A] ${
                index === statCards.length - 1 ? 'col-span-2 sm:col-span-1' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[#6B7280]">{card.label}</span>
                <Icon className="w-4 h-4 text-[#92969A] shrink-0" />
              </div>
              {loading ? (
                <div className="h-9 w-16 bg-[#F5F3EF] animate-pulse mt-3" />
              ) : (
                <div
                  className={`font-mono tabular-nums text-3xl font-semibold mt-3 ${card.valueColor}`}
                >
                  {card.value}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Asymmetric Two-Column Main Layout */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT (7 cols): Recent Activity */}
        <div className="lg:col-span-7 bg-white border border-[#E2DFD7]">
          <div className="px-6 py-4 border-b border-[#E2DFD7] flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-[#171A1D]">
                Recent Activity
              </h2>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Your latest submitted violation complaints and current review states
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('my-reports')}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#F15A24] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>View All Reports</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((row) => (
                <div
                  key={row}
                  className="h-12 bg-[#F5F3EF] border border-[#E2DFD7] animate-pulse"
                />
              ))}
            </div>
          ) : recentReports.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-11 h-11 mx-auto mb-4 bg-[#F5F3EF] border border-[#E2DFD7] flex items-center justify-center text-[#171A1D]">
                <FilePlus2 className="w-5 h-5 text-[#F15A24]" />
              </div>
              <h3 className="font-display text-base font-semibold text-[#171A1D] mb-1.5">
                No Violation Reports Submitted Yet
              </h3>
              <p className="text-xs text-[#6B7280] max-w-sm mx-auto leading-relaxed mb-5">
                When you report a traffic violation with photographic evidence and GPS coordinates, its tracking ID and status timeline will appear here.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('report')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F15A24] hover:bg-[#D94A17] text-white text-xs font-medium transition-colors cursor-pointer"
              >
                <FilePlus2 className="w-4 h-4" />
                <span>Report Your First Violation</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2DFD7] bg-[#F5F3EF] text-[11px] font-mono uppercase tracking-wider text-[#6B7280]">
                    <th className="py-3 px-4">Complaint ID</th>
                    <th className="py-3 px-4">Violation Type</th>
                    <th className="py-3 px-4">Vehicle No.</th>
                    <th className="py-3 px-4">Incident Date</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2DFD7] text-sm">
                  {recentReports.map((report) => (
                    <tr
                      key={report.id}
                      onClick={() => onOpenReport(report.id)}
                      className="hover:bg-[#F5F3EF]/70 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono text-xs font-semibold text-[#171A1D] whitespace-nowrap">
                        {report.complaintCode}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[#171A1D]">{report.violationType}</div>
                        <div className="text-xs text-[#6B7280] truncate max-w-[200px]">
                          {report.locationText}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-[#24282C] whitespace-nowrap">
                        {report.vehicleRegNumber || 'Unidentified'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-[#6B7280] tabular-nums whitespace-nowrap">
                        {report.incidentDate}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <StatusTag status={report.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT (5 cols): Road Safety Insights */}
        <aside className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-[#E2DFD7] p-6 space-y-5">
            <div className="flex items-center justify-between gap-2 border-b border-[#E2DFD7] pb-3">
              <h2 className="font-display text-base font-semibold text-[#171A1D]">
                Road Safety Insights
              </h2>
              <ShieldCheck className="w-4 h-4 text-[#F15A24]" />
            </div>

            {/* Small Interactive Map Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#24282C]">
                  {latestPinnedReport
                    ? `Latest Report Pin (${latestPinnedReport.complaintCode})`
                    : 'Incident Map Preview'}
                </span>
                <span className="font-mono text-[11px] text-[#6B7280] tabular-nums">
                  {previewLat.toFixed(4)}, {previewLng.toFixed(4)}
                </span>
              </div>
              <LeafletMapPicker
                latitude={previewLat}
                longitude={previewLng}
                zoom={13}
                heightClassName="h-44"
              />
            </div>

            {/* Reporting Guidelines */}
            <div className="space-y-2.5 border-t border-[#E2DFD7] pt-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#6B7280]">
                Reporting Guidelines
              </h3>
              <ul className="space-y-2 text-xs text-[#4B5563] leading-relaxed">
                <li>
                  <strong className="text-[#171A1D]">01. Safety First:</strong> Only capture photographs when stationary or as a passenger.
                </li>
                <li>
                  <strong className="text-[#171A1D]">02. Plate Verification:</strong> Always review and confirm AI-extracted registration characters before submitting.
                </li>
                <li>
                  <strong className="text-[#171A1D]">03. Confidential Filing:</strong> Your identity is shielded from other citizens and visible only to reviewing traffic administrators.
                </li>
              </ul>
            </div>

            {/* Quick Access to Nearby Assistance */}
            <div className="bg-[#F5F3EF] border border-[#E2DFD7] p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-[#171A1D]">
                  Need Immediate Road Assistance?
                </div>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Find nearby traffic police stations and directions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('nearby')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#171A1D] hover:bg-[#24282C] text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-[#F15A24]" />
                <span>Assistance</span>
              </button>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
