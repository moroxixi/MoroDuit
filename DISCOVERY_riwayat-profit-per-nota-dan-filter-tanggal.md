# DISCOVERY: Profit per Nota & Filter Hari/Bulan di Riwayat

> **Tanggal:** 2026-08-27
> **Scope:** MoroDuit — READ-ONLY, tidak ada kode diubah.
> **Kode yang dibaca:**
> - `Admin/Riwayat/script.js` (IIFE penuh, 9 fungsi)
> - `Admin/Riwayat/index.html`
> - `Apps-Script/code.gs.js` (getRiwayat, simpanRiwayat, repushRiwayat)
> - `DISCOVERY_snapshot-riwayat-harga-profit.md`
> - Referensi: `~/HomeLab/Work/Pencatatan-Buku-Kas/Riwayat/script.js` & `index.html` (READ-ONLY)

---

## 0. Commit Freshness Check

| Item | Nilai |
|------|-------|
| **HEAD saat ini** | `2656684e6d70bb9956c1f5f3c16adab8fc148ef6` |
| **Commit basis graph report** | `e5848d53` |
| **Status** | **BEDA** — HEAD sudah lebih baru dari commit basis graph. Graph report tidak 100% mencerminkan kondisi terbaru. Catatan ini untuk Phase 1, tidak perlu graphify update sekarang (fase read-only). |

---

## 1. Temuan dari DISCOVERY_snapshot-riwayat-harga-profit.md

### Nama Kolom Profit di Sheet Riwayat

Header kolom K (index 11): **`"Profit / Baris"`**

### Apakah Nilainya Formula atau Value Final?

**VALUE FINAL (snapshot).** Kode aktual di `simpanRiwayat` dan `repushRiwayat` menulis snapshot value via `setValues()`, bukan `setFormulas()`:

```javascript
// code.gs.js — simpanRiwayat (snapshot block)
sheet.getRange(startRow, 9, rows.length, 1).setValues(valuesI);   // Harga Normal
sheet.getRange(startRow, 10, rows.length, 1).setValues(valuesJ);  // Lagi Promo
sheet.getRange(startRow, 11, rows.length, 1).setValues(valuesK);  // Profit / Baris
```

**⚠️ Catatan penting:** Dokumen discovery lama (`DISCOVERY_snapshot-riwayat-harga-profit.md`) mengklaim kode masih pakai `setFormulas()` — ini **SUDAH KUNO**. Kode aktual sudah berubah ke `setValues()` (snapshot). Jadi利润 per baris sudah merupakan value final, bukan formula live.

### Granularitas

**Per baris item** (satu baris = satu produk dalam satu nota). Profit per nota harus dijumlahkan dari semua baris dengan `noNota` yang sama.

### Rumus Snapshot Profit (dari kode aktual)

```javascript
// code.gs.js — simpanRiwayat/repushRiwayat
var hargaRef = (lagiPromo !== "") ? lagiPromo : hargaNormal;
profitBaris = (hargaSatuan - hargaRef) * qty;
```

Kolom yang terlibat:
- **Harga Normal** (kolom I): dibaca dari Katalog kolom D (`data[i][3]`)
- **Lagi Promo** (kolom J): `hargaPromo` dari Katalog kolom E (`data[i][4]`), ditulis hanya jika `tanggalPromo > tanggal transaksi`
- **Profit / Baris** (kolom K): `(HargaSatuan - HargaRef) * Qty`

---

## 2. Dokumentasi Lengkap Admin/Riwayat/script.js

### Struktur File

IIFE `(function () { "use strict"; ... })()` — semua fungsi di scope privat. Tidak ada export/import.

### Daftar 9 Fungsi (Persis Case-Sensitive)

| # | Nama Fungsi | Signature | Peran |
|---|------------|-----------|-------|
| 1 | `formatRupiah(val)` | `function formatRupiah(val)` | Format angka ke `"Rp X"` dengan `Math.ceil()` dan `toLocaleString("id-ID")` |
| 2 | `escapeHtml(str)` | `function escapeHtml(str)` | Escape HTML via DOM `createTextNode` → `innerHTML` |
| 3 | `showStatus(message, type)` | `function showStatus(message, type)` | Tampilkan pesan status dengan class CSS |
| 4 | `hideStatus()` | `function hideStatus()` | Sembunyikan pesan status (tambah class `"hidden"`) |
| 5 | `groupByNoNota(rows)` | `function groupByNoNota(rows)` | Kelompokkan array row per `noNota`, return array of group objects (sorted tanggal DESC) |
| 6 | `formatTanggalIndo(dateStr)` | `function formatTanggalIndo(dateStr)` | Format tanggal string ke locale Indonesia (hanya tanggal, tanpa jam) |
| 7 | `renderRiwayat(groups)` | `function renderRiwayat(groups)` | Render HTML cards ke `#riwayatList` |
| 8 | `handleCardClick(e)` | `function handleCardClick(e)` | Simpan `noNota` ke `sessionStorage`, redirect ke `Mode-Edit/index.html` |
| 9 | `loadRiwayat()` | `function loadRiwayat()` | Fetch data dari API `?action=getRiwayat`, panggil `groupByNoNota()` → `renderRiwayat()` |

**Fungsi ke-9 yang dimaksud di task: `loadRiwayat()`** — function ini adalah entry point yang fetch data dari backend, lalu memanggil `groupByNoNota(data)` → `renderRiwayat(groups)`.

### Implementasi `formatTanggalIndo()` — Detail

```javascript
// Admin/Riwayat/script.js
function formatTanggalIndo(dateStr) {
  // dateStr = "yyyy-MM-dd HH:mm:ss" (WIB)
  var d = new Date(dateStr.replace(" ", "T") + "+07:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}
```

**Signature:** `formatTanggalIndo(dateStr)` — 1 parameter, string format `"yyyy-MM-dd HH:mm:ss"`.

**Output contoh:** `"Selasa, 27 Agustus 2026"` (hanya tanggal, **TIDAK termasuk jam**).

**Sudah dipanggil di titik render tanggal?** ✅ YA — dipanggil di `renderRiwayat()`:

```javascript
// Admin/Riwayat/script.js — renderRiwayat()
'<span class="riwayat-tanggal">' + formatTanggalIndo(g.tanggal) + '</span>'
```

**Kesimpulan:** Tanggal sudah ditampilkan dalam format Indonesia yang benar ("Selasa, 27 Agustus 2026"), bukan raw `Date` JS. Screenshot yang menunjukkan "Thu Aug 27 2026 16:18:20 GMT+0700..." kemungkinan dari build lama atau debug mode — kode aktual sudah benar.

### Implementasi `groupByNoNota()` — Detail

```javascript
// Admin/Riwayat/script.js
function groupByNoNota(rows) {
  var groups = {};
  var order = []; // preserve insertion order

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var key = row.noNota;
    if (!key) continue;

    if (!groups[key]) {
      groups[key] = {
        noNota: key,
        namaPelanggan: row.namaPelanggan,
        tanggal: row.tanggal,
        items: [],
        total: row.total
      };
      order.push(key);
    }

    groups[key].items.push({
      produk: row.produk,
      qty: row.qty,
      hargaSatuan: row.hargaSatuan,
      subtotal: row.subtotal
    });
  }
  // ... sorting by tanggal DESC, fallback ke noNota DESC
}
```

**Field yang dikumpulkan per grup:**
- `noNota` (string)
- `namaPelanggan` (string)
- `tanggal` (string, format `"yyyy-MM-dd HH:mm:ss"`)
- `items[]` (array of `{ produk, qty, hargaSatuan, subtotal }`)
- `total` (number — diambil dari baris pertama grup)

**Apakah sudah menjumlahkan profit per grup?** ❌ **TIDAK.** Field `profit` / `profitBaris` **TIDAK KUMPUL** di `groupByNoNota()`. Alasannya: field profit tidak dikirim dari API (lihat §3).

**Catatan:** Field `total` di grup diambil dari baris pertama (`row.total`), yang adalah kolom H "Total Nota" — nilainya sama untuk semua baris dalam 1 nota (karena Total Nota diisi di setiap baris).

### Struktur HTML Card Riwayat Saat Ini

```
<div class="riwayat-card" data-no-nota="MD-20260827-001" role="button" tabindex="0">
  <div class="riwayat-header">
    <span class="riwayat-no-nota">MD-20260827-001</span>       ← No Nota
    <span class="riwayat-total">Rp 125.000</span>               ← Total
  </div>
  <div class="riwayat-meta">
    <span class="riwayat-pelanggan">Budi</span>                 ← Nama
    <span class="riwayat-tanggal">Selasa, 27 Agustus 2026</span> ← Tanggal
  </div>
  <div class="riwayat-summary">
    <span>3 produk (7 barang)</span>                            ← X produk (Y barang)
  </div>
</div>
```

**Lokasi untuk sisipkan "Profit per Nota":** Di bawah `<span class="riwayat-tanggal">` (di dalam `riwayat-meta`), atau sebagai div baru di antara `riwayat-meta` dan `riwayat-summary`. User minta di bawah tanggal → opsi: tambah `<span class="riwayat-profit">` di dalam `riwayat-meta` setelah tanggal, atau div terpisah.

---

## 3. Backend: `getRiwayat` di `Apps-Script/code.gs.js`

### Field yang Dikirim ke Frontend per Baris Riwayat

```javascript
// code.gs.js — doGet() → getRiwayat
result.push({
  noNota: String(row[0] || ""),        // kolom A
  namaPelanggan: String(row[1] || ""), // kolom B
  tanggal: String(row[2] || ""),       // kolom C
  produk: String(row[3] || ""),        // kolom D
  qty: row[4],                         // kolom E
  hargaSatuan: row[5],                 // kolom F
  subtotal: row[6],                    // kolom G
  total: row[7]                        // kolom H
});
```

**8 field dikirim:** `noNota`, `namaPelanggan`, `tanggal`, `produk`, `qty`, `hargaSatuan`, `subtotal`, `total`.

**❌ Field "Profit / Baris" (kolom K, index 10) TIDAK dikirim ke frontend.** Backend hanya mengembalikan kolom A-H.

**❌ Field "Harga Normal" (kolom I, index 8) TIDAK dikirim.**

**❌ Field "Lagi Promo" (kolom J, index 9) TIDAK dikirim.**

### Field Lain yang Bisa Dipakai untuk Grouping per Hari/Bulan

| Field | Format | Bisa untuk grouping? |
|-------|--------|---------------------|
| `tanggal` | `"yyyy-MM-dd HH:mm:ss"` (string WIB) | ✅ **YA** — bisa extract `"yyyy-MM-dd"` untuk grouping hari, `"yyyy-MM"` untuk grouping bulan |
| `noNota` | `"MD-YYYYMMDD-XXX"` | ⚠️ Bisa, tapi tidak konsisten jika ada nota yang di-repush (tanggal berubah, noNota tetap) |

**`tanggal` adalah field terbaik untuk grouping hari/bulan** — nilainya di-update saat `repushRiwayat`, jadi selalu mencerminkan kapan transaksi terakhir di-push.

### Konfirmasi Nama Field Profit di Response API

**Field profit TIDAK ADA di response API `getRiwayat`.** Ini sudah dikonfirmasi:
1. Kode `getRiwayat` di `code.gs.js` hanya push 8 field (A-H)
2. `DISCOVERY_snapshot-riwayat-harga-profit.md` juga mencatat: "getRiwayat tidak mengembalikan kolom I (Harga Normal), J (Lagi Promo), atau K (Profit / Baris) ke client — hanya kolom A-H"

**⚠️ Implikasi untuk Phase 1:** Untuk menampilkan profit per nota, backend `getRiwayat` **WAJIB dimodifikasi** untuk menambahkan field profit (kolom K) ke response. Minimal: tambah `profitBaris: data[i][10]` ke object result. Idealnya: juga tambahkan `profitBaris` ke payload untuk perhitungan profit per nota di client.

---

## 4. Pola Referensi dari Pencatatan-Buku-Kas

**⚠️ Scope: READ-ONLY, hanya dibaca untuk adaptasi pola, bukan di-copy.**

### Pola Navigasi Hari & Bulan

**State:**
```javascript
let currentDate = new Date();          // selalu dihitung ulang
let currentMonthKey = null;            // "YYYY-MM" saat mode bulanan; null = mode harian
```

**Fungsi navigasi:**
- `goToDate(date)`: Set `currentDate = date`, `currentMonthKey = null` (keluar mode bulanan), update label & picker, panggil `refreshCurrent()`
- `goToMonth(date)`: Set `currentDate = date`, `currentMonthKey = monthKeyOf(date)` (masuk mode bulanan), update label & picker, panggil `refreshCurrent({ mode: "month" })`
- `monthKeyOf(date)`: Return `"YYYY-MM"` — digunakan sebagai key cache & mode flag

**UI elements (dari index.html):**
```html
<!-- Filter harian -->
<div class="nav-bar">
  <button id="btnKemarin">← Kemarin</button>
  <button id="btnHariIni">Hari Ini</button>
  <label><span>Pilih Tanggal</span><input type="date" id="datePicker"></label>
</div>
<!-- Filter bulanan -->
<div class="nav-bar">
  <button id="btnBulanIni">Bulan Ini</button>
  <label><span>Pilih Bulan</span><input type="month" id="monthPicker"></label>
</div>
```

### Pola Fetch Data

**Harian:** `fetchList(date, { mode: "day" })` → fetch 1 request `?action=list&tanggal=dd/MM/yyyy`
**Bulanan:** `fetchMonthList(date)` → fetch N request (1 per hari dalam bulan, batch 10 paralel) → gabung + deduplicate

**Cache:** `fetchCache` (Map) dengan key `"dd/MM/yyyy"` (harian) atau `"bulan:YYYY-MM"` (bulanan), max age 30 menit.

### Pola Agregasi & Tampilan

- `renderList(rows)`: Simpan ke `allRowsToday`, render chip kategori filter, panggil `applyFilterAndRenderCards()`
- `applyFilterAndRenderCards()`: Filter rows berdasarkan `activeKategoriFilter`, hitung total masuk/keluar/dividen, render cards
- Agregasi (total masuk/keluar) ditampilkan di **summary bar** di atas cards, bukan per card

### Perbedaan dengan MoroDuit

| Aspek | Pencatatan-Buku-Kas | MoroDuit |
|-------|---------------------|----------|
| Struktur data | Flat rows per transaksi (satu baris = satu transaksi) | Grouped by `noNota` (satu grup = satu nota, berisi array items) |
| Fetch backend | Per tanggal (1 hari) atau per bulan (N hari) | Satu fetch semua data (`?action=getRiwayat`) |
| Filter | Kategori chip + navigasi hari/bulan | Tidak ada filter |
| Summary | Total masuk/keluar/dividen per periode | Tidak ada (hanya total per nota di card) |
| Mode switch | `currentMonthKey` sebagai flag (null=harian, string=bulanan) | Tidak ada mode |

**Pola yang bisa diadaptasi ke MoroDuit:**
1. Navigasi hari/bulan via `goToDate()`/`goToMonth()` + `monthKeyOf()`
2. UI buttons: "Hari Ini", "Kemarin", date picker, "Bulan Ini", month picker
3. State `currentMonthKey` sebagai flag mode
4. Grouping by `tanggal` (extract date/month dari string `"yyyy-MM-dd HH:mm:ss"`)
5. Fetch strategy: MoroDuit bisa pakai **client-side filtering** (sudah fetch semua data, filter by tanggal di client) — lebih simpel daripada fetch per hari seperti Pencatatan-Buku-Kas

---

## 5. Cross-Check: Field yang Tersedia untuk Profit per Hari & Bulan

### Profit per Nota

**Butuh:** Field profit per baris dari API → jumlahkan per `noNota`.

**Status saat ini:**
- ✅ `profitBaris` ada di sheet (kolom K, index 10) — sudah diisi sebagai snapshot value
- ❌ `profitBaris` TIDAK dikirim dari backend ke frontend
- ⚠️ **Solusi Phase 1:** Tambahkan `profitBaris: data[i][10]` ke object di `getRiwayat` di `code.gs.js`
- ⚠️ **Di client:** Setelah `groupByNoNota()`, jumlahkan `items.reduce((sum, item) => sum + (item.profitBaris || 0), 0)` per grup

### Profit per Hari

**Butuh:** Profit per nota (dari atas) + grouping by tanggal (extract `"yyyy-MM-dd"` dari field `tanggal`).

**Status saat ini:**
- ✅ Field `tanggal` tersedia di API (string `"yyyy-MM-dd HH:mm:ss"`)
- ✅ Bisa extract hari: `tanggal.substring(0, 10)` → `"yyyy-MM-dd"`
- ⚠️ Perlu: setelah group by nota, lalu group by hari → jumlahkan profit per hari

### Profit per Bulan

**Butuh:** Sama seperti per hari, tapi extract `"yyyy-MM"` dari field `tanggal`.

**Status saat ini:**
- ✅ Field `tanggal` tersedia
- ✅ Bisa extract bulan: `tanggal.substring(0, 7)` → `"yyyy-MM"`
- ⚠️ Perlu: setelah group by nota, lalu group by bulan → jumlahkan profit per bulan

### Konsistensi Field Tanggal

- `tanggal` di-update saat `repushRiwayat` (tanggal baru = waktu repush), jadi **selalu konsisten** dengan grouping
- `noNota` format `MD-YYYYMMDD-XXX` mengandung tanggal, tapi **tidak konsisten** jika ada repush (tanggal di noNota tetap, tapi tanggal di kolom C berubah)
- **Kesimpulan: pakai field `tanggal` (kolom C) untuk grouping, bukan parse dari `noNota`**

---

## 6. Ringkasan Temuan untuk Phase 1

### Yang Perlu Diubah Backend (`Apps-Script/code.gs.js`)

1. **`getRiwayat`**: Tambahkan field `profitBaris` (kolom K, index 10) ke response object
2. Minimal: `profitBaris: data[i][10]`
3. Idealnya juga: `hargaNormal: data[i][8]`, `lagiPromo: data[i][9]` (untuk debugging/display jika diperlukan)

### Yang Perlu Diubah Frontend (`Admin/Riwayat/script.js`)

1. **`groupByNoNota()`**: Tambah field `profitBaris` ke items array, tambah field `profitPerNota` ke group object (dijumlahkan dari items)
2. **`renderRiwayat()`**: Tambah elemen `<span class="riwayat-profit">` di card (di bawah tanggal, sesuai permintaan user)
3. **Filter baru**: Implementasi filter per hari & per bulan (adaptasi pola `goToDate()`/`goToMonth()` dari Pencatatan-Buku-Kas, tapi pakai client-side filtering karena sudah fetch semua data)
4. **Summary**: Tambahkan ringkasan profit per hari/bulan (opsional, tergantung permintaan user)

### Yang TIDAK Perlu Diubah

- `formatTanggalIndo()` — sudah benar
- `formatRupiah()` — sudah benar
- `escapeHtml()` — sudah benar
- `handleCardClick()` — tidak terkait
- `simpanRiwayat` / `repushRiwayat` — snapshot profit sudah benar
- Struktur sheet Riwayat — sudah lengkap (12 kolom)

### Bug "Lagi Promo" — DIABAIKAN (sesuai instruksi user)

Bug formula "Lagi Promo" yang membandingkan `tanggalPromo > tanggal transaksi` (kolom tanggal, bukan harga satuan) **TIDAK DIFIX di task ini**. Akan difix terpisah nanti.

---

*Report ini di-generate pada Phase 0 (Discovery, Read-Only). Semua kutipan kode berasal dari file yang disebutkan di atas. Tidak ada kode yang diubah.*
