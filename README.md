# Sistem Informasi Pengadaan Barang/Jasa — Polban

Aplikasi manajemen, monitoring, dokumentasi, dan pengendalian pengadaan
internal Politeknik Negeri Bandung. Dibangun berdasarkan PRD v1.0, SRS/BPMN/ERD
v1.0, dan skema PostgreSQL starter yang disediakan.

Aplikasi ini **bukan pengganti SPSE LKPP**. Integrasi SiRUP/OSS dilakukan
melalui mekanisme resmi (API bila tersedia) atau impor data yang sah.

## Prinsip Produk

RUP-first → Verified Vendor → Controlled Workflow → Document Gate →
Segregation of Duties → Audit Trail → Monitoring & Early Warning →
Review & Follow-up.

## Tumpukan Teknologi

- **Next.js 16** (App Router, Server Actions, Turbopack)
- **PostgreSQL** via **Prisma ORM 7** (driver adapter `@prisma/adapter-pg`)
- Autentikasi sesi kustom (JWT `jose` + cookie httpOnly, bcrypt untuk hash kata sandi)
- Tailwind CSS v4

## Peran & RBAC

Admin, KPA, PPK, Staf PPK, Pejabat Pengadaan, SPI, dan Penyedia — masing-masing
dengan ruang lingkup akses, menu, dan aksi yang berbeda sesuai PRD §13/§14 dan
SRS §7.

## Modul Utama

- Identitas & Akses (autentikasi, RBAC, unit kerja, penugasan)
- Registrasi & Verifikasi Penyedia (NIB, NPWP, KBLI, legalitas)
- RUP (impor/sinkronisasi, staging)
- Paket & Tahapan Terkontrol (Persiapan → Reviu → Pemilihan → Evaluasi →
  Negosiasi/Hasil → Kontrak → Pelaksanaan → Serah Terima) dengan **document
  gate** otomatis (BR-01) dan progres otomatis dari bobot milestone (BR-04)
- Reviu KPA (maker-checker-approver)
- Pemilihan Penyedia (undangan, penawaran, evaluasi administrasi/teknis/harga)
- Kontrak, Milestone, Addendum
- Pengawasan Internal SPI (permintaan reviu, reviu berbasis risiko, catatan/
  temuan, tindak lanjut dengan verifikasi — BR-12/BR-13)
- Dashboard eksekutif dengan drill-down, dashboard SPI
- Jejak Audit (BR-03)

## Menjalankan Secara Lokal

```bash
npm install
cp .env.example .env   # isi DATABASE_URL dan SESSION_SECRET
npm run db:push        # sinkronkan skema ke database
npm run db:seed        # data demo untuk seluruh peran
npm run dev
```

### Akun Demo

Kata sandi semua akun demo: `polban123`

| Peran | Email |
| --- | --- |
| Admin | admin@polban.ac.id |
| KPA | kpa@polban.ac.id |
| PPK | ppk@polban.ac.id |
| Staf PPK | stafppk@polban.ac.id |
| Pejabat Pengadaan | pejabatpengadaan@polban.ac.id |
| SPI | spi@polban.ac.id |
| Penyedia | vendor@mitrateknik.co.id |

## Deploy ke Vercel

1. Sediakan database PostgreSQL (mis. Neon/Vercel Postgres) dan set env
   `DATABASE_URL` serta `SESSION_SECRET` pada Project Settings → Environment
   Variables.
2. Jalankan `npx prisma db push` (atau migrate) terhadap database produksi,
   lalu `npm run db:seed` bila ingin data demo.
3. Deploy — build command `npm run build` sudah menjalankan `prisma generate`
   secara otomatis (lihat `package.json`).

## Catatan Kepatuhan

Implementasi final wajib divalidasi kembali oleh unit PBJ/hukum instansi
terhadap regulasi (Perpres 16/2018 jo. Perpres 46/2025, Peraturan LKPP
11/2021) dan SOP internal terbaru.
