// Memastikan database tujuan (nama pada DATABASE_URL) ada sebelum `prisma db push`
// dijalankan. Terhubung ke database "postgres" bawaan pada server yang sama untuk
// membuatnya bila belum ada — supaya aplikasi ini memiliki skema terisolasi dan
// tidak bertabrakan dengan aplikasi lain yang berbagi server Postgres yang sama.
import pg from "pg";

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  console.error("DATABASE_URL belum diatur.");
  process.exit(1);
}

const url = new URL(rawUrl);
const dbName = url.pathname.slice(1);

if (!dbName || dbName === "postgres") {
  console.log("Menggunakan database default, lewati pembuatan database.");
  process.exit(0);
}

const adminUrl = new URL(rawUrl);
adminUrl.pathname = "/postgres";

const client = new pg.Client({ connectionString: adminUrl.toString() });

try {
  await client.connect();
  const res = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (res.rowCount === 0) {
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Database "${dbName}" berhasil dibuat.`);
  } else {
    console.log(`Database "${dbName}" sudah ada.`);
  }
} finally {
  await client.end();
}
