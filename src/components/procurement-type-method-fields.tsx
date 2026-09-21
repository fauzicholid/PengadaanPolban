"use client";

import { useState } from "react";
import { PROCUREMENT_TYPES, PROCUREMENT_METHODS_BY_TYPE, suggestProcurementMethod } from "@/lib/constants";

// Dropdown jenis + metode pengadaan yang saling terkait (metode menyesuaikan
// jenis) dengan saran otomatis berdasarkan nilai pagu, sesuai Perpres
// 16/2018 jo. 12/2021 jo. 46/2025 Pasal 3, 38, dan 41.
export function ProcurementTypeMethodFields({
  typeName = "procurementType",
  methodName = "procurementMethod",
  defaultType = "",
  defaultMethod = "",
  budgetCeiling,
  required,
}: {
  typeName?: string;
  methodName?: string;
  defaultType?: string;
  defaultMethod?: string;
  budgetCeiling?: number | null;
  required?: boolean;
}) {
  const [type, setType] = useState(defaultType);
  const [manualMethod, setManualMethod] = useState(defaultMethod);
  const [methodTouched, setMethodTouched] = useState(!!defaultMethod);

  const methodOptions = type ? PROCUREMENT_METHODS_BY_TYPE[type as keyof typeof PROCUREMENT_METHODS_BY_TYPE] ?? [] : [];
  const suggested = type && budgetCeiling ? suggestProcurementMethod(type, budgetCeiling) : null;

  // Derived (not effect-driven) so a jenis/pagu change immediately reflects
  // a new suggestion, while an explicit user pick for the current jenis
  // sticks until they change jenis again.
  const effectiveMethod =
    methodTouched && methodOptions.includes(manualMethod)
      ? manualMethod
      : suggested && methodOptions.includes(suggested)
        ? suggested
        : "";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Jenis Pengadaan {required ? <span className="text-red-500">*</span> : null}
        </label>
        <select
          name={typeName}
          required={required}
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setMethodTouched(false);
          }}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
        >
          <option value="">Pilih jenis pengadaan</option>
          {PROCUREMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Metode Pengadaan</label>
        <select
          name={methodName}
          value={effectiveMethod}
          disabled={!type}
          onChange={(e) => {
            setManualMethod(e.target.value);
            setMethodTouched(true);
          }}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">{type ? "Pilih metode pengadaan" : "Pilih jenis pengadaan dahulu"}</option>
          {methodOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        {suggested ? (
          <p className="mt-1 text-[11px] text-slate-400">
            Saran berdasarkan pagu: <strong>{suggested}</strong> (dapat diubah sesuai kondisi).
          </p>
        ) : null}
      </div>
    </div>
  );
}
