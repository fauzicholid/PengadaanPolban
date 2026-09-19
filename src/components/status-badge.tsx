import { Badge } from "@/components/ui";
import {
  STAGE_STATUS_LABELS,
  STAGE_STATUS_COLORS,
  VENDOR_STATUS_LABELS,
  PACKAGE_STATUS_LABELS,
  DOCUMENT_STATUS_LABELS,
  SPI_STATUS_LABELS,
  FINDING_STATUS_LABELS,
  CONTRACT_STATUS_LABELS,
  BID_STATUS_LABELS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

const GENERIC_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600 border-slate-200",
  SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",
  UNDER_REVIEW: "bg-violet-50 text-violet-700 border-violet-200",
  REVISION: "bg-orange-50 text-orange-700 border-orange-200",
  VERIFIED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  SUSPENDED: "bg-gray-100 text-gray-600 border-gray-200",
  EXPIRED: "bg-red-50 text-red-700 border-red-200",
  UPLOADED: "bg-blue-50 text-blue-700 border-blue-200",
  FINAL: "bg-emerald-50 text-emerald-700 border-emerald-200",
  NOT_REVIEWED: "bg-slate-100 text-slate-600 border-slate-200",
  CLARIFICATION: "bg-amber-50 text-amber-700 border-amber-200",
  FOLLOW_UP_REQUIRED: "bg-orange-50 text-orange-700 border-orange-200",
  FOLLOW_UP_PROCESS: "bg-blue-50 text-blue-700 border-blue-200",
  FOLLOW_UP_VERIFICATION: "bg-violet-50 text-violet-700 border-violet-200",
  CLOSED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ACTIVE: "bg-blue-50 text-blue-700 border-blue-200",
  ADDENDUM: "bg-amber-50 text-amber-700 border-amber-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  TERMINATED: "bg-red-50 text-red-700 border-red-200",
  WINNER: "bg-emerald-50 text-emerald-700 border-emerald-200",
  LOSER: "bg-gray-100 text-gray-500 border-gray-200",
};

type Kind =
  | "stage"
  | "vendor"
  | "package"
  | "document"
  | "spi"
  | "finding"
  | "contract"
  | "bid";

const LABEL_MAP: Record<Kind, Record<string, string>> = {
  stage: STAGE_STATUS_LABELS,
  vendor: VENDOR_STATUS_LABELS,
  package: PACKAGE_STATUS_LABELS,
  document: DOCUMENT_STATUS_LABELS,
  spi: SPI_STATUS_LABELS,
  finding: FINDING_STATUS_LABELS,
  contract: CONTRACT_STATUS_LABELS,
  bid: BID_STATUS_LABELS,
};

export function StatusBadge({ kind, status }: { kind: Kind; status: string }) {
  const label = LABEL_MAP[kind][status] ?? status;
  const color =
    kind === "stage"
      ? STAGE_STATUS_COLORS[status]
      : GENERIC_COLORS[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return <Badge className={cn(color)}>{label}</Badge>;
}

export function TimingBadge({ overdue, dueSoon }: { overdue: boolean; dueSoon: boolean }) {
  if (overdue) {
    return (
      <Badge className="border-red-200 bg-red-50 text-red-700">⚠ Terlambat</Badge>
    );
  }
  if (dueSoon) {
    return (
      <Badge className="border-yellow-200 bg-yellow-50 text-yellow-800">
        ⏱ Mendekati Batas Waktu
      </Badge>
    );
  }
  return null;
}
