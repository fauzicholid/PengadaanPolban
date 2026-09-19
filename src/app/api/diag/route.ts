import { NextResponse } from "next/server";
import { Client } from "pg";

// Rute diagnostik sementara untuk menelusuri masalah koneksi database saat deploy.
// TODO: hapus setelah deployment awal stabil.
export async function GET() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    return NextResponse.json({ ok: false, step: "env", error: "DATABASE_URL tidak diset" });
  }

  let host = "";
  let dbName = "";
  try {
    const u = new URL(raw);
    host = u.host;
    dbName = u.pathname.slice(1);
  } catch (e) {
    return NextResponse.json({ ok: false, step: "parse_url", error: String(e) });
  }

  const client = new Client({ connectionString: raw });
  try {
    await client.connect();
    const res = await client.query("select current_database() as db, version() as version");
    await client.end();
    return NextResponse.json({
      ok: true,
      host,
      dbNameFromUrl: dbName,
      currentDatabase: res.rows[0].db,
      version: res.rows[0].version,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      step: "connect_or_query",
      host,
      dbNameFromUrl: dbName,
      error: e instanceof Error ? { message: e.message, name: e.name, stack: e.stack } : String(e),
    });
  }
}
