import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, Badge, ProgressBar, Table, Th, Td } from "@/components/ui";
import { StatusBadge, TimingBadge } from "@/components/status-badge";
import { formatRupiah, formatDate, formatDateTime } from "@/lib/format";
import { STAGE_BLUEPRINT, GENERATABLE_DOCUMENT_TYPES, DOCUMENT_REQUIRED_SIGNERS, DOCUMENT_TYPE_LABELS, ROLE_LABELS } from "@/lib/constants";
import { computeTiming, canCompleteStage } from "@/lib/workflow";
import { canActOnStage } from "@/lib/stage-access";
import { isHighValuePackage } from "@/lib/risk";
import { cn } from "@/lib/utils";
import {
  DraftForm,
  UploadDocForm,
  GenerateDocumentForm,
  CompleteStageForm,
  SubmitApprovalForm,
  DecideApprovalForm,
  AssignPejabatForm,
  InviteVendorForm,
  BidForm,
  EvaluateForm,
  WinnerForm,
  ContractForm,
  MilestoneForm,
  MilestoneProgressForm,
  AddendumForm,
  CancelForm,
} from "./forms";
import { approveStageDocumentAction } from "@/actions/package";

const TABS = [
  { key: "ringkasan", label: "Ringkasan" },
  { key: "dokumen", label: "Dokumen & BA" },
  { key: "penyedia", label: "Penyedia" },
  { key: "evaluasi", label: "Evaluasi" },
  { key: "kontrak", label: "Kontrak" },
  { key: "reviu", label: "Reviu" },
  { key: "audit", label: "Jejak Audit" },
] as const;

export default async function PackageDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "ringkasan" } = await searchParams;
  const session = await requireSession();

  const pkg = await prisma.procurementPackage.findUnique({
    where: { id },
    include: {
      rup: { include: { workUnit: true } },
      ppk: true,
      stages: {
        orderBy: { sequenceNo: "asc" },
        include: {
          documents: { orderBy: { uploadedAt: "desc" }, include: { signatures: true } },
          approvals: { orderBy: { decidedAt: "desc" }, include: { approver: true } },
          pic: true,
        },
      },
      invitations: { include: { vendor: true }, orderBy: { invitedAt: "desc" } },
      bids: { include: { vendor: true, evaluations: true }, orderBy: { submittedAt: "desc" } },
      contract: { include: { milestones: true, addenda: true, vendor: true } },
      spiRequests: {
        include: { review: { include: { findings: true } }, requester: true },
        orderBy: { requestedAt: "desc" },
      },
    },
  });
  if (!pkg) notFound();

  // Object-level authorization: page-level session check alone is not
  // enough — this fetches by raw id, so scope who may view THIS package
  // the same way /packages already scopes the list, or any authenticated
  // user could view any package's bids/HPS/contract/SPI findings by id.
  const allowed =
    ["ADMIN", "KPA", "SPI"].includes(session.role) ||
    (session.role === "PPK" && pkg.ppkUserId === session.userId) ||
    (session.role === "STAF_PPK" && pkg.stages.some((s) => s.picUserId === session.userId)) ||
    (session.role === "PEJABAT_PENGADAAN" &&
      pkg.stages.some(
        (s) => s.picUserId === session.userId && ["PEMILIHAN", "EVALUASI", "NEGOSIASI"].includes(s.stageCode)
      )) ||
    (session.role === "PENYEDIA" &&
      !!session.vendorId &&
      (pkg.bids.some((b) => b.vendorId === session.vendorId) ||
        pkg.invitations.some((i) => i.vendorId === session.vendorId)));
  if (!allowed) redirect("/forbidden");

  const isOwnerPpk = session.role === "PPK" && pkg.ppkUserId === session.userId;
  const canGenerateDocs =
    ["STAF_PPK", "ADMIN"].includes(session.role) || (session.role === "PPK" && isOwnerPpk);
  const winningBid = pkg.bids.find((b) => b.status === "WINNER");
  const canViewAuditFull = ["ADMIN", "SPI"].includes(session.role);

  const auditLogs = canViewAuditFull
    ? await prisma.auditLog.findMany({
        where: { entityType: { in: ["procurement_package", "package_stage", "stage_document", "stage_approval", "contract", "bid"] }, entityId: { in: [pkg.id, ...pkg.stages.map((s) => s.id)] } },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: true },
      })
    : [];

  const verifiedVendors = await prisma.vendor.findMany({
    where: { verificationStatus: "VERIFIED", NOT: { id: { in: pkg.invitations.map((i) => i.vendorId) } } },
  });
  const pejabatOptions =
    session.role === "PPK"
      ? await prisma.user.findMany({
          where: { appointments: { some: { active: true, role: { code: "PEJABAT_PENGADAAN" } } } },
        })
      : [];

  const myBid = session.role === "PENYEDIA" ? pkg.bids.find((b) => b.vendorId === session.vendorId) : null;
  const myInvitation =
    session.role === "PENYEDIA" ? pkg.invitations.find((i) => i.vendorId === session.vendorId) : null;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-slate-400">{pkg.packageCode}</p>
            <h1 className="mt-0.5 text-lg font-semibold text-slate-900">{pkg.packageName}</h1>
            <p className="mt-1 text-xs text-slate-500">
              RUP {pkg.rup.externalRupId} · {pkg.rup.workUnit.name} · PPK {pkg.ppk.fullName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge kind="package" status={pkg.status} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Mini label="Pagu" value={formatRupiah(pkg.budgetCeiling)} />
          <Mini label="HPS" value={formatRupiah(pkg.hpsValue)} />
          <Mini label="Nilai Kontrak" value={formatRupiah(pkg.contract?.contractValue ?? pkg.contractValue)} />
          <Mini label="Sumber Dana" value={pkg.rup.sourceFund ?? "-"} />
        </div>
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
            <span>Progres</span>
            <span>{Number(pkg.progressPercent)}%</span>
          </div>
          <ProgressBar value={Number(pkg.progressPercent)} />
        </div>
      </Card>

      <Card className="overflow-x-auto p-4">
        <div className="flex min-w-max items-center gap-1">
          {pkg.stages.map((stage, idx) => (
            <div key={stage.id} className="flex items-center">
              <div className="flex w-32 flex-col items-center gap-1 text-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
                    stage.status === "COMPLETED"
                      ? "border-emerald-300 bg-emerald-500 text-white"
                      : stage.status === "CANCELLED"
                      ? "border-gray-300 bg-gray-200 text-gray-500"
                      : "border-slate-300 bg-white text-slate-500"
                  )}
                >
                  {stage.status === "COMPLETED" ? "✓" : idx + 1}
                </div>
                <span className="text-[11px] font-medium text-slate-700">{stage.stageName}</span>
                <StatusBadge kind="stage" status={stage.status} />
              </div>
              {idx < pkg.stages.length - 1 ? (
                <div
                  className={cn(
                    "h-0.5 w-6",
                    stage.status === "COMPLETED" ? "bg-emerald-400" : "bg-slate-200"
                  )}
                />
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/packages/${pkg.id}?tab=${t.key}`}
            className={cn(
              "shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium",
              tab === t.key
                ? "border-blue-700 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "ringkasan" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Persiapan Paket — KAK, HPS, Rancangan Kontrak
            </h3>
            <DraftForm
              packageId={pkg.id}
              disabled={
                !(
                  (session.role === "PPK" && isOwnerPpk) ||
                  session.role === "STAF_PPK"
                )
              }
              defaults={{
                kakSummary: pkg.kakSummary ?? "",
                specification: pkg.specification ?? "",
                hpsValue: pkg.hpsValue?.toString() ?? "",
                contractDraft: pkg.contractDraft ?? "",
                requirements: pkg.requirements ?? "",
                scheduleNotes: pkg.scheduleNotes ?? "",
              }}
            />
          </Card>
          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Penugasan Pejabat Pengadaan</h3>
              {isOwnerPpk ? (
                <AssignPejabatForm packageId={pkg.id} options={pejabatOptions} />
              ) : (
                <p className="text-xs text-slate-500">
                  {pkg.stages.find((s) => s.stageCode === "PEMILIHAN")?.pic?.fullName ??
                    "Belum ditugaskan."}
                </p>
              )}
            </Card>
            {isOwnerPpk && pkg.status !== "SELESAI" && pkg.status !== "DIBATALKAN" ? (
              <Card className="p-5">
                <h3 className="mb-2 text-sm font-semibold text-red-700">Batalkan Paket</h3>
                <CancelForm packageId={pkg.id} />
              </Card>
            ) : null}
            {pkg.status === "DIBATALKAN" ? (
              <Card className="border-red-200 p-5">
                <h3 className="text-sm font-semibold text-red-700">Paket Dibatalkan</h3>
                <p className="mt-1 text-xs text-slate-500">{pkg.cancelledReason}</p>
              </Card>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "dokumen" ? (
        <div className="space-y-4">
          {pkg.stages.map((stage) => {
            const blueprint = STAGE_BLUEPRINT.find((b) => b.code === stage.stageCode);
            const timing = computeTiming(stage.targetAt, stage.status);
            const reviuRequiresSpi = stage.stageCode === "REVIU" && isHighValuePackage(pkg);
            const gate = canCompleteStage(stage.stageCode, stage.documents, stage.approvals, {
              requiresApprovalOverride: stage.stageCode === "REVIU" ? reviuRequiresSpi : undefined,
            });
            const canAct =
              canActOnStage(session.role, stage.stageCode) &&
              (session.role !== "PPK" || isOwnerPpk);
            return (
              <Card key={stage.id}>
                <CardHeader
                  title={`${stage.sequenceNo}. ${stage.stageName}`}
                  subtitle={`Target: ${formatDate(stage.targetAt)} · PIC: ${stage.pic?.fullName ?? "-"}`}
                  action={
                    <div className="flex items-center gap-2">
                      <TimingBadge overdue={timing.overdue} dueSoon={timing.dueSoon} />
                      <StatusBadge kind="stage" status={stage.status} />
                    </div>
                  }
                />
                <div className="space-y-3 p-5">
                  {stage.documents.length === 0 && (blueprint?.requiredDocuments.length ?? 0) === 0 ? (
                    <p className="text-xs text-slate-400">Tidak ada dokumen wajib pada tahap ini.</p>
                  ) : (
                    <Table>
                      <thead>
                        <tr>
                          <Th>Jenis Dokumen</Th>
                          <Th>Wajib</Th>
                          <Th>Berkas</Th>
                          <Th>Versi</Th>
                          <Th>Status</Th>
                          <Th>Tanda Tangan</Th>
                          <Th></Th>
                        </tr>
                      </thead>
                      <tbody>
                        {stage.documents.map((doc) => {
                          const requiredSigners = DOCUMENT_REQUIRED_SIGNERS[doc.documentType] ?? [];
                          const signedRoles = new Set(doc.signatures.map((s) => s.signerRole));
                          return (
                            <tr key={doc.id}>
                              <Td>{DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}</Td>
                              <Td>{doc.required ? "Ya" : "-"}</Td>
                              <Td className="max-w-[160px] truncate text-xs text-blue-700">
                                {doc.isGenerated ? "Digenerate sistem" : (doc.fileUri ?? "-")}
                              </Td>
                              <Td>{doc.version}</Td>
                              <Td>
                                <StatusBadge kind="document" status={doc.status} />
                              </Td>
                              <Td className="text-xs">
                                {requiredSigners.length === 0
                                  ? "-"
                                  : requiredSigners
                                      .map((r) => `${ROLE_LABELS[r] ?? r}: ${signedRoles.has(r) ? "✓" : "belum"}`)
                                      .join(" · ")}
                              </Td>
                              <Td className="space-x-2">
                                {doc.isGenerated ? (
                                  <Link href={`/documents/${doc.id}`} className="text-xs font-medium text-blue-700 hover:underline">
                                    Lihat/TTD
                                  </Link>
                                ) : null}
                                {canAct && doc.status === "UPLOADED" ? (
                                  <form action={approveStageDocumentAction.bind(null, doc.id)} className="inline">
                                    <button className="text-xs font-medium text-blue-700 hover:underline" type="submit">
                                      Setujui
                                    </button>
                                  </form>
                                ) : null}
                              </Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  )}

                  {(() => {
                    const generatableOptions =
                      blueprint?.requiredDocuments
                        .filter(
                          (req) =>
                            (GENERATABLE_DOCUMENT_TYPES as readonly string[]).includes(req.type) &&
                            !stage.documents.some((d) => d.documentType === req.type && d.isGenerated)
                        )
                        .map((req) => ({ type: req.type, label: DOCUMENT_TYPE_LABELS[req.type] ?? req.label })) ?? [];
                    return canGenerateDocs && generatableOptions.length > 0 ? (
                      <GenerateDocumentForm stageId={stage.id} options={generatableOptions} />
                    ) : null;
                  })()}

                  {canAct && stage.status !== "COMPLETED" && stage.status !== "CANCELLED" ? (
                    <div className="space-y-3 border-t border-slate-100 pt-3">
                      <UploadDocForm
                        stageId={stage.id}
                        suggestedType={blueprint?.requiredDocuments[0]?.type}
                        typeOptions={blueprint?.requiredDocuments.map((req) => ({
                          type: req.type,
                          label: DOCUMENT_TYPE_LABELS[req.type] ?? req.label,
                        }))}
                      />
                      {!gate.ok ? (
                        <p className="text-xs text-amber-600">
                          Belum dapat diselesaikan — kurang: {gate.missing.join(", ")}.
                        </p>
                      ) : null}
                      {stage.stageCode === "REVIU" ? (
                        reviuRequiresSpi ? (
                          stage.status !== "WAITING_APPROVAL" ? (
                            <>
                              <p className="text-xs text-slate-500">
                                Nilai paket ini di atas ambang batas — wajib melalui reviu berbasis risiko oleh SPI sebelum tahap ini dapat diselesaikan.
                              </p>
                              <SubmitApprovalForm stageId={stage.id} />
                            </>
                          ) : (
                            <p className="text-xs text-slate-500">Menunggu keputusan reviu dari SPI.</p>
                          )
                        ) : (
                          <CompleteStageForm stageId={stage.id} label={`Selesaikan Tahap ${stage.stageName}`} />
                        )
                      ) : (
                        <CompleteStageForm stageId={stage.id} label={`Selesaikan Tahap ${stage.stageName}`} />
                      )}
                    </div>
                  ) : null}

                  {reviuRequiresSpi &&
                  stage.status === "WAITING_APPROVAL" &&
                  (session.role === "SPI" || session.role === "ADMIN") ? (
                    <div className="space-y-3 border-t border-slate-100 pt-3">
                      <p className="text-xs text-slate-500">
                        Paket bernilai tinggi — reviu berbasis risiko diperlukan sebelum tahap ini dapat diselesaikan.
                      </p>
                      <DecideApprovalForm stageId={stage.id} />
                    </div>
                  ) : null}

                  {stage.approvals.length > 0 ? (
                    <div className="border-t border-slate-100 pt-3">
                      <p className="mb-1 text-xs font-medium text-slate-500">Riwayat Persetujuan</p>
                      {stage.approvals.map((a) => (
                        <div key={a.id} className="flex items-center justify-between text-xs text-slate-600">
                          <span>
                            {a.approver.fullName} — {a.decision} {a.notes ? `(${a.notes})` : ""}
                          </span>
                          <span className="text-slate-400">{formatDateTime(a.decidedAt)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      {tab === "penyedia" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Undangan" subtitle="Hanya penyedia terverifikasi yang dapat diundang" />
            <div className="space-y-4 p-5">
              {session.role === "PEJABAT_PENGADAAN" ? (
                <InviteVendorForm
                  packageId={pkg.id}
                  options={verifiedVendors.map((v) => ({ id: v.id, companyName: v.companyName }))}
                />
              ) : null}
              {pkg.invitations.length === 0 ? (
                <p className="text-xs text-slate-400">Belum ada undangan.</p>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Penyedia</Th>
                      <Th>Diundang</Th>
                      <Th>Batas Waktu</Th>
                      <Th>Merespons</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {pkg.invitations.map((inv) => (
                      <tr key={inv.id}>
                        <Td>{inv.vendor.companyName}</Td>
                        <Td className="text-xs">{formatDateTime(inv.invitedAt)}</Td>
                        <Td className="text-xs">{formatDate(inv.deadlineAt)}</Td>
                        <Td>{inv.responded ? "Ya" : "Belum"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>
          </Card>

          {session.role === "PENYEDIA" && myInvitation ? (
            <Card className="p-5">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Penawaran Saya</h3>
              {myBid ? (
                <div className="text-sm text-slate-600">
                  <p>Nilai: {formatRupiah(myBid.offeredValue)}</p>
                  <p className="mt-1">
                    Status: <StatusBadge kind="bid" status={myBid.status} />
                  </p>
                </div>
              ) : (
                <BidForm packageId={pkg.id} />
              )}
            </Card>
          ) : null}

          {session.role === "PENYEDIA" && winningBid && winningBid.vendorId === session.vendorId ? (
            <Card className="p-5">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Dokumen Perlu Tanda Tangan Anda</h3>
              {(() => {
                const docsNeedingSignature = pkg.stages.flatMap((s) =>
                  s.documents.filter(
                    (d) =>
                      d.isGenerated &&
                      (DOCUMENT_REQUIRED_SIGNERS[d.documentType] ?? []).includes("PENYEDIA") &&
                      !d.signatures.some((sig) => sig.signerRole === "PENYEDIA")
                  )
                );
                return docsNeedingSignature.length === 0 ? (
                  <p className="text-xs text-slate-400">Tidak ada dokumen yang menunggu tanda tangan Anda saat ini.</p>
                ) : (
                  <div className="space-y-2">
                    {docsNeedingSignature.map((d) => (
                      <Link
                        key={d.id}
                        href={`/documents/${d.id}`}
                        className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 hover:bg-amber-100"
                      >
                        <span>{DOCUMENT_TYPE_LABELS[d.documentType] ?? d.documentType}</span>
                        <span className="text-xs font-medium">Tanda Tangani →</span>
                      </Link>
                    ))}
                  </div>
                );
              })()}
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === "evaluasi" ? (
        <Card>
          <CardHeader title="Evaluasi Penawaran" subtitle="Administrasi → Teknis → Harga → Klarifikasi/Negosiasi → Hasil" />
          {pkg.bids.length === 0 ? (
            <p className="px-5 py-8 text-center text-xs text-slate-400">Belum ada penawaran masuk.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {pkg.bids.map((bid) => (
                <div key={bid.id} className="space-y-2 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{bid.vendor.companyName}</p>
                      <p className="text-xs text-slate-500">Penawaran: {formatRupiah(bid.offeredValue)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge kind="bid" status={bid.status} />
                      {session.role === "PEJABAT_PENGADAAN" && bid.status !== "WINNER" && bid.status !== "LOSER" ? (
                        <WinnerForm bidId={bid.id} />
                      ) : null}
                    </div>
                  </div>
                  {bid.evaluations.length > 0 ? (
                    <ul className="space-y-1 text-xs text-slate-500">
                      {bid.evaluations.map((e) => (
                        <li key={e.id}>
                          {e.stage}: {e.result} {e.notes ? `— ${e.notes}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {session.role === "PEJABAT_PENGADAAN" ? <EvaluateForm bidId={bid.id} /> : null}
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {tab === "kontrak" ? (
        <div className="space-y-4">
          {!pkg.contract ? (
            isOwnerPpk ? (
              <Card className="p-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Buat Kontrak/SPK</h3>
                <ContractForm packageId={pkg.id} />
              </Card>
            ) : (
              <p className="text-sm text-slate-400">Kontrak belum dibuat.</p>
            )
          ) : (
            <>
              <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{pkg.contract.contractNumber}</p>
                    <p className="text-xs text-slate-500">
                      {pkg.contract.vendor.companyName} · {formatDate(pkg.contract.startDate)} – {formatDate(pkg.contract.endDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge kind="contract" status={pkg.contract.status} />
                    <Badge>{formatRupiah(pkg.contract.contractValue)}</Badge>
                  </div>
                </div>
              </Card>
              <Card>
                <CardHeader title="Milestone Pelaksanaan" />
                <div className="space-y-3 p-5">
                  {(session.role === "PPK" || session.role === "STAF_PPK") ? (
                    <MilestoneForm contractId={pkg.contract.id} />
                  ) : null}
                  {pkg.contract.milestones.length === 0 ? (
                    <p className="text-xs text-slate-400">Belum ada milestone.</p>
                  ) : (
                    <Table>
                      <thead>
                        <tr>
                          <Th>Nama</Th>
                          <Th>Target</Th>
                          <Th>Progres</Th>
                          <Th></Th>
                        </tr>
                      </thead>
                      <tbody>
                        {pkg.contract.milestones.map((m) => (
                          <tr key={m.id}>
                            <Td>{m.name}</Td>
                            <Td className="text-xs">{formatDate(m.targetDate)}</Td>
                            <Td className="w-32">
                              <ProgressBar value={Number(m.progressPercent)} />
                            </Td>
                            <Td>
                              {session.role === "PPK" || session.role === "STAF_PPK" ? (
                                <MilestoneProgressForm milestoneId={m.id} current={Number(m.progressPercent)} />
                              ) : (
                                `${Number(m.progressPercent)}%`
                              )}
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </div>
              </Card>
              <Card>
                <CardHeader title="Addendum" />
                <div className="space-y-3 p-5">
                  {isOwnerPpk ? <AddendumForm contractId={pkg.contract.id} /> : null}
                  {pkg.contract.addenda.length === 0 ? (
                    <p className="text-xs text-slate-400">Belum ada addendum.</p>
                  ) : (
                    pkg.contract.addenda.map((a) => (
                      <div key={a.id} className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                        <p className="font-medium text-slate-800">{a.reason}</p>
                        <p className="mt-0.5">{a.changes}</p>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
      ) : null}

      {tab === "reviu" ? (
        <Card>
          <CardHeader title="Reviu SPI" subtitle="Permintaan reviu, temuan, dan tindak lanjut terkait paket ini" />
          {pkg.spiRequests.length === 0 ? (
            <p className="px-5 py-8 text-center text-xs text-slate-400">
              Belum ada permintaan reviu SPI pada paket ini.{" "}
              <Link href={`/spi/requests?packageId=${pkg.id}`} className="text-blue-700 hover:underline">
                Ajukan reviu →
              </Link>
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {pkg.spiRequests.map((req) => (
                <div key={req.id} className="p-5 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-800">
                      {req.requestType === "RISK_BASED" ? "Berbasis Risiko" : "Permintaan"} oleh {req.requester.fullName}
                    </p>
                    {req.review ? <StatusBadge kind="spi" status={req.review.reviewStatus} /> : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{req.reason}</p>
                  {req.review && req.review.findings.length > 0 ? (
                    <p className="mt-1 text-xs text-amber-600">{req.review.findings.length} temuan tercatat</p>
                  ) : null}
                  <Link href={`/spi/requests/${req.id}`} className="mt-1 inline-block text-xs text-blue-700 hover:underline">
                    Lihat detail →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {tab === "audit" ? (
        <Card>
          <CardHeader title="Jejak Audit" subtitle="Riwayat transaksi kritis pada paket ini" />
          {!canViewAuditFull ? (
            <p className="px-5 py-8 text-center text-xs text-slate-400">
              Jejak audit lengkap hanya dapat dilihat oleh Admin/SPI.
            </p>
          ) : auditLogs.length === 0 ? (
            <p className="px-5 py-8 text-center text-xs text-slate-400">Belum ada catatan.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {auditLogs.map((log) => (
                <div key={log.id.toString()} className="flex items-center justify-between px-5 py-2.5">
                  <span>
                    <strong>{log.action}</strong> pada {log.entityType} oleh {log.user?.fullName ?? "Sistem"}
                  </span>
                  <span className="text-slate-400">{formatDateTime(log.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  );
}
