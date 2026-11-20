import { CheckCircle2, Clock, Eye, FileCheck, ShieldAlert, XCircle } from 'lucide-react';
import type { ComplaintStatus } from '../types/domain';

const STATUS_STYLES: Record<
  ComplaintStatus,
  { text: string; bg: string; border: string; Icon: typeof Clock }
> = {
  Submitted: {
    text: 'text-[#24282C]',
    bg: 'bg-[#F5F3EF]',
    border: 'border-[#D4D0C8]',
    Icon: Clock,
  },
  'Under Review': {
    text: 'text-[#92400E]',
    bg: 'bg-[#FEF3C7]',
    border: 'border-[#FCD34D]',
    Icon: Eye,
  },
  Verified: {
    text: 'text-[#1E40AF]',
    bg: 'bg-[#DBEAFE]',
    border: 'border-[#93C5FD]',
    Icon: FileCheck,
  },
  'Action Taken': {
    text: 'text-[#9A3412]',
    bg: 'bg-[#FFF1EB]',
    border: 'border-[#F15A24]/40',
    Icon: ShieldAlert,
  },
  Resolved: {
    text: 'text-[#166534]',
    bg: 'bg-[#DCFCE7]',
    border: 'border-[#86EFAC]',
    Icon: CheckCircle2,
  },
  Rejected: {
    text: 'text-[#991B1B]',
    bg: 'bg-[#FEE2E2]',
    border: 'border-[#FCA5A5]',
    Icon: XCircle,
  },
};

export function StatusTag({ status }: { status: ComplaintStatus }) {
  const cfg = STATUS_STYLES[status] || STATUS_STYLES.Submitted;
  const Icon = cfg.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded-sm whitespace-nowrap shrink-0 ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {status}
    </span>
  );
}
