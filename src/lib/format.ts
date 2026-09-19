type Numeric = number | string | { toString(): string } | null | undefined;

export function formatRupiah(value: Numeric) {
  if (value === null || value === undefined) return "Rp 0";
  const num = typeof value === "number" ? value : Number(value.toString());
  if (Number.isNaN(num)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatNumber(value: Numeric) {
  if (value === null || value === undefined) return "0";
  const num = typeof value === "number" ? value : Number(value.toString());
  if (Number.isNaN(num)) return "0";
  return new Intl.NumberFormat("id-ID").format(num);
}
