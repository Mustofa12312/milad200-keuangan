# PRD — Laporan Keuangan 200 Tahun Panyeppen

**Versi:** 1.0
**Status:** Draft siap development
**Jenis:** Web Application
**Target:** Organisasi
**Frontend:** React + Vite + Tailwind CSS
**Backend:** Supabase
**Deployment:** Vercel
**Database:** PostgreSQL (Supabase)
**Storage:** Supabase Storage
**Authentication:** Supabase Auth

---

# 1. Ringkasan Produk

**Laporan Keuangan 200 Tahun Panyeppen** adalah aplikasi web untuk membantu organisasi mencatat, mengelola, memantau, dan melaporkan aktivitas keuangan secara terstruktur.

Sistem berfokus pada:

- Pencatatan pemasukan
- Pencatatan pengeluaran
- Penyimpanan foto bukti/nota
- Pencatatan hutang
- Pengelolaan kategori pengeluaran
- Pengelolaan pengguna
- Laporan keuangan
- Rekap saldo
- Audit aktivitas pengguna

Sistem dirancang untuk digunakan oleh **1 atau lebih admin serta 3 atau lebih user/petugas**.

---

# 2. Tujuan Sistem

## Tujuan utama

Menggantikan pencatatan keuangan manual menjadi sistem digital yang:

- Lebih terstruktur
- Mudah digunakan
- Memiliki bukti transaksi
- Mudah dicari
- Mudah dibuatkan laporan
- Memiliki pembagian hak akses
- Memiliki histori perubahan
- Dapat digunakan melalui HP maupun komputer

## Masalah yang ingin diselesaikan

Sistem dibuat untuk mengatasi:

1. Pencatatan transaksi yang masih manual.
2. Sulit mengetahui total pemasukan.
3. Sulit mengetahui total pengeluaran.
4. Nota mudah hilang.
5. Sulit mengetahui siapa yang melakukan transaksi.
6. Sulit membuat laporan periode tertentu.
7. Kesalahan pencatatan.
8. Kesulitan memantau hutang.
9. Tidak adanya histori perubahan transaksi.

---

# 3. Target Pengguna

Sistem menggunakan sistem **Role Based Access Control (RBAC)**.

## Role

### Admin

Jumlah:

> 1 atau lebih

Admin memiliki hak pengelolaan sistem.

Hak utama:

- Login
- Melihat dashboard
- Melihat seluruh transaksi
- Menambah pemasukan
- Mengedit pemasukan
- Menghapus/membatalkan transaksi
- Menambah pengeluaran
- Mengedit pengeluaran
- Menghapus/membatalkan transaksi
- Mengelola kategori
- Mengelola pengguna
- Mengelola hutang
- Melihat laporan
- Export laporan
- Melihat foto nota
- Melihat audit log

---

### User/Petugas

Jumlah:

> 3 atau lebih

Hak utama:

- Login
- Melihat dashboard sesuai izin
- Menambah pemasukan
- Mengedit transaksi
- Menambah pengeluaran
- Upload foto nota
- Melihat transaksi
- Mencatat hutang
- Melihat laporan yang diizinkan

User **tidak dapat**:

- Mengelola user
- Mengubah role
- Mengelola kategori jika tidak diberikan izin
- Mengubah konfigurasi sistem
- Menghapus data secara permanen

---

# 4. Konsep Hak Akses

Struktur:

```text
                    SISTEM
                       │
             ┌─────────┴─────────┐
             │                   │
           ADMIN               USER
             │                   │
      ┌──────┼──────┐       ┌────┼────┐
      │      │      │       │    │    │
    User   Kategori Laporan  Input Edit Lihat
    Mgmt
```

Untuk versi awal, role cukup:

```text
ADMIN
USER
```

Tetapi database sebaiknya dibuat fleksibel agar nanti dapat ditambahkan:

```text
BENDAHARA
KETUA
SEKRETARIS
AUDITOR
```

tanpa membangun ulang sistem.

---

# 5. Modul Sistem

```text
Laporan Keuangan 200 Tahun Panyeppen
│
├── Authentication
│
├── Dashboard
│
├── Pemasukan
│
├── Pengeluaran
│
├── Hutang
│
├── Kategori
│
├── Pengguna
│
├── Laporan
│
├── Bukti Transaksi
│
├── Audit Log
│
└── Pengaturan
```

---

# 6. Authentication

Menggunakan:

**Supabase Auth**

Fitur:

- Login
- Logout
- Email + password
- Reset password
- Session management
- Protected routes
- Role management

Flow:

```text
User membuka website
        ↓
Apakah sudah login?
   ┌────┴────┐
   │         │
  Tidak     Ya
   │         │
 Login    Dashboard
   │
Validasi
   │
Dashboard
```

---

# 7. Dashboard

Dashboard menjadi halaman utama setelah login.

## Statistik utama

```text
┌─────────────────────┐
│ Saldo Saat Ini      │
│ Rp XX.XXX.XXX       │
└─────────────────────┘

┌─────────────────────┐
│ Total Pemasukan     │
│ Rp XX.XXX.XXX       │
└─────────────────────┘

┌─────────────────────┐
│ Total Pengeluaran   │
│ Rp XX.XXX.XXX       │
└─────────────────────┘

┌─────────────────────┐
│ Total Hutang        │
│ Rp XX.XXX.XXX       │
└─────────────────────┘
```

## Grafik

### Grafik pemasukan vs pengeluaran

Filter:

- Hari
- Minggu
- Bulan
- Tahun
- Custom date range

Contoh:

```text
Pemasukan  ─────────────
Pengeluaran ────────────
```

## Pengeluaran berdasarkan kategori

Contoh:

```text
Konsumsi       35%
Transportasi   20%
ATK            15%
Operasional    20%
Lainnya        10%
```

## Transaksi terbaru

Menampilkan:

- Tanggal
- Jenis
- Keterangan
- Nominal
- Petugas

---

# 8. Modul Pemasukan

## Form

Field:

| Field            | Tipe   | Wajib    |
| ---------------- | ------ | -------- |
| Tanggal          | Date   | Ya       |
| Sumber pemasukan | Text   | Ya       |
| Nominal          | Number | Ya       |
| Keterangan       | Text   | Tidak    |
| Bukti/nota       | Image  | **Ya**   |
| Petugas          | User   | Otomatis |

Contoh:

```text
Tanggal
27 September 2026

Sumber
Donasi kegiatan

Nominal
Rp 2.500.000

Keterangan
Donasi kegiatan organisasi

Bukti
📷 nota.jpg

Petugas
Mustofa
```

---

# 9. Modul Pengeluaran

## Form

| Field      | Tipe   | Wajib    |
| ---------- | ------ | -------- |
| Tanggal    | Date   | Ya       |
| Kategori   | Select | Ya       |
| Nominal    | Number | Ya       |
| Keterangan | Text   | Tidak    |
| Foto nota  | Image  | **Ya**   |
| Petugas    | User   | Otomatis |

Contoh:

```text
Tanggal:
27 September 2026

Kategori:
Konsumsi

Nominal:
Rp 750.000

Keterangan:
Pembelian konsumsi acara

Foto Nota:
📷 IMG_20260927.webp

Petugas:
Ahmad
```

---

# 10. Aturan Foto Nota

**Setiap pemasukan dan pengeluaran wajib memiliki bukti foto.**

Flow:

```text
User membuat transaksi
        ↓
Input data
        ↓
Ambil/upload foto
        ↓
Validasi ukuran
        ↓
Compress image
        ↓
Upload Supabase Storage
        ↓
Simpan transaksi
```

## Optimasi

Foto tidak langsung disimpan dalam ukuran asli.

Contoh:

```text
Foto kamera
4 MB
  ↓
Compression
  ↓
WebP/JPEG
±300–500 KB
  ↓
Supabase Storage
```

Tujuannya menghemat storage.

---

# 11. Modul Kategori

Kategori hanya dapat dikelola oleh Admin.

Contoh default:

```text
Konsumsi
Transportasi
ATK
Operasional
Listrik
Internet
Peralatan
Acara
Dokumentasi
Kesehatan
Lainnya
```

Admin dapat:

- Tambah kategori
- Edit kategori
- Aktifkan kategori
- Nonaktifkan kategori

### Jangan langsung menghapus kategori

Jika kategori sudah digunakan transaksi:

```text
Kategori
   ↓
Nonaktif
```

bukan:

```text
DELETE
```

Dengan demikian transaksi lama tetap valid.

---

# 12. Modul Hutang

Sistem mencatat **hutang organisasi**, bukan piutang.

## Data hutang

| Field          | Wajib    |
| -------------- | -------- |
| Nama pihak     | Ya       |
| Nominal        | Ya       |
| Tanggal hutang | Ya       |
| Jatuh tempo    | Tidak    |
| Keterangan     | Tidak    |
| Bukti          | Opsional |
| Status         | Otomatis |

Status:

```text
BELUM LUNAS
SEBAGIAN
LUNAS
```

---

# 13. Pembayaran Hutang

Hutang sebaiknya mendukung pembayaran bertahap.

Contoh:

```text
Hutang:
Rp 2.000.000

Pembayaran:

27 Sep
Rp 500.000

30 Sep
Rp 500.000

Sisa:
Rp 1.000.000
```

Status:

```text
Rp 2.000.000
      ↓
Bayar Rp500.000
      ↓
Sisa Rp1.500.000
      ↓
Bayar Rp500.000
      ↓
Sisa Rp1.000.000
```

Ketika:

```text
sisa = 0
```

status otomatis menjadi:

```text
LUNAS
```

---

# 14. Edit Transaksi

Transaksi **boleh diedit**.

Contoh:

```text
Awalnya:

Pengeluaran
Rp500.000

        ↓ edit

Menjadi:

Pengeluaran
Rp450.000
```

Sistem mencatat:

```text
created_by
created_at
updated_by
updated_at
```

Sehingga perubahan dapat dilacak.

---

# 15. Soft Delete

Transaksi tidak langsung dihapus dari database.

Contoh:

```text
is_deleted = true
deleted_by
deleted_at
```

Transaksi akan disembunyikan dari tampilan normal.

Admin dapat melihat transaksi yang dibatalkan melalui:

> Riwayat / Audit Log

Ini penting untuk sistem keuangan organisasi.

---

# 16. Audit Log

Sistem mencatat aktivitas penting.

Contoh:

```text
27 Sep 2026 19:30
Ahmad
Menambahkan pengeluaran
Rp750.000

27 Sep 2026 20:10
Bendahara
Mengubah pengeluaran
Rp750.000 → Rp700.000

27 Sep 2026 20:15
Admin
Menonaktifkan kategori
Transportasi
```

Aktivitas yang dicatat:

- Login
- Logout
- Tambah transaksi
- Edit transaksi
- Pembatalan transaksi
- Tambah kategori
- Edit kategori
- User dibuat
- User dinonaktifkan
- Perubahan role

---

# 17. Laporan

Ini merupakan salah satu fitur utama.

## Laporan pemasukan

Filter:

```text
Tanggal
Sumber
Petugas
```

Output:

```text
Total Pemasukan
Rp XX.XXX.XXX
```

---

## Laporan pengeluaran

Filter:

```text
Tanggal
Kategori
Petugas
```

Output:

```text
Konsumsi       Rp 3.500.000
Transportasi   Rp 1.200.000
ATK            Rp   750.000
Operasional    Rp 2.000.000
```

---

## Laporan hutang

Menampilkan:

```text
Nama
Total Hutang
Sudah Dibayar
Sisa
Jatuh Tempo
Status
```

---

# 18. Rekap Saldo

Rumus utama:

```text
SALDO =
TOTAL PEMASUKAN
-
TOTAL PENGELUARAN
-
PEMBAYARAN HUTANG
```

Namun untuk akurasi akuntansi, pada implementasi final kita perlu memastikan **pembayaran hutang tidak dihitung dua kali sebagai pengeluaran** jika pembayaran tersebut sudah dicatat sebagai transaksi pengeluaran.

Karena itu struktur database akan dibuat agar transaksi hutang dan arus kas dapat dibedakan dengan jelas.

---

# 19. Export

Laporan dapat diekspor:

### CSV

Untuk spreadsheet sederhana.

### Excel

Untuk pengolahan lebih lanjut.

### PDF

Untuk laporan organisasi.

### Print

Untuk mencetak langsung.

Contoh:

```text
LAPORAN KEUANGAN
200 TAHUN PANYEPPEN

Periode:
01 September 2026
-
30 September 2026

Total Pemasukan:
Rp XX.XXX.XXX

Total Pengeluaran:
Rp XX.XXX.XXX

Saldo:
Rp XX.XXX.XXX
```

---

# 20. Pencarian dan Filter

Semua transaksi harus dapat dicari.

Search:

```text
Cari transaksi...
```

Filter:

```text
Tanggal
Kategori
Jenis transaksi
Petugas
Nominal
Status
```

Sorting:

```text
Terbaru
Terlama
Nominal terbesar
Nominal terkecil
```

---

# 21. Struktur Database Supabase

Struktur awal:

```text
profiles
roles
categories
transactions
transaction_receipts
debts
debt_payments
audit_logs
```

---

## `profiles`

```text
id
user_id
full_name
email
role_id
avatar_url
is_active
created_at
updated_at
```

---

## `roles`

```text
id
name
description
created_at
```

Contoh:

```text
ADMIN
USER
```

---

## `categories`

```text
id
name
description
is_active
created_by
created_at
updated_at
```

---

## `transactions`

```text
id
type
transaction_date
category_id
source
amount
description
created_by
updated_by
created_at
updated_at
is_deleted
deleted_by
deleted_at
```

`type`:

```text
INCOME
EXPENSE
```

---

## `transaction_receipts`

```text
id
transaction_id
storage_path
file_name
file_size
mime_type
uploaded_by
created_at
```

Dengan pemisahan ini, bukti transaksi tidak bercampur dengan data transaksi utama.

---

## `debts`

```text
id
party_name
original_amount
remaining_amount
debt_date
due_date
description
status
created_by
updated_by
created_at
updated_at
```

---

## `debt_payments`

```text
id
debt_id
amount
payment_date
description
receipt_path
created_by
created_at
```

---

## `audit_logs`

```text
id
user_id
action
entity_type
entity_id
old_data
new_data
created_at
```

---

# 22. Supabase Storage

Bucket:

```text
transaction-receipts
```

Struktur:

```text
transaction-receipts/
│
├── income/
│   └── 2026/
│       └── 09/
│
├── expense/
│   └── 2026/
│       └── 09/
│
└── debt/
    └── 2026/
        └── 09/
```

File sebaiknya menggunakan nama unik:

```text
UUID.webp
```

bukan:

```text
nota.jpg
```

agar tidak terjadi benturan nama file.

---

# 23. Security

Security merupakan bagian penting dari sistem.

Supabase menggunakan:

**Row Level Security (RLS).**

Contoh:

```text
User
 ↓
Supabase Auth
 ↓
Authenticated
 ↓
RLS
 ↓
Database
```

Admin:

```text
SELECT ALL
INSERT
UPDATE
DELETE/soft-delete
```

User:

```text
SELECT
INSERT
UPDATE sesuai permission
```

User tidak boleh mengakses data yang tidak sesuai dengan kebijakan sistem.

### Storage juga harus menggunakan policy

Foto nota tidak boleh dibuat sebagai file publik secara sembarangan.

Lebih baik:

```text
Private Bucket
      ↓
Authenticated user
      ↓
Signed URL
      ↓
Preview nota
```

---

# 24. Struktur Frontend

Saya menyarankan struktur React:

```text
src/
│
├── assets/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── forms/
│   ├── tables/
│   ├── charts/
│   └── receipt/
│
├── pages/
│   ├── auth/
│   │   └── Login.jsx
│   │
│   ├── dashboard/
│   │   └── Dashboard.jsx
│   │
│   ├── income/
│   │   ├── IncomeList.jsx
│   │   ├── IncomeCreate.jsx
│   │   └── IncomeEdit.jsx
│   │
│   ├── expense/
│   │   ├── ExpenseList.jsx
│   │   ├── ExpenseCreate.jsx
│   │   └── ExpenseEdit.jsx
│   │
│   ├── debts/
│   │   ├── DebtList.jsx
│   │   ├── DebtCreate.jsx
│   │   └── DebtDetail.jsx
│   │
│   ├── categories/
│   │   └── CategoryList.jsx
│   │
│   ├── users/
│   │   └── UserList.jsx
│   │
│   ├── reports/
│   │   └── Reports.jsx
│   │
│   └── audit/
│       └── AuditLog.jsx
│
├── services/
│   ├── supabase.js
│   ├── auth.js
│   ├── transactions.js
│   ├── debts.js
│   ├── categories.js
│   └── reports.js
│
├── hooks/
│
├── contexts/
│   └── AuthContext.jsx
│
├── utils/
│
├── routes/
│
├── App.jsx
└── main.jsx
```

---

# 25. Navigasi

Desktop:

```text
┌─────────────────────────────────────┐
│ Laporan Keuangan 200 Tahun Panyeppen│
├──────────┬──────────────────────────┤
│ Dashboard│                          │
│ Pemasukan│                          │
│ Pengeluar│       CONTENT            │
│ Hutang   │                          │
│ Laporan  │                          │
│ Kategori │                          │
│ Pengguna │                          │
│ Audit    │                          │
└──────────┴──────────────────────────┘
```

Mobile:

```text
Header
   ↓
Content
   ↓
Bottom Navigation
```

Aplikasi harus **responsive**, karena petugas kemungkinan besar memasukkan transaksi melalui HP.

---

# 26. UX Input Nota

Karena aplikasi akan banyak digunakan melalui HP, halaman pengeluaran sebaiknya memiliki tombol:

```text
┌────────────────────────────┐
│       📷 FOTO NOTA         │
│                            │
│   Ambil Foto / Upload      │
└────────────────────────────┘
```

Setelah foto:

```text
┌────────────────────────────┐
│                            │
│      PREVIEW NOTA          │
│                            │
└────────────────────────────┘

[Foto Ulang]    [Gunakan Foto]
```

---

# 27. Validasi

## Nominal

Tidak boleh:

```text
0
-50000
kosong
```

Harus:

```text
> 0
```

## Foto

Validasi:

```text
JPG
JPEG
PNG
WEBP
```

Ukuran maksimum upload sebelum compression misalnya:

```text
10 MB
```

Kemudian hasil compression disimpan dalam ukuran yang lebih kecil.

## Tanggal

Tidak boleh kosong.

## Kategori

Wajib untuk pengeluaran.

---

# 28. Error Handling

Jika koneksi internet bermasalah:

```text
Gagal menyimpan transaksi.

Periksa koneksi internet
dan coba lagi.
```

Jika upload nota gagal:

```text
Foto belum berhasil diupload.

Data transaksi belum disimpan.
```

Jangan sampai terjadi kondisi:

```text
Database berhasil
+
Foto gagal
=
Transaksi tanpa bukti
```

Untuk pemasukan/pengeluaran, sistem harus memastikan transaksi dan bukti berhasil diproses sesuai aturan sebelum transaksi dianggap selesai.

---

# 29. Optimasi Internet

Karena sistem kemungkinan digunakan melalui jaringan yang tidak selalu stabil, frontend harus:

- Compress foto sebelum upload
- Lazy load gambar
- Pagination transaksi
- Jangan mengambil seluruh transaksi sekaligus
- Gunakan query Supabase yang terfilter
- Preview foto sebelum upload
- Batasi ukuran file
- Loading state
- Retry upload

---

# 30. Performance

Target:

- Dashboard cepat dibuka
- Pagination minimal 10–25 transaksi per halaman
- Foto tidak dimuat sebelum diperlukan
- Chart hanya mengambil data periode yang diminta
- Query menggunakan index database

Index yang disarankan:

```text
transaction_date
type
category_id
created_by
created_at
```

---

# 31. Deployment

```text
Developer
   ↓
GitHub
   ↓
Vercel
   ↓
React Application
   ↓
Supabase
   ├── Auth
   ├── PostgreSQL
   └── Storage
```

Environment variable:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

**Jangan pernah memasukkan service role key Supabase ke frontend.**

---

# 32. Free Infrastructure

Target:

```text
React + Vite       → Gratis
Tailwind           → Gratis
Axios              → Gratis
Supabase           → Free tier
Vercel             → Free tier
GitHub             → Gratis
Recharts           → Gratis
Lucide             → Gratis
```

Biaya awal:

> **Rp0**

Dengan catatan penggunaan tetap berada dalam batas free tier masing-masing layanan.

---

# 33. MVP — Versi Pertama

Saya menyarankan jangan langsung membuat semua fitur.

### Phase 1 — Core

```text
☑ Login
☑ Role Admin/User
☑ Dashboard
☑ Pemasukan
☑ Pengeluaran
☑ Upload nota
☑ Kategori
☑ Hutang
☑ Edit transaksi
```

### Phase 2 — Management

```text
☑ User management
☑ Audit log
☑ Soft delete
☑ Filter
☑ Search
☑ Pagination
```

### Phase 3 — Reporting

```text
☑ Grafik
☑ Laporan pemasukan
☑ Laporan pengeluaran
☑ Laporan hutang
☑ Rekap saldo
☑ CSV
☑ Excel
☑ PDF
☑ Print
```

### Phase 4 — Hardening

```text
☑ RLS
☑ Storage policy
☑ Validation
☑ Error handling
☑ Performance optimization
☑ Mobile optimization
☑ Backup/export
```

---

# 34. Prioritas Fitur

| Prioritas | Fitur              |
| --------- | ------------------ |
| 🔴 P0     | Login              |
| 🔴 P0     | Role Admin/User    |
| 🔴 P0     | Pemasukan          |
| 🔴 P0     | Pengeluaran        |
| 🔴 P0     | Foto nota          |
| 🔴 P0     | Kategori           |
| 🔴 P0     | Dashboard          |
| 🔴 P0     | Database           |
| 🔴 P0     | RLS                |
| 🟠 P1     | Hutang             |
| 🟠 P1     | Edit transaksi     |
| 🟠 P1     | Search             |
| 🟠 P1     | Filter             |
| 🟠 P1     | User management    |
| 🟠 P1     | Audit log          |
| 🟡 P2     | Grafik             |
| 🟡 P2     | Excel              |
| 🟡 P2     | CSV                |
| 🟡 P2     | PDF                |
| 🟢 P3     | Advanced analytics |

---

# 35. Alur Pengeluaran

```text
User login
    ↓
Pengeluaran
    ↓
Tambah Pengeluaran
    ↓
Pilih kategori
    ↓
Masukkan nominal
    ↓
Masukkan keterangan
    ↓
📷 Foto nota
    ↓
Compress
    ↓
Upload Storage
    ↓
Validasi
    ↓
Simpan transaksi
    ↓
Audit Log
    ↓
Dashboard diperbarui
```

---

# 36. Alur Pemasukan

```text
User login
    ↓
Pemasukan
    ↓
Tambah pemasukan
    ↓
Tanggal
    ↓
Sumber
    ↓
Nominal
    ↓
Keterangan
    ↓
📷 Upload bukti
    ↓
Compress
    ↓
Storage
    ↓
Database
    ↓
Audit Log
```

---

# 37. Alur Hutang

```text
Tambah Hutang
      ↓
Nama pihak
      ↓
Nominal
      ↓
Tanggal
      ↓
Jatuh tempo
      ↓
Simpan
      ↓
BELUM LUNAS
      ↓
Pembayaran
      ↓
Hitung sisa
      ↓
Apakah sisa = 0?
   ┌──┴──┐
  Tidak  Ya
   ↓      ↓
Sebagian LUNAS
```

---

# 38. Prinsip Desain

UI harus:

- Sederhana
- Bersih
- Profesional
- Mobile-first
- Mudah digunakan orang yang tidak terlalu memahami teknologi
- Meminimalkan jumlah klik
- Nominal uang mudah dibaca
- Status transaksi mudah dibedakan
- Foto nota mudah dilihat

Tidak perlu terlalu banyak animasi.

Fokus utama:

> **Cepat mencatat → mudah mencari → mudah memeriksa → mudah membuat laporan.**

---

# 39. Definition of Done

Sistem dianggap siap untuk MVP apabila:

- [ ] Admin dapat login
- [ ] User dapat login
- [ ] Role berjalan
- [ ] Admin dapat membuat kategori
- [ ] User dapat mencatat pemasukan
- [ ] User dapat mencatat pengeluaran
- [ ] Bukti foto wajib
- [ ] Foto tersimpan di Supabase Storage
- [ ] Transaksi tersimpan di PostgreSQL
- [ ] Transaksi dapat diedit
- [ ] Hutang dapat dicatat
- [ ] Dashboard menampilkan saldo
- [ ] Dashboard menampilkan pemasukan
- [ ] Dashboard menampilkan pengeluaran
- [ ] RLS aktif
- [ ] Storage policy aktif
- [ ] Audit log berjalan
- [ ] Responsive di HP
- [ ] Responsive di desktop
- [ ] Berhasil deploy ke Vercel
- [ ] Tidak ada secret key Supabase yang bocor ke frontend

---

## Rekomendasi arsitektur final

```text
                 ┌─────────────────────┐
                 │       USER          │
                 │  HP / Laptop / PC   │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │       VERCEL        │
                 │ React + Vite        │
                 │ Tailwind            │
                 │ Axios               │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │      SUPABASE       │
                 │                     │
                 │  Auth               │
                 │  PostgreSQL         │
                 │  Storage            │
                 │  RLS                │
                 └──────┬───────┬──────┘
                        │       │
              ┌─────────┘       └─────────┐
              ▼                           ▼
       ┌──────────────┐            ┌──────────────┐
       │   DATABASE   │            │   STORAGE    │
       │              │            │              │
       │ Transaksi    │            │ Foto nota    │
       │ Kategori     │            │ Bukti        │
       │ Hutang       │            │              │
       │ Users        │            │              │
       │ Audit Log    │            │              │
       └──────────────┘            └──────────────┘
```

**Kesimpulan desain:** untuk kebutuhan **Laporan Keuangan 200 Tahun Panyeppen**, Supabase sangat cocok karena kita bisa menyatukan **Auth + PostgreSQL + Storage + RLS** tanpa harus membuat server backend terpisah. Arsitektur ini juga paling sederhana untuk menjaga target biaya awal **Rp0**, selama penggunaan tetap dalam batas free tier layanan.
