import { redirect } from "next/navigation";
import { getOptionalSession } from "@/lib/auth";

export default async function RootPage() {
  const session = await getOptionalSession();
  redirect(session ? "/dashboard" : "/login");
}
