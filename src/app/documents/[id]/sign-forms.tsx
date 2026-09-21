"use client";

import { useActionState } from "react";
import {
  signStageDocumentAction,
  signStageDocumentAsVendorAction,
  signStageDocumentAsKpaAction,
  type DocActionState,
} from "@/actions/documents";

const empty: DocActionState = {};

function ErrorSuccess({ state }: { state: DocActionState }) {
  if (state.error) return <p className="mt-2 text-[11px] text-red-600">{state.error}</p>;
  if (state.success) return <p className="mt-2 text-[11px] text-emerald-600">{state.success}</p>;
  return null;
}

function SignForm({
  documentId,
  action,
  label,
}: {
  documentId: string;
  action: (prev: DocActionState, formData: FormData) => Promise<DocActionState>;
  label: string;
}) {
  const [state, formAction, pending] = useActionState<DocActionState, FormData>(action, empty);
  return (
    <form action={formAction}>
      <input type="hidden" name="documentId" value={documentId} />
      <button
        type="submit"
        disabled={pending}
        className="no-print rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {pending ? "Memproses..." : label}
      </button>
      <ErrorSuccess state={state} />
    </form>
  );
}

export function SignAsPpkForm({ documentId }: { documentId: string }) {
  return <SignForm documentId={documentId} action={signStageDocumentAction} label="Tanda Tangani (PPK)" />;
}

export function SignAsVendorForm({ documentId }: { documentId: string }) {
  return (
    <SignForm documentId={documentId} action={signStageDocumentAsVendorAction} label="Tanda Tangani (Penyedia)" />
  );
}

export function SignAsKpaForm({ documentId }: { documentId: string }) {
  return <SignForm documentId={documentId} action={signStageDocumentAsKpaAction} label="Tanda Tangani (KPA)" />;
}
