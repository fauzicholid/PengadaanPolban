import { requireRole } from "@/lib/auth";
import { getRiskQueue } from "@/lib/risk";
import { PageHeader, Card, Table, Th, Td, EmptyState, Badge } from "@/components/ui";
import { formatRupiah } from "@/lib/format";
import { RISK_LEVEL_LABELS } from "@/lib/constants";
import { StartRiskReviewForm } from "../spi-forms";

const LEVEL_COLOR: Record<string, string> = {
  HIGH: "border-red-200 bg-red-50 text-red-700",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-700",
  LOW: "border-slate-200 bg-slate-100 text-slate-600",
};

export default async function SpiRiskPage() {
  await requireRole(["SPI"]);
  const queue = await getRiskQueue();

  return (
    <div>
      <PageHeader
        title="Reviu Berbasis Risiko"
        description="Sistem memberi prioritas/rekomendasi paket berdasarkan indikator risiko. Risk flag bersifat alat bantu prioritisasi, bukan kesimpulan pelanggaran. Penetapan penugasan tetap dilakukan oleh SPI."
      />
      <Card>
        {queue.length === 0 ? (
          <EmptyState title="Tidak ada paket dengan indikator risiko saat ini" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Paket</Th>
                <Th>Nilai</Th>
                <Th>Indikator</Th>
                <Th>Tingkat Risiko</Th>
                <Th>Aksi</Th>
              </tr>
            </thead>
            <tbody>
              {queue.map((item) => (
                <tr key={item.packageId}>
                  <Td>
                    <p className="font-medium text-slate-800">{item.packageName}</p>
                    <p className="text-xs text-slate-500">{item.packageCode}</p>
                  </Td>
                  <Td>{formatRupiah(item.value)}</Td>
                  <Td>
                    <ul className="list-inside list-disc text-xs text-slate-500">
                      {item.reasons.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </Td>
                  <Td>
                    <Badge className={LEVEL_COLOR[item.level]}>{RISK_LEVEL_LABELS[item.level]}</Badge>
                  </Td>
                  <Td>
                    <StartRiskReviewForm packageId={item.packageId} reasons={item.reasons} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
