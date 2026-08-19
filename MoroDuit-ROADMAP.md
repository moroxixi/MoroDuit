# MoroDuit — Rencana Proyek & Task Roadmap

> Dokumen ini adalah hasil diskusi arsitektur awal proyek MoroDuit (toko sembako online).
> Simpan/upload ulang file ini di chat mana pun untuk melanjutkan proses penyusunan prompt freebuff,
> tanpa perlu mengulang diskusi dari nol.

---

## 1. Ringkasan Proyek

**MoroDuit** — sistem katalog + checklist belanja untuk toko sembako, dipakai oleh Rofi sendiri
(kadang di depan customer langsung). Terdiri dari 3 halaman + 1 backend:

1. **Input** — Rofi input/update produk (nama, harga normal, harga promo, catatan, status stok) → tersimpan ke Google Sheet.
2. **Keranjang-Duit** — halaman checklist: tampilkan katalog produk yang tersedia, Rofi centang produk + isi qty, lihat total, lalu checkout.
3. **Keranjang-Duit/Priview** — halaman nota: render nota lengkap (header toko, nomor nota, tanggal, list item), tombol print, dan saat print → riwayat transaksi tersimpan ke Sheet.
4. **Apps Script** — backend tunggal untuk baca/tulis Google Sheet ("Toko Sembako Online Moro Duit").

Hosting: **GitHub Pages** (publik). Akses halaman Input **tidak** diproteksi password (cukup URL tidak disebar).

---

## 2. Keputusan dari Diskusi (Q&A)

| Topik | Keputusan |
|---|---|
| Pengguna Keranjang-Duit | Rofi sendiri, dipakai di depan customer |
| Sifat data Input → Sheet | **Katalog**: update row kalau nama produk sama (bukan histori per submit) |
| Kolom status ada/tidak | Default "Ada", diubah manual oleh Rofi lewat form Input |
| Hosting | GitHub Pages (publik) |
| Proteksi halaman Input | Tidak perlu password, cukup URL tidak disebar |
| Alur print | Checkout → pindah ke halaman preview terpisah → tombol print di sana |
| Lokasi file preview | `Keranjang-Duit/Priview/index.html` (subfolder di dalam Keranjang-Duit) |
| Desain visual | **Aksesibel untuk lansia/ibu-ibu**: font besar, kontras tinggi, tombol besar — BUKAN gaya dashboard dark/kecil yang sudah ada |
| Qty per produk | Ada input qty di checklist, default 1 |
| Isi nota print | Lengkap: header nama toko, nomor nota, tanggal |
| Riwayat transaksi | **Disimpan**, di tab kedua pada Sheet yang sama (bukan Sheet terpisah) |

---

## 3. Struktur Folder (Final)

```
HomeLab/MoroDuit/
├── Input/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── Keranjang-Duit/
│   ├── index.html          ← halaman checklist
│   ├── style.css
│   ├── script.js
│   └── Priview/
│       ├── index.html      ← halaman nota + tombol print
│       ├── style.css
│       └── script.js
└── Apps-Script/
    └── code.gs.js
```

Catatan konvensi (WAJIB, lihat Bagian 8.2 project instructions): file Apps Script baru langsung pakai
ekstensi `.gs.js` dari awal supaya ke-scan graphify.

---

## 4. Struktur Data — Google Sheet "Toko Sembako Online Moro Duit"

### Tab 1 — `Katalog`
| Kolom | Keterangan |
|---|---|
| Timestamp | Waktu update terakhir |
| Produk | Nama produk (key untuk cek duplikat, match case-insensitive + trim) |
| Harga Normal | Angka |
| Harga Promo | Angka, boleh kosong |
| Status | `Ada` / `Tidak Ada` |
| Catatan | Teks bebas (mis. "promo s.d. 25 Agustus") |

### Tab 2 — `Riwayat` *(baru, sesuai keputusan simpan histori)*
| Kolom | Keterangan |
|---|---|
| No Nota | Format `MD-YYYYMMDD-XXX`, digenerate server-side (Apps Script) |
| Tanggal | Timestamp transaksi |
| Produk | Nama produk (satu baris per item) |
| Qty | Jumlah |
| Harga Satuan | Harga saat transaksi (normal atau promo, snapshot — bukan referensi live ke Katalog) |
| Subtotal | Qty × Harga Satuan |
| Total Nota | Total keseluruhan nota (diulang di tiap baris item milik nota yang sama) |

> **Kenapa satu baris per item (bukan satu baris per transaksi):** supaya nanti gampang direkap/difilter
> per produk (mis. "produk X paling laku") tanpa parsing string. No Nota jadi kunci untuk mengelompokkan
> baris-baris yang satu transaksi.

---

## 5. Alur Kerja Tiap Halaman

**Input** (`Input/`)
- Form: Nama Produk, Harga Normal, Harga Promo (opsional), Catatan, checkbox "Stok Habis?" (default tidak dicentang = status "Ada").
- Submit → POST ke Apps Script (`action: updateProduk`).
- Apps Script cek: nama produk sudah ada di tab Katalog (case-insensitive, trim)?
  - Ada → update row itu (semua kolom termasuk Timestamp).
  - Belum ada → append row baru.
- *(Saran peningkatan, bukan wajib di versi awal): tampilkan daftar produk existing di halaman Input yang bisa diklik untuk prefill form — supaya Rofi tidak perlu ketik ulang harga kalau cuma mau ubah status stok.)*

**Keranjang-Duit** (`Keranjang-Duit/index.html`)
- GET ke Apps Script (`action: getKatalog`) saat halaman dimuat.
- Filter otomatis: hanya tampilkan produk berstatus "Ada".
- Tiap produk: checkbox + input qty (default 1, aktif kalau dicentang) + harga (pakai harga promo kalau terisi, tampilkan catatan sebagai info kecil).
- Total dihitung live dari item yang dicentang × qty.
- Tombol **Checkout** → kumpulkan item terpilih (nama, qty, harga satuan, subtotal) + total → simpan ke `sessionStorage` → redirect ke `Priview/index.html`.

**Priview** (`Keranjang-Duit/Priview/index.html`)
- Baca data keranjang dari `sessionStorage`.
- Render nota: header "Toko Sembako Online Moro Duit", nomor nota (tampil "DRAFT" dulu sebelum print), tanggal, list item (nama, qty, harga satuan, subtotal), total.
- Tombol **Print**:
  1. POST ke Apps Script (`action: simpanRiwayat`) dengan item + total → Apps Script generate No Nota asli & append ke tab Riwayat → return No Nota.
  2. Update tampilan nota dengan No Nota asli.
  3. Trigger `window.print()` (dengan CSS `@media print` supaya tombol UI tersembunyi saat print).
- Tombol **Batal/Kembali** → kembali ke Keranjang-Duit **tanpa** menyimpan apa pun ke Riwayat.
- *(Keputusan desain: riwayat baru tersimpan saat tombol Print diklik, bukan otomatis saat halaman preview dimuat — supaya kalau customer batal, tidak ada sampah data di Riwayat. Koreksi kalau maunya beda.)*

---

## 6. Apps Script Endpoints (`code.gs.js`)

| Endpoint | Fungsi |
|---|---|
| `doGet` action `getKatalog` | Return produk dengan status "Ada" (filter server-side) |
| `doPost` action `updateProduk` | Update/insert row di tab Katalog |
| `doPost` action `simpanRiwayat` | Generate No Nota, append item-item ke tab Riwayat, return No Nota + tanggal |

**Rekomendasi (opsional, silakan diputuskan):** karena Apps Script Web App URL akan terlihat di JS
sisi client (halaman publik di GitHub Pages), pertimbangkan token sederhana di body request
(pola sama seperti Wonton `doGet()` token-protected) supaya endpoint tidak bisa dipanggil sembarangan
dari luar halaman. Ini bukan proteksi login untuk Rofi (yang sudah diputuskan tidak perlu), tapi proteksi
endpoint dari spam/bot.

---

## 7. Hal yang Perlu Dikonfirmasi/Dikoreksi Sebelum Prompt Disusun

- [x] Setuju dengan keputusan "riwayat tersimpan saat klik Print" (bukan saat halaman preview dimuat)?
- [x] Perlu token proteksi endpoint Apps Script (lihat Bagian 6) atau tidak perlu sama sekali?
- [x] Format No Nota `MD-YYYYMMDD-XXX` sudah oke, atau ada preferensi lain?
- [x] Interaksi qty di checklist: qty aktif hanya kalau checkbox dicentang 
- [lihat jawabanku] Harga promo ditampilkan apa adanya (tanpa cek expiry otomatis dari catatan, karena catatan cuma teks bebas) — oke untuk versi awal? Jawabanku adalah harga promo seharusnya hanya jadi database untukku jadi customer tidak tahu menahu. Berarti kita tambahkan satu kolom lagi di bagian input itu harga jual, defaultnya sama dengan harga normal. dan Keranjang duit menampilkan harga jual saja

---

## 8. Task Breakdown untuk Freebuff (Dipecah Bertahap)

Karena ini proyek baru dengan banyak bagian saling terkait, akan dipecah jadi beberapa task freebuff
terpisah (bukan satu prompt raksasa), sesuai prinsip task sequencing:

1. **Task 1 — Backend Apps Script**: bikin `code.gs.js` dengan 3 endpoint di atas + logic update-katalog
   dan generate-nomor-nota. Termasuk setup header tab Katalog & Riwayat kalau belum ada.
2. **Task 2 — Halaman Input**: form + koneksi ke `updateProduk`.
3. **Task 3 — Halaman Keranjang-Duit**: fetch katalog, checklist+qty, kalkulasi total, checkout → sessionStorage.
4. **Task 4 — Halaman Priview**: render nota dari sessionStorage, tombol print + simpan riwayat, tombol batal.
5. **Task 5 — Penutup & pendaftaran proyek**: karena `MoroDuit/` adalah folder baru di level root HomeLab
   (setara `Work/`), jalankan `graphify update` di scope **HomeLab** (bukan scope MoroDuit saja) supaya
   proyek baru terdaftar di peta (sesuai Bagian 9.2 project instructions), lalu `gen-folder-tree.py`.

Setiap task akan disusun sebagai prompt freebuff terpisah (struktur KONTEKS/TUGAS/BATASAN/VERIFIKASI/OUTPUT/PENUTUP)
setelah poin di Bagian 7 dikonfirmasi.

---

## 9. Catatan untuk Sesi Lanjutan

- Belum ada `GRAPH_REPORT.md`/`manifest.json`/`FOLDER_TREE.md` untuk MoroDuit karena proyek belum dibuat.
  Task 1 akan jadi baseline pertama.
- Desain visual: font besar, kontras tinggi, tombol besar (target pembaca: ibu-ibu/nenek-nenek) — akan
  dijabarkan lebih detail saat menyusun prompt Task 2–4, bukan gaya dashboard dark yang sudah ada.
- Deploy Apps Script ke editor tetap manual oleh Rofi (copy-paste + redeploy), tidak pernah oleh freebuff.
