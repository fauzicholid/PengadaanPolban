import { requireSession } from "@/lib/auth";
import { AdminDashboard } from "./admin-dashboard";
import { KpaDashboard } from "./kpa-dashboard";
import { PpkDashboard } from "./ppk-dashboard";
import { StafPpkDashboard } from "./staf-ppk-dashboard";
import { PejabatDashboard } from "./pejabat-dashboard";
import { SpiDashboard } from "./spi-dashboard";
import { VendorDashboard } from "./vendor-dashboard";

export default async function DashboardPage() {
  const session = await requireSession();

  switch (session.role) {
    case "ADMIN":
      return <AdminDashboard />;
    case "KPA":
      return <KpaDashboard session={session} />;
    case "PPK":
      return <PpkDashboard session={session} />;
    case "STAF_PPK":
      return <StafPpkDashboard session={session} />;
    case "PEJABAT_PENGADAAN":
      return <PejabatDashboard session={session} />;
    case "SPI":
      return SpiDashboard();
    case "PENYEDIA":
      return <VendorDashboard session={session} />;
    default:
      return <KpaDashboard session={session} />;
  }
}
