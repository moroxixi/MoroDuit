# DISCOVERY: Tagline & Header Konsistensi — MoroDuit

> **Tanggal:** 28 Agustus 2026
> **Scope:** 12 file `index.html` di Admin/ dan Customer/
> **Tipe:** READ-ONLY — tidak ada file kode yang diubah

---

## 1. Admin/Database-Surya/index.html

- **Path:** `Admin/Database-Surya/index.html`
- **`<title>`:** `Database Surya — Katalog Harga Referensi`
- **Header/brand:**
  - **h1** (baris 189): `🏪 Database Surya — Katalog Harga Referensi`
  - **subtitle** (baris 190): `Foto nota Surya Toserba → scan otomatis → review → simpan ke Katalog-Surya`
  - **footer** (baris 230): `MoroDuit &mdash; Database Harga Referensi Surya Toserba`
- **Meta description / og:title / og:description:** TIDAK ADA
- **Sumber:** Hardcoded di index.html
- **⚠️ Catatan:** Tidak ada kata "MoroDuit" di `<title>` maupun `<h1>` — hanya di footer. Brand di header pakai "Database Surya" bukan "MoroDuit".

---

## 2. Admin/Input/index.html

- **Path:** `Admin/Input/index.html`
- **`<title>`:** `MoroDuit — Input Produk`
- **Header/brand:**
  - **h1** (baris 11): `🛒 Input Produk MoroDuit`
  - **subtitle** (baris 12): `Tambah atau ubah data produk sembako`
  - **footer** (baris 113): `MoroDuit &mdash; Toserba Online`
- **Meta description / og:title / og:description:** TIDAK ADA
- **Sumber:** Hardcoded di index.html

---

## 3. Admin/Input-Sheet-From-Nota/index.html

- **Path:** `Admin/Input-Sheet-From-Nota/index.html`
- **`<title>`:** `MoroDuit — Input dari Nota Foto`
- **Header/brand:**
  - **h1** (baris 282): `📷 Input dari Nota Foto`
  - **subtitle** (baris 283): `Foto nota belanja → scan otomatis → review → simpan ke Riwayat`
  - **footer** (baris 330): `MoroDuit &mdash; Toserba Online`
- **Meta description / og:title / og:description:** TIDAK ADA
- **Sumber:** Hardcoded di index.html
- **⚠️ Catatan:** Tidak ada kata "MoroDuit" di `<h1>` — hanya di `<title>` dan footer.

---

## 4. Admin/Rekap-Belanja/index.html

- **Path:** `Admin/Rekap-Belanja/index.html`
- **`<title>`:** `MoroDuit — Rekap Belanja`
- **Header/brand:**
  - **h1** (baris 11): `📊 Rekap Belanja`
  - **subtitle** (baris 12): `Pilih nota untuk melihat rekap belanja`
  - **footer** (baris 33): `MoroDuit &mdash; Toserba Online`
- **Meta description / og:title / og:description:** TIDAK ADA
- **Sumber:** Hardcoded di index.html
- **⚠️ Catatan:** Tidak ada kata "MoroDuit" di `<h1>` — hanya di `<title>` dan footer.

---

## 5. Admin/Rekap-Belanja/Priview/index.html

- **Path:** `Admin/Rekap-Belanja/Priview/index.html`
- **`<title>`:** `MoroDuit — Rekap Belanja`
- **Header/brand:**
  - **nota-toko h1** (baris 224): `Toserba Online Moro Duit <span class="rekap-badge">REKAP</span>`
  - **rekap-footer** (baris 268): `Harga normal terkini dari katalog • Estimasi belanja pribadi`
- **Meta description / og:title / og:description:** TIDAK ADA
- **Sumber:** Hardcoded di index.html
- **⚠️ Catatan:** Brand di `<h1>` pakai "Moro Duit" (ada spasi), bukan "MoroDuit" (tanpa spasi).

---

## 6. Admin/Riwayat/index.html

- **Path:** `Admin/Riwayat/index.html`
- **`<title>`:** `MoroDuit — Riwayat Transaksi`
- **Header/brand:**
  - **h1** (baris 11): `📋 Riwayat Transaksi`
  - **subtitle** (baris 12): `Daftar semua nota belanja`
  - **footer** (baris 42): `MoroDuit &mdash; Toserba Online`
- **Meta description / og:title / og:description:** TIDAK ADA
- **Sumber:** Hardcoded di index.html
- **⚠️ Catatan:** Tidak ada kata "MoroDuit" di `<h1>` — hanya di `<title>` dan footer.

---

## 7. Admin/Riwayat/Mode-Edit/index.html

- **Path:** `Admin/Riwayat/Mode-Edit/index.html`
- **`<title>`:** `MoroDuit — Edit Transaksi`
- **Header/brand:**
  - **h1** (baris 409): `✏️ Edit Transaksi`
  - **subtitle** (baris 410, `id="headerSubtitle"`): `Memuat data...` → **dynamic** berubah jadi `"Nota " + noNota`
- **Meta description / og:title / og:description:** TIDAK ADA
- **Sumber:** Hardcoded di index.html; subtitle **dynamic** — sumber: `headerSubtitle.textContent = "Nota " + noNota` di `script.js` baris 383 dan 445
- **⚠️ Catatan:** Tidak ada kata "MoroDuit" di `<h1>` maupun subtitle — hanya di `<title>`.

---

## 8. Admin/Riwayat/Mode-Edit/Priview/index.html

- **Path:** `Admin/Riwayat/Mode-Edit/Priview/index.html`
- **`<title>`:** `MoroDuit — Nota Edit`
- **Header/brand:**
  - **nota-toko h1** (baris 197): `Toserba Online Moro Duit <span class="nota-edit-badge">EDIT</span>`
  - **nota-footer** (baris 236): `Terima kasih sudah belanja di Moro Duit! 🙏`
- **Meta description / og:title / og:description:** TIDAK ADA
- **Sumber:** Hardcoded di index.html
- **⚠️ Catatan:** Brand di `<h1>` dan footer pakai "Moro Duit" (ada spasi), bukan "MoroDuit".

---

## 9. Customer/Katalog/index.html

- **Path:** `Customer/Katalog/index.html`
- **`<title>`:** `MoroDuit — Katalog Produk`
- **Header/brand:**
  - **h1** (baris 218): `📦 Katalog Produk`
  - **subtitle** (baris 219): `Lihat daftar produk yang tersedia`
  - **footer** (baris 243): `MoroDuit &mdash; Toserba Online`
- **Meta description / og:title / og:description:** TIDAK ADA
- **Sumber:** Hardcoded di index.html
- **⚠️ Catatan:** Tidak ada kata "MoroDuit" di `<h1>` — hanya di `<title>` dan footer.

---

## 10. Customer/Keranjang-Duit/index.html

- **Path:** `Customer/Keranjang-Duit/index.html`
- **`<title>`:** `MoroDuit — Keranjang Duit`
- **Header/brand:**
  - **h1** (baris 11): `🛒 Keranjang Duit`
  - **subtitle** (baris 12): `Pilih produk yang mau dibeli`
  - **footer** (baris 60): `MoroDuit &mdash; Toserba Online`
- **Meta description / og:title / og:description:** TIDAK ADA
- **Sumber:** Hardcoded di index.html

---

## 11. Customer/Keranjang-Duit/Priview/index.html

- **Path:** `Customer/Keranjang-Duit/Priview/index.html`
- **`<title>`:** `MoroDuit — Nota Belanja`
- **Header/brand:**
  - **nota-toko h1** (baris 23): `Toserba Online Moro Duit`
  - **nota-footer** (baris 58): `Terima kasih sudah belanja di Moro Duit! 🙏`
- **Meta description / og:title / og:description:** TIDAK ADA
- **Sumber:** Hardcoded di index.html
- **⚠️ Catatan:** Brand di `<h1>` dan footer pakai "Moro Duit" (ada spasi), bukan "MoroDuit".

---

## 12. Customer/Perkenalan/index.html

- **Path:** `Customer/Perkenalan/index.html`
- **`<title>`:** `MoroDuit — Belanja Sembako dari Tetangga`
- **Header/brand:**
  - **h1** (baris 14): `Halo, Selamat Datang!`
  - **hero-sub** (baris 15-18): `Belanja kebutuhan sehari-hari jadi lebih gampang. Ini layanan belanja sembako online, siap bantu belanjain apa yang kamu butuhkan.`
  - **hero-owner** (baris 19-21): `Dikelola oleh Rofi`
  - **footer** (baris 99): `MoroDuit &mdash; Toserba Online.`
- **Meta description / og:title / og:description:** TIDAK ADA
- **Sumber:** Hardcoded di index.html
- **⚠️ Catatan:**
  - Tidak ada kata "MoroDuit" di `<h1>` atau hero-sub — hanya di `<title>` dan footer.
  - Footer punya titik di akhir (`"MoroDuit — Toserba Online."`) — beda dari halaman lain yang tanpa titik.
  - `script.js` baris 13 punya string hardcoded: `"Halo Rofi, saya ingin bertanya tentang Belanja Online MoroDuit. "` — ini template WhatsApp, bukan tagline yang tampil di halaman.

---

## RINGKASAN VARIASI

### Variasi Penulisan Nama Brand

| No | Variasi | Lokasi |
|----|---------|--------|
| 1 | `MoroDuit` | `<title>` (11 dari 12 halaman), footer (semua kecuali Database-Surya), script.js comments, h1 di Input (baris 11) |
| 2 | `Moro Duit` (ada spasi) | `<h1 class="nota-toko">` dan nota-footer di: Keranjang-Duit/Priview (baris 23, 58), Riwayat/Mode-Edit/Priview (baris 197, 236), Rekap-Belanja/Priview (baris 224) |
| 3 | `moroduit` (huruf kecil) | Tidak ditemukan di halaman — hanya muncul di sessionStorage key (`moroduit_riwayat_edit`) |
| 4 | `Database Surya` | `<title>` dan h1 di Database-Surya (baris 6, 189) — brand tanpa "MoroDuit" |

### Variasi Tagline / Subtitle / Footer

| No | Teks | Lokasi | Tipe |
|----|------|--------|------|
| 1 | `Toserba Online` | Footer di 10 halaman (Input, Input-Sheet-From-Nota, Rekap-Belanja, Riwayat, Katalog, Keranjang-Duit) + Perkenalan (dengan titik) | Footer |
| 2 | `Database Harga Referensi Surya Toserba` | Footer di Database-Surya | Footer |
| 3 | `Tambah atau ubah data produk sembako` | subtitle di Input (baris 12) | Subtitle |
| 4 | `Foto nota belanja → scan otomatis → review → simpan ke Riwayat` | subtitle di Input-Sheet-From-Nota (baris 283) | Subtitle |
| 5 | `Foto nota Surya Toserba → scan otomatis → review → simpan ke Katalog-Surya` | subtitle di Database-Surya (baris 190) | Subtitle |
| 6 | `Pilih nota untuk melihat rekap belanja` | subtitle di Rekap-Belanja (baris 12) | Subtitle |
| 7 | `Daftar semua nota belanja` | subtitle di Riwayat (baris 12) | Subtitle |
| 8 | `Memuat data...` → dynamic `"Nota " + noNota` | subtitle di Riwayat/Mode-Edit (baris 410, dynamic dari script.js) | Dynamic subtitle |
| 9 | `Lihat daftar produk yang tersedia` | subtitle di Katalog (baris 219) | Subtitle |
| 10 | `Pilih produk yang mau dibeli` | subtitle di Keranjang-Duit (baris 12) | Subtitle |
| 11 | `Halo, Selamat Datang!` | h1 di Perkenalan (baris 14) | Hero h1 |
| 12 | `Belanja kebutuhan sehari-hari jadi lebih gampang...` | hero-sub di Perkenalan (baris 15-18) | Tagline utama |
| 13 | `Dikelola oleh Rofi` | hero-owner di Perkenalan (baris 19-21) | Subtitle |
| 14 | `Terima kasih sudah belanja di Moro Duit! 🙏` | nota-footer di Keranjang-Duit/Priview (baris 58) dan Riwayat/Mode-Edit/Priview (baris 236) | Nota footer |
| 15 | `Harga normal terkini dari katalog • Estimasi belanja pribadi` | rekap-footer di Rekap-Belanja/Priview (baris 268) | Rekap footer |

### Inconsistensi Utama yang Perlu Diperhatikan

1. **Brand "MoroDuit" vs "Moro Duit"** — 3 halaman Priview pakai "Moro Duit" (ada spasi), sementara 9 halaman lain pakai "MoroDuit" (tanpa spasi).
2. **Database-Surya tidak punya "MoroDuit" di `<title>` maupun `<h1>`** — hanya di footer.
3. **8 dari 12 halaman tidak menampilkan "MoroDuit" di `<h1>`** — brand hanya muncul di `<title>` browser tab dan footer.
4. **Footer Perkenalan ada titik di akhir** (`"MoroDuit — Toserba Online."`) — beda dari 10 halaman lain yang tanpa titik.
5. **Tidak ada `<meta name="description">` atau `og:title`/`og:description` di semua 12 halaman.**
6. **Dynamic subtitle** hanya ada di 1 halaman: `Admin/Riwayat/Mode-Edit/index.html` (`headerSubtitle` diisi dari `script.js` baris 383/445).

---

## STATUS FILE

- ✅ Semua 12 file `index.html` dari daftar ditemukan dan diperiksa — tidak ada yang TIDAK DITEMUKAN.
- ✅ Tidak ada `ask_user` yang terpanggil selama proses discovery.
