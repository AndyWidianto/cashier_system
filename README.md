# 🚀 Modern POS (Point of Sale) System

Sistem Kasir / Point of Sale (POS) modern, cepat, dan real-time yang dibangun menggunakan teknologi web stack terkini. Dirancang untuk memudahkan manajemen transaksi toko, inventaris produk, serta laporan penjualan harian.

---

## 🛠️ Tech Stack

Aplikasi ini dibangun menggunakan arsitektur modern demi performa dan *type-safety* yang maksimal:

* **Framework:** [Next.js](https://nextjs.org/) (App Router / React)
* **Language:** [TypeScript](https://www.typescriptlang.org/)
* **Database & ORM:** [PostgreSQL](https://www.postgresql.org/) & [Prisma ORM](https://www.prisma.io/)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Icons:** [Lucide React](https://lucide.dev/)
* **State Management / Forms:** React Hooks & Zod (untuk validasi data)

---

## ✨ Fitur Utama

* **Point of Sale (POS) Interface:** Antarmuka kasir cepat berbasis web, mendukung *barcode scanning* dan navigasi yang intuitif.
* **Manajemen Produk & Kategori:** Pengaturan produk, harga, dan ketersediaan stok secara *real-time*.
* **Manajemen Inventaris:** Otomatis mengurangi stok gudang setiap kali transaksi berhasil diproses.
* **Manajemen Transaksi & Riwayat:** Pencatatan struk, metode pembayaran, dan riwayat pesanan.
* **Responsive Design:** Dapat diakses dengan mulus melalui komputer kasir (desktop) maupun perangkat tablet/mobile.

---

## 📂 Struktur Proyek

```text
├── prisma/               # Skema database & migrasi Prisma
├── public/               # Aset statis (gambar, ikon, dll)
├── src/
│   ├── app/              # Halaman & API Routes (Next.js App Router)
│   ├── components/       # Komponen UI reusable (Modals, Buttons, dll)
│   ├── lib/              # Konfigurasi instance Prisma & utility helpers
│   └── types/            # Definisi tipe data TypeScript
├── .env                  # Konfigurasi Environment Variables
├── package.json          # Daftardependencies proyek
└── tsconfig.json         # Konfigurasi TypeScript
```

## ⚙️ Cara Memulai (Installation & Setup)

Ikuti langkah-langkah di bawah ini untuk menjalankan proyek secara lokal di komputer Anda:

#### 1. Clone Repositori
```bash
git clone https://github.com/AndyWidianto/cashier_system.git
cd nama-repo-anda
```

### 2. Install Dependencies

Pastikan Anda sudah menginstal Node.js di komputer Anda.
```bash
npm install
# atau
yarn install
# atau
pnpm install
```

### 3. Konfigurasi Environment Variables
Buat file .env di root direktori proyek Anda, lalu sesuaikan dengan konfigurasi database PostgreSQL Anda:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/nama_database?schema=public"
```

### 4. Jalankan Migrasi Database (Prisma)

Sinkronkan skema database dengan Prisma:
```bash
npx prisma migrate dev --name init
```

(Opsional) Jika ingin mengisi data awal (seed), jalankan:
```bash
npm run seed
```

### 5. Jalankan Development Server
```bash
npm run dev
# atau
yarn dev
# atau
pnpm dev
```

Buka http://localhost:3000 melalui browser kesayangan Anda untuk melihat aplikasinya.


## 📝 Lisensi

Proyek ini bersifat open-source dan didistribusikan di bawah lisensi MIT. Silakan gunakan dan kembangkan sesuai kebutuhan Anda!