# DISCOVERY: Katalog Surya View Page — Investigasi Kontradiksi Header Sheet

**Tanggal:** 2026-09-05
**Scope:** Repo `~/HomeLab/MoroDuit` (git terpisah dari HomeLab root)
**Tipe:** READ-ONLY — tidak ada file kode yang diubah; hanya file discovery ini yang dibuat
**Status:** Investigasi selesai, belum ada implementasi halaman view (sesuai rencana besar yang belum dieksekusi)

---

## TL;DR

1. `ensureKatalogSuryaHeaders_()` **DITEMUKAN** di `Apps-Script/code.gs.js` baris 77 — cocok dengan GRAPH_REPORT. Bukan salah baca.
2. Fungsi itu **terpanggil dari 2 tempat**: `doGet()` action `getKatalogSurya` (baris 504) dan `doPost()` action `simpanKatalogSurya` (baris 1079).
3. **Action GET untuk baca sheet "Katalog-Surya" SUDAH ADA** di `doGet()`: `action === "getKatalogSurya"` (baris 503) — mengembalikan seluruh isi tab sebagai JSON array. View page baru tinggal memakai endpoint ini; **tidak perlu action baru**.
4. Penjelasan paling masuk akal untuk kontradiksi (header belum ada padahal fungsi ensure ada): `ensureKatalogSuryaHeaders_()` **hanya menulis header kalau `sheet.getLastRow() === 0`** (baris 83). Kalau tab sudah berisi data tanpa header di baris 1 (mis. diisi manual / oleh alur di luar action ini), fungsi tidak akan pernah menambahkan header — tab tidak kosong, jadi guard-nya tidak terpenuhi.
5. **Risiko penting untuk view page nanti:** `getKatalogSurya` meng-loop dari `i = 1` (baris 510) — mengasumsikan baris 1 = header. Kalau sheet ternyata tidak punya header (data mulai baris 1), **baris data pertama akan ter-skip / dianggap header** oleh action yang sudah ada.

---

## 1. Apps-Script/code.gs.js (1127 baris, HEAD)

### 1a. `ensureKatalogSuryaHeaders_()` — isi lengkap & call site

**Definisi — baris 75–86:**

```javascript
// baris 75: // ── Helper: Pastikan tab "Katalog-Surya" & header ada ────────────────
// baris 76: // Tab baru untuk Database Surya (harga referensi pasar dari nota Surya Toserba).
// baris 77: function ensureKatalogSuryaHeaders_() {
// baris 78:   var ss = SpreadsheetApp.getActiveSpreadsheet();
// baris 79:   var sheet = ss.getSheetByName("Katalog-Surya");
// baris 80:   if (!sheet) {
// baris 81:     sheet = ss.insertSheet("Katalog-Surya");
// baris 82:   }
// baris 83:   if (sheet.getLastRow() === 0) {
// baris 84:     sheet.getRange(1, 1, 1, 4).setValues([["Tanggal Scan", "Nama Produk", "Harga Satuan", "Status"]]);
// baris 85:   }
// baris 86: }
```

- **Array header yang didefinisikan:** `["Tanggal Scan", "Nama Produk", "Harga Satuan", "Status"]` — 4 kolom (A–D), ditulis ke range `(1, 1, 1, 4)` baris 1.
- **Guard:** header hanya ditulis bila `sheet.getLastRow() === 0` (tab belum ada → dibuat dulu, atau tab ada tapi benar-benar kosong). Bila tab sudah berisi ≥1 baris data, header **tidak** ditambahkan.

**Call site (2x):**

| Call site | Lokasi | Konteks |
|---|---|---|
| 1 | Baris 504 | `doGet()` → `if (action === "getKatalogSurya")` |
| 2 | Baris 1079 | `doPost()` → `if (action === "simpanKatalogSurya")` |

- Baris 504 (di dalam `getKatalogSurya`, sebelum baca sheet).
- Baris 1079 (di dalam `simpanKatalogSurya`, sebelum baca/append).
- Catatan: baris 735 hanya **komentar** `// (pola sama dengan ensureKatalogSuryaHeaders_)` pada action `addKategori` (sheet Margin) — bukan call site; `addKategori` meniru polanya inline (insertSheet + tulis header 2 kolom) tanpa memanggil fungsi ini.

**Kesimpulan 1a:** fungsi ADA dan terpanggil dari 2 jalur (GET populate + POST simpan). Fungsi ini bukan "dead code". Namun karena guard `getLastRow() === 0`, fungsi tidak menjamin header ada kalau sheet sudah terlanjur berisi data.

### 1b. Struktur `doGet()` saat ini & pola dispatch

**Signature & prolog — baris 320–329:**
```javascript
// baris 320: function doGet(e) {
// baris 321:   ensureHeaders_();                     // ensure tab Katalog & Riwayat (bukan Katalog-Surya)
// baris 323:   var action = e && e.parameter ? e.parameter.action : "";
// baris 324:   var token  = e && e.parameter ? e.parameter.token : "";
// baris 326-329: if (!validateToken_(token)) return jsonResponse_({success:false, error:"unauthorized"});
```

**Pola dispatch:** rantai `if (action === "...") { ... return jsonResponse_(...); }` — satu aksi per blok, tanpa `switch`, setiap blok langsung `return`. Fallback di baris 541: `return jsonResponse_({success: false, error: "unknown action"});` — aksi baru tinggal menambah blok `if` baru sebelum fallback ini, konsisten dengan pola existing.

**Daftar lengkap action di `doGet()` (8 aksi):**

| # | Action | Baris | Sumber data |
|---|---|---|---|
| 1 | `getKatalog` | 331 | Sheet "Katalog" (filter status "Ada") |
| 2 | `getKatalogFull` | 352 | Sheet "Katalog" (semua kolom) |
| 3 | `getKatalogPerkenalan` | 389 | Sheet "Katalog" (tag b2c) |
| 4 | `getKatalogOpening` | 429 | Sheet "Katalog" (tag b2b) |
| 5 | `getRiwayat` | 472 | Sheet "Riwayat" |
| 6 | **`getKatalogSurya`** | **503** | **Sheet "Katalog-Surya" — SUDAH ADA** |
| 7 | `getKategoriList` | 527 | Sheet "Margin" (kolom A) |
| 8 | `getMarginList` | 537 | Sheet "Margin" (kolom A+B) |

**➡️ Jawaban poin 1b:** action baca sheet "Katalog-Surya" **SUDAH ADA** (`getKatalogSurya`, baris 503). Isi lengkap blok tersebut (baris 503–525):

```javascript
// baris 503:   if (action === "getKatalogSurya") {
// baris 504:     ensureKatalogSuryaHeaders_();
// baris 505:     var ss = SpreadsheetApp.getActiveSpreadsheet();
// baris 506:     var sheet = ss.getSheetByName("Katalog-Surya");
// baris 507:     var data = sheet.getDataRange().getValues();
// baris 508:     var result = [];
// baris 510:     for (var i = 1; i < data.length; i++) {   // <-- asumsi baris 1 = header
// baris 511:       // Skip baris kosong (semua cell kosong)
// baris 512:       if (!data[i][0] && !data[i][1]) continue;
// baris 513:       result.push({
// baris 514:         tanggalScan: String(data[i][0] || ""),
// baris 515:         namaProduk:  String(data[i][1] || ""),
// baris 516:         hargaSatuan: data[i][2],
// baris 517:         status:      String(data[i][3] || "")
// baris 518:       });
// baris 519:     }
// baris 521:     return jsonResponse_(result);   // <-- return ARRAY polos, bukan {success:...}
// baris 522:   }
```

Catatan shape response: `getKatalogSurya` mengembalikan **array polos** (`result`), bukan objek `{success: true, data: [...]}` — berbeda dari `scanNotaSurya`/`simpanKatalogSurya` yang mengembalikan `{success:..., ...}`. Frontend `loadKatalogSurya()` di script.js mengecek `Array.isArray(data)` (baris 121).

**`doPost()` (untuk konteks, bukan target edit):** baris 636, prolog beda — `JSON.parse(e.postData.contents)`, token & action diambil dari body JSON, lalu rantai `if` serupa. Aksi POST: `updateProduk` (654), `addKategori` (723), `updateKategori` (753), `deleteKategori` (795), `simpanRiwayat` (822), `repushRiwayat` (912), `scanNota` (1024), `scanNotaSurya` (1052), `simpanKatalogSurya` (1078). Fallback "unknown action" di baris 1126.

### 1c. Nama sheet persis yang dipakai kode

Literal string **`"Katalog-Surya"`** — konsisten di semua pemakaian `getSheetByName(...)`:

| Baris | Konteks |
|---|---|
| 79 | `ensureKatalogSuryaHeaders_()` — baca tab |
| 81 | `ensureKatalogSuryaHeaders_()` — insert tab kalau belum ada |
| 506 | `doGet` → `getKatalogSurya` — baca tab |
| 1081 | `doPost` → `simpanKatalogSurya` — baca tab |

- Tidak ada nama lain / alias / variasi (mis. "Katalog Surya" dengan spasi, atau "KatalogSurya") di kode backend. Frontend juga konsisten pakai istilah "Katalog-Surya" (label tombol & komentar).
- ➡️ Cocok dengan tab "Katalog-Surya" yang terlihat di screenshot. Tidak ada ambiguitas → `ask_user` tidak diperlukan untuk poin ini.

### 1d. Urutan kolom yang dibaca/ditulis untuk sheet ini

| Kolom | Header (ditulis `ensureKatalogSuryaHeaders_`, baris 84) | Dibaca `getKatalogSurya` (index array) | Ditulis `simpanKatalogSurya` (appendRow) | Deskripsi di screenshot user |
|---|---|---|---|---|
| A | "Tanggal Scan" | `data[i][0]` → `tanggalScan` | `tanggal` (format `yyyy-MM-dd HH:mm:ss` WIB, `formatDate` baris 1086) | Timestamp |
| B | "Nama Produk" | `data[i][1]` → `namaProduk` | `namaProduk` | Nama Barang |
| C | "Harga Satuan" | `data[i][2]` → `hargaSatuan` | `hargaSatuan` | Harga |
| D | "Status" | `data[i][3]` → `status` | `status` (default "Normal") | Status Promo/Normal |

- **Urutan A–D konsisten** antara header yang ditulis, posisi baca `getKatalogSurya`, dan posisi tulis `simpanKatalogSurya` (`sheet.appendRow([tanggal, namaProduk, hargaSatuan, status])`, baris 1111 & 1119).
- **Catatan label:** label header persis di kode adalah `Tanggal Scan / Nama Produk / Harga Satuan / Status`, sedangkan deskripsi screenshot di konteks pakai kata `Timestamp / Nama Barang / Harga / Status Promo/Normal`. Urutan & maknanya sama, tapi teks label berbeda — kalau halaman view nanti mau menampilkan header dari baris 1 sheet, teks yang tampil akan mengikuti isi sheet (bukan label kode). Ini bukan inkonsistensi kode, tapi perlu dicatat.
- Model data append-only/history log: `simpanKatalogSurya` skip kalau harga & status SAMA dengan entri terakhir produk itu; append kalau beda. Jadi satu produk bisa punya banyak baris riwayat (bukan 1 baris per produk) — relevan untuk desain tampilan view (apakah mau tampil semua baris atau dedup per produk seperti `loadKatalogSurya` yang dedup by nama di dropdown, script.js baris 129–138).

---

## 2. Admin/Database-Surya/index.html & script.js — pola untuk view page baru

### Struktur HTML (index.html, 236 baris)

- `<link rel="stylesheet" href="../Input/style.css">` (baris 8) — **memakai stylesheet bersama dari folder Admin/Input**, bukan style.css sendiri di folder Database-Surya.
- CSS tambahan scoped di `<style>` dalam `<head>` (baris 9–154) untuk komponen spesifik halaman ini: `.photo-zone`, `.item-row`, `.badge`/`.badge-ok`/`.badge-warn`, `.item-row-fields .f`, `.btn-hapus-baris`, `.summary-bar`, `.success-card`, media query `@media (max-width: 520px)`.
- Kerangka halaman (pola sama di semua halaman Admin):
  - `<header>` → `<h1>🏪 Database Surya — Katalog Harga Referensi Moro Duit.</h1>` + `<p class="subtitle">…</p>` (baris 189–191)
  - `<main>` → `<div id="statusMessage" class="status-message hidden" role="alert" aria-live="polite">` (baris 196) → section konten
  - `<footer><p>Moro Duit. &mdash; Toserba Online.</p></footer>` (baris 229–231)
  - Skrip di akhir body: `<script src="../../config.js"></script>` (baris 233) lalu `<script src="script.js"></script>` (baris 234).
- **Catatan path config utk halaman view baru:** kalau halaman baru diletakkan di subfolder `Admin/Database-Surya/Katalog/`, kedalaman folder bertambah 1 → config.js perlu `../../../config.js` (pola sama dgn halaman nested lain, mis. `Admin/Rekap-Belanja/Priview/index.html` yang pakai `../../../config.js`).

### Endpoint config.js yang dipanggil (script.js)

Semua via global `MORODUIT_CONFIG` dari `config.js` root (didefinisikan: `APPS_SCRIPT_URL`, `TOKEN`, `NOMOR_WA_TOKO`).

| Arah | Baris | Bentuk |
|---|---|---|
| GET `getKatalogSurya` | 113–116 | `MORODUIT_CONFIG.APPS_SCRIPT_URL + "?action=getKatalogSurya" + "&token=" + encodeURIComponent(MORODUIT_CONFIG.TOKEN)` — via `fetch` → `res.json()` |
| POST `scanNotaSurya` | 401–410 | body JSON `{action, token, imageBase64, mimeType}` |
| POST `simpanKatalogSurya` | 498–506 | body JSON `{action, token, items:[{namaProduk, hargaSatuan, status, tanggalScan}]}` |

- Pola fetch POST: `headers: { "Content-Type": "text/plain;charset=utf-8" }` (baris 402–403) — ala Apps Script (hindari preflight CORS).
- View page read-only cukup meniru pola GET `loadKatalogSurya()` (baris 113) — fetch GET ke `getKatalogSurya` sudah mengembalikan data yang sama yang mau ditampilkan.

### Helper yang dipakai (script.js, semuanya di dalam IIFE)

| Helper | Baris | Fungsi |
|---|---|---|
| `showStatus(message, type)` | 32 | Tampilkan pesan `.status-message` (type success/error), auto-hide 5 detik |
| `formatRupiah(val)` | 40 | `"Rp " + Math.round(num).toLocaleString("id-ID")` |
| `escapeHtml(str)` | 46 | Sanitasi via `createTextNode` |
| `capitalizeWords(str)` | 53 | Title Case tiap awal kata |
| `formatRibuanInput(str)` / `parseRibuanInput(str)` | 58 / 65 | Format & parse angka titik ribuan |
| `compressImage(file, maxPixels)` | 85 | Kompres foto (canvas JPEG q0.82, maxPixels 1.200.000) |
| `loadKatalogSurya()` | 113 | Fetch GET + sort A-Z by namaProduk + dedup by key di `buildDropdownOptions` |

- **Tidak ada modul helper bersama (shared .js)**: helper yang sama (`showStatus`, `formatRupiah`, `escapeHtml`) diduplikasi per halaman (ada di Database-Surya/script.js, Riwayat/script.js, Input/script.js — masing-masing 1x). Jadi view page baru juga akan menyalin helper ini ke script.js-nya sendiri sesuai konvensi repo.
- Pola umum script.js: IIFE + `"use strict"`, `var` (ES5 style), DOM refs dikumpulkan di atas, event listener via `addEventListener`, render HTML via string concat + `escapeHtml`, badge `✓ Cocok`/`⚠️ Perlu dicek` untuk status.
- Untuk tampilan read-only, referensi pola tampilan list paling mirip: `Admin/Riwayat/` (render card list via `renderRiwayat`, pakai `formatRupiah` + `escapeHtml`, baris 263–291 di Riwayat/script.js) atau class `.produk-item`/`.list-section` di `Admin/Input/style.css` kalau mau gaya card katalog.

---

## 3. `git rev-parse HEAD` vs commit graph `e5974431`

```bash
$ git rev-parse HEAD
24fd7ecdacefeba9483c63e4e3f07fb862f6380e   # "auto: 2026-09-05 15:35"
```

- **HEAD ≠ e5974431 — TIDAK COCOK.** HEAD `24fd7ec` lebih baru 3 commit dari `e5974431` (`e597443` → `3255623` → `9762638` → `24fd7ec`).
- GRAPH_REPORT yang dirujuk konteks ada di `graphify-out/2026-09-05/GRAPH_REPORT.md` (baris 13: "Built from commit: `e5974431`") — **artefak graph itu stale 3 commit di belakang HEAD saat ini**.
- Catatan: `graphify-out/` masuk `.gitignore` MoroDuit (baris 1 `graphify-out/`), jadi artefak graph tidak ter-track di git — wajar kalau basenya tertinggal dari commit terbaru.
- **Namun temuan kode TETAP SAH:** pada commit `e5974431` sendiri, `ensureKatalogSuryaHeaders_()` memang ada (baris 77, isi identik dgn HEAD — diverifikasi via `git show e5974431:Apps-Script/code.gs.js`), begitu juga action `getKatalogSurya` (baris 342–345 di versi itu) dan `simpanKatalogSurya` (baris 806–808). Jadi GRAPH_REPORT tidak salah untuk commit yang dijadikan basenya; yang terjadi hanya basenya belum di-update ke HEAD.
- Fungsi & seluruh blok Katalog-Surya **identik antara e5974431 dan HEAD** (diff region Katalog-Surya kosong) — tidak ada perubahan relevan pasca commit graph.

---

## Analisis Kontradiksi (header belum ada vs fungsi ensure ada)

Fakta dari kode:
- Fungsi ada & terpanggil dari 2 action (GET populate + POST simpan).
- Tapi header hanya ditulis bila `sheet.getLastRow() === 0` (baris 83) → tab kosong atau belum ada.

Penjelasan paling masuk akal untuk sheet yang sudah berisi data TANPA header baris 1:
1. **Tab diisi data di luar alur 2 action itu** (mis. manual di Google Sheets, atau data hasil proses lain sebelum fungsi/action ini ada — fungsi pertama muncul di commit `74a3ffe`, 2026-08-26, dan isinya tidak berubah sejak saat itu). Begitu tab punya ≥1 baris data, `getLastRow() > 0` → guard ensure tidak pernah terpenuhi → header tak pernah ditulis.
2. **Deploy Apps Script tidak sinkron dgn git** — kode di editor/deploy Google Apps Script bisa lebih lama dari commit terbaru. (Tidak bisa diverifikasi dari repo ini — butuh cek manual di spreadsheet/deploy.)
3. Konsekuensi praktis: kalau data mulai di baris 1 (tanpa header), action `getKatalogSurya` yang loop dari `i = 1` akan **menganggap baris pertama sebagai header dan membuangnya dari response** — baris data pertama hilang dari tampilan view. Ini risiko terbesar untuk halaman view baru.

Tidak ada ambiguitas yang mengharuskan `ask_user`: hanya ada 1 fungsi bernama `ensureKatalogSuryaHeaders_` (definisi tunggal), nama sheet konsisten ("Katalog-Surya" di semua tempat), dan urutan kolom konsisten A–D.

---

## Implikasi untuk Rencana Halaman "Katalog Surya" (BELUM dieksekusi — discovery saja)

- Backend sudah siap: **action `getKatalogSurya` sudah mengembalikan seluruh isi tab** (array of `{tanggalScan, namaProduk, hargaSatuan, status}`). View page read-only cukup fetch endpoint ini — tidak perlu edit `doGet`/`doPost`.
- Desain view perlu memutuskan: tampilkan **semua baris** (history log) atau **dedup per produk** (pola `loadKatalogSurya`/`buildDropdownOptions` yang dedup by namaProduk, script.js baris 129–138).
- **Kondisi sheet tanpa header harus ditangani/diverifikasi dulu** (paling aman: pastikan baris 1 punya header sebelum mengandalkan `getKatalogSurya`, karena action itu mengasumsikan header di baris 1). Verifikasi isi sheet live tidak bisa dilakukan read-only dari repo ini.
- Konsistensi gaya: pakai `style.css` bersama (`../Input/style.css` dari folder Database-Surya, atau `../../Input/style.css` kalau halaman ada di subfolder `Katalog/`), kerangka header/footer/status-message yang sama, dan salin helper `showStatus`/`formatRupiah`/`escapeHtml` ke script.js halaman baru (konvensi duplikasi per halaman).

---

## STATUS FILE

- ✅ `ensureKatalogSuryaHeaders_()` DITEMUKAN di `Apps-Script/code.gs.js` baris 77 (isi lengkap dikutip di atas) — bukan "tidak ditemukan".
- ✅ Call site teridentifikasi: baris 504 (`doGet` → `getKatalogSurya`) dan 1079 (`doPost` → `simpanKatalogSurya`).
- ✅ `doGet()` dipetakan lengkap (8 action); action baca "Katalog-Surya" SUDAH ADA (`getKatalogSurya`, baris 503).
- ✅ Nama sheet konsisten `"Katalog-Surya"` di 4 pemakaian; urutan kolom A–D konsisten (header tulis = posisi baca = posisi tulis).
- ✅ `git rev-parse HEAD` = `24fd7ec` → TIDAK cocok dgn commit graph `e5974431` (graph stale 3 commit), tapi isi kode Katalog-Surya identik di kedua commit.
- ✅ Tidak ada `ask_user` yang terpanggil — tidak ditemukan ambiguitas (1 definisi fungsi, nama sheet konsisten, urutan kolom konsisten).
- ✅ File kode TIDAK ada yang diubah; hanya `DISCOVERY_katalog-surya-view.md` yang dibuat.
