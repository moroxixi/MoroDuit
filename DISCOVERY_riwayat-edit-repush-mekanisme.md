# DISCOVERY: Mekanisme Riwayat, Mode-Edit & Repush — MoroDuit

> **Tanggal:** 2026-08-24
> **Scope:** MoroDuit/ — Investigasi READ-ONLY, murni dokumentasi mekanisme.
> **Tujuan:** Pahami struktur Riwayat, mekanisme data transfer Keranjang→Priview, dan kapabilitas `doPost()` saat ini — sebagai basis desain fitur Riwayat + Mode-Edit + Repush-to-Sheet di Fase 3.

---

## 1. Struktur Sheet "Riwayat" — Kolom Persis & Tipe Data

### 1.1 Header yang Didefinisikan oleh `ensureHeaders_()`

```javascript
// code.gs.js — ensureHeaders_()
riwayat.getRange(1, 1, 1, 8).setValues([[
  "No Nota", "Nama Pelanggan", "Tanggal", "Produk", "Qty",
  "Harga Satuan", "Subtotal", "Total Nota"
]]);
```

### 1.2 Kolom Lengkap (termasuk kolom formula yang di-auto-fill oleh `simpanRiwayat`)

| Kolom | Index | Header | Tipe | Sumber | Keterangan |
|-------|-------|--------|------|--------|------------|
| A (1) | 0 | No Nota | String | `generateNoNota_()` | Format `MD-YYYYMMDD-XXX`, unique per transaksi |
| B (2) | 1 | Nama Pelanggan | String | `body.namaPelanggan` | Bisa kosong string |
| C (3) | 2 | Tanggal | String | `Utilities.formatDate()` | Format `yyyy-MM-dd HH:mm:ss` (WIB) |
| D (4) | 3 | Produk | String | `item.produk` | Nama produk dari Katalog |
| E (5) | 4 | Qty | Number | `item.qty` | Jumlah item |
| F (6) | 5 | Harga Satuan | Number | `item.hargaSatuan` | **Nilai final**, bukan formula — ini Harga Jual dari Katalog |
| G (7) | 6 | Subtotal | Number | `item.subtotal` | **Nilai final** = `hargaSatuan × qty` |
| H (8) | 7 | Total Nota | Number | `body.total` | **Nilai final** = total seluruh nota |
| I (9) | 8 | Harga Normal | **Formula** | Auto-fill oleh `simpanRiwayat` | VLOOKUP ke Katalog |
| J (10) | 9 | Profit per baris | **Formula** | Auto-fill oleh `simpanRiwayat` | `Subtotal - (Harga Normal × Qty)` |

### 1.3 Formula Kolom I & J (auto-fill)

```javascript
// code.gs.js — simpanRiwayat, auto-fill
formulasI.push(["=IFERROR(VLOOKUP(D" + r + ";Katalog!$B:$D;3;FALSE);\"\")"]);
formulasJ.push(["=IF(I" + r + "=\"\";\"\";G" + r + "-(I" + r + "*E" + r + "))"]);
```

- **Kolom I**: VLOOKUP Produk (kolom D) ke range `Katalog!$B:$D` → ambil kolom ke-3 = **Harga Normal**.
- **Kolom J**: Profit = Subtotal (G) − (Harga Normal (I) × Qty (E)).

### 1.4 Catatan: Satu Baris = Satu Item

Setiap item dalam keranjang ditulis sebagai **baris terpisah** di Riwayat. Semua baris dalam satu transaksi memiliki No Nota yang **sama**. Jadi satu nota belanja = N baris di sheet (satu per produk).

---

## 2. Format & Pola Generate No Nota (`generateNoNota_()`)

### 2.1 Format

```
MD-YYYYMMDD-XXX
```

Contoh: `MD-20260824-001`, `MD-20260824-002`, `MD-20260825-001`

- `MD` = prefix statis (MoroDuit)
- `YYYYMMDD` = tanggal transaksi (timezone WIB / `Asia/Jakarta`)
- `XXX` = nomor urut 3 digit, zero-padded (001, 002, ..., 999)

### 2.2 Mekanisme Hitung Sequence

```javascript
// code.gs.js — generateNoNota_()
var prefix = "MD-" + ymd + "-";
var seen = {};
for (var i = 0; i < allNota.length; i++) {
  var val = String(allNota[i][0]);
  if (val.indexOf(prefix) === 0 && !seen[val]) {
    seen[val] = true;
    count++;
  }
}
var seq = count + 1;
var seqStr = ("00" + seq).slice(-3);
return "MD-" + ymd + "-" + seqStr;
```

**Cara kerja:**
1. Ambil semua nilai kolom A (No Nota) dari Riwayat
2. Hitung jumlah No Nota **unik** yang diawali prefix `MD-YYYYMMDD-`
3. Sequence baru = count + 1

### 2.3 Potensi Dipakai sebagai Identifier Cari Baris

**YA — No Nota bisa dipakai sebagai identifier** untuk mencari baris lama:
- No Nota **unik per transaksi** (bukan per baris), tapi **sama untuk semua item** dalam satu nota
- Untuk mencari semua baris satu transaksi: filter kolom A = No Nota yang dicari
- **Limitasi**: Tidak ada fungsi backend saat ini yang menerima No Nota sebagai parameter pencarian (lihat poin 4 & 10)

---

## 3. Alur `doPost()` Lengkap Saat Ini

### 3.1 Struktur Umum

```javascript
function doPost(e) {
  ensureHeaders_();
  var body = JSON.parse(e.postData.contents);
  var token = body.token;
  // validate token
  var action = body.action; // "updateProduk" | "simpanRiwayat"
  // ... dispatch
}
```

**Parameter dari client (semua action):**
- `token` (string, wajib) — validasi otorisasi
- `action` (string, wajib) — dispatch ke handler yang sesuai

### 3.2 Action: `updateProduk`

**Parameter:**
- `produk` (string, wajib) — nama produk
- `kategori` (string, wajib) — harus dari daftar kategoriList yang valid
- `hargaNormal` (number, wajib)
- `hargaPromo` (number, opsional)
- `status` (string, opsional, default `"Ada"`)
- `catatan` (string, opsional)

**Validasi:**
1. Token harus valid
2. `produk` tidak boleh kosong
3. `hargaNormal` harus ada (bukan undefined/null)
4. `kategori` harus dari whitelist `kategoriList`

**Cara tulis ke sheet:**
- Cari baris produk via `findProdukRow_(sheet, produk)` → cari di kolom B (index 1)
- **Kalau ketemu** (`row > 0`): update baris yang sudah ada pakai `sheet.getRange(row, 1, 1, 8).setValues(...)`
- **Kalau tidak ketemu** (`row === -1`): append baris baru pakai `sheet.getRange(row, 1, 1, 5).setValues(...)` (row di-set ke `getLastRow() + 1`)
- Kolom F (Harga Jual) diisi **otomatis** dengan formula: `=IFERROR(D{row}*(1+VLOOKUP(C{row};$K$2:$L$100;2;FALSE));D{row})`

### 3.3 Action: `simpanRiwayat`

**Parameter:**
- `items` (array of object, wajib, minimal 1 item)
  - Setiap item: `{ produk, qty, hargaSatuan, subtotal }`
- `total` (number) — total nota
- `namaPelanggan` (string, opsional)

**Validasi:**
1. Token harus valid
2. `items` tidak boleh kosong array

**Cara tulis ke sheet:**
1. Generate No Nota baru via `generateNoNota_()`
2. Format tanggal via `Utilities.formatDate()`
3. Bangun array rows: `[noNota, namaPelanggan, tanggal, item.produk, item.qty, item.hargaSatuan, item.subtotal, total]`
4. **Append** ke Riwayat: `sheet.getRange(startRow, 1, rows.length, 8).setValues(rows)` — `startRow = sheet.getLastRow() + 1`
5. Auto-fill kolom I (Harga Normal) dan J (Profit) dengan formula VLOOKUP
6. Return `{ success: true, noNota: noNota, tanggal: tanggal }`

### 3.4 Ringkasan Validasi

| Validasi | `updateProduk` | `simpanRiwayat` |
|----------|----------------|-----------------|
| Token | ✓ | ✓ |
| Field wajib | `produk`, `hargaNormal`, `kategori` | `items` (array non-kosong) |
| Kategori whitelist | ✓ (17 kategori) | ✗ (tidak divalidasi) |
| Duplikat check | ✓ (`findProdukRow_`) | ✗ (selalu append baru) |

---

## 4. Alur `doGet()` Lengkap Saat Ini

### 4.1 Struktur Umum

```javascript
function doGet(e) {
  ensureHeaders_();
  var action = e.parameter.action; // query param
  var token = e.parameter.token;   // query param
  // validate token
  // dispatch
}
```

**Parameter via URL query string:**
- `action` (string, wajib)
- `token` (string, wajib)

### 4.2 Action: `getKatalog`

- **Endpoint:** `?action=getKatalog&token=...`
- **Filter:** Hanya produk dengan `status === "Ada"` (kolom G, index 6)
- **Response fields:** `{ produk, kategori, hargaJual, catatan }`
- **Tidak ada `hargaNormal`** dalam response

### 4.3 Action: `getKatalogFull`

- **Endpoint:** `?action=getKatalogFull&token=...`
- **Filter:** Semua produk (tanpa filter status)
- **Response fields:** `{ produk, kategori, hargaNormal, hargaPromo, hargaJual, status, catatan }`

### 4.4 Action: `getKatalogPerkenalan`

- **Endpoint:** `?action=getKatalogPerkenalan&token=...`
- **Filter:** Kolom J (index 9) = `"Perkenalan"` DAN status = `"Ada"`
- **Response fields:** `{ produk, kategori, hargaJual, catatan }`

### 4.5 Yang BELUM Ada di `doGet()`

- ❌ **Tidak ada fetch berdasarkan No Nota** — tidak ada action untuk mencari baris Riwayat berdasarkan No Nota
- ❌ **Tidak ada fetch berdasarkan tanggal** — tidak ada filter tanggal
- ❌ **Tidak ada fetch Riwayat sama sekali** — `doGet()` hanya membaca sheet **Katalog**, belum pernah membaca sheet **Riwayat**
- ❌ **Tidak ada action `getRiwayat`** atau sejenisnya

**⚠️ Implikasi untuk Fase 3:** Endpoint baru diperlukan untuk fetch data Riwayat (mis. `getRiwayat`, `getRiwayatByNoNota`, dll).

---

## 5. Fungsi `findProdukRow_()` — Cari Row Apa?

### 5.1 Definisi

```javascript
// code.gs.js — findProdukRow_()
function findProdukRow_(sheet, produk) {
  var data = sheet.getDataRange().getValues();
  var search = String(produk).trim().toLowerCase();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim().toLowerCase() === search) {
      return i + 1; // 1-indexed
    }
  }
  return -1;
}
```

### 5.2 Analisis

- **Parameter `sheet`**: Dipanggil dengan sheet **Katalog** saja (lihat `updateProduk` action)
- **Mencari di**: Kolom B (index 1) = kolom "Produk" di Katalog
- **Return**: Nomor baris (1-indexed) jika ketemu, atau `-1` jika tidak
- **Case-insensitive**: Menggunakan `.toLowerCase()` pada kedua nilai

### 5.3 Potensi Dipakai untuk Cari Row Transaksi di Riwayat

**Belum bisa dipakai langsung**, karena:
1. Fungsi ini mencari di kolom B (index 1), yaitu kolom "Produk" di Katalog
2. Di Riwayat, kolom B = "Nama Pelanggan", kolom D = "Produk"
3. Untuk cari transaksi di Riwayat berdasarkan No Nota, perlu mencari di **kolom A** (index 0), bukan kolom B

**Catatan:** Pola fungsi ini **reusable** sebagai template — tinggal ganti parameter kolom yang dicari (dari `data[i][1]` ke `data[i][0]` untuk No Nota). Tapi perlu fungsi baru karena Riwayat perlu return **banyak baris** (satu nota = N baris), bukan satu baris.

---

## 6. Mekanisme Passing Data Keranjang → Priview

### 6.1 Media: `sessionStorage`

Data keranjang ditransfer dari `Keranjang-Duit/script.js` ke `Keranjang-Duit/Priview/script.js` melalui **`sessionStorage`** — bukan localStorage, bukan URL param, bukan cookie.

### 6.2 Key yang Digunakan

| Key | Fungsi | Disimpan Oleh | Dibaca Oleh |
|-----|--------|---------------|-------------|
| `moroduit_keranjang` | Data item checkout | `Keranjang-Duit/script.js` (checkoutBtn handler) | `Priview/script.js` (init) |
| `moroduit_selection` | State checkbox/qty | `Keranjang-Duit/script.js` (`persistSelectionToStorage()`) | `Keranjang-Duit/script.js` (loadKatalog restore) |
| `moroduit_nama_pelanggan` | Nama pelanggan | `Keranjang-Duit/script.js` (`persistNamaPelanggan()`) | `Keranjang-Duit/script.js` (restore) |

### 6.3 Struktur Data `moroduit_keranjang`

```javascript
{
  items: [
    {
      produk: "Indomie Goreng",   // string — nama produk
      qty: 3,                      // number — jumlah item
      hargaSatuan: 3500,           // number — hargaJual dari Katalog (sudah Math.ceil)
      subtotal: 10500              // number — hargaSatuan × qty (sudah Math.ceil)
    },
    // ... item lainnya
  ],
  total: 25500,                    // number — total nota (Math.ceil dari penjumlahan subtotal)
  namaPelanggan: "Budi"            // string — bisa kosong ""
}
```

### 6.4 Proses Checkout (Keranjang-Duit/script.js)

```javascript
// Simpan ke sessionStorage
sessionStorage.setItem(STORAGE_KEY_KERANJANG, JSON.stringify(keranjangData));
// Redirect ke Priview
window.location.href = "../Keranjang-Duit/Priview/index.html";
```

### 6.5 Proses Baca (Priview/script.js)

```javascript
var raw = sessionStorage.getItem("moroduit_keranjang");
keranjangData = JSON.parse(raw);
// Validasi: keranjangData.items harus array dengan length > 0
// Kalau tidak valid → showError()
```

---

## 7. Mekanisme Tombol "Kembali" di Priview

### 7.1 Elemen HTML

```html
<button id="batalBtn" class="btn btn-secondary">
  ❌ Batal / Kembali
</button>
```

### 7.2 Handler

```javascript
// Keranjang-Duit/Priview/script.js
batalBtn.addEventListener("click", function () {
  sessionStorage.removeItem("moroduit_keranjang");
  window.location.href = "../index.html";
});
```

### 7.3 Analisis

- **Path:** `"../index.html"` — **relatif**, mengarah ke `Keranjang-Duit/index.html` (parent directory dari `Priview/`)
- **Efek samping:** Menghapus `moroduit_keranjang` dari sessionStorage sebelum redirect
- **Tidak menghapus** `moroduit_selection` — sehingga user yang kembali ke Keranjang masih melihat checkbox/qty yang sudah dipilih sebelumnya
- **Tidak ada konfirmasi dialog** — langsung redirect

### 7.4 Error State Link

Ada juga link "Kembali ke Keranjang-Duit" di error state:

```html
<a href="../index.html" class="btn btn-primary">🛒 Kembali ke Keranjang-Duit</a>
```

Path yang sama (`../index.html`), juga relatif.

---

## 8. Mekanisme `initWhatsAppLink()` dan `renderNota()` di Priview

### 8.1 `initWhatsAppLink()` — Generate Link WA

```javascript
function initWhatsAppLink() {
  var noWA = MORODUIT_CONFIG.NOMOR_WA_TOKO.replace(/[^0-9]/g, "");
  var totalFormatted = formatRupiah(keranjangData.total);
  var ringkasan = "Total: " + totalFormatted
    + ". Mohon lampirkan foto nota yang baru terunduh.";
  btnKirimWA.href = "https://wa.me/" + noWA
    + "?text=" + encodeURIComponent(ringkasan);
}
```

**Isi pesan WA (sebelum simpan ke Sheet):**
```
Total: Rp 25.500. Mohon lampirkan foto nota yang baru terunduh.
```

**Isi pesan WA (setelah simpan ke Sheet, di-update):**
```
No Nota: MD-20260824-001, Total: Rp 25.500. Mohon lampirkan foto nota yang baru terunduh.
```

### 8.2 Kapan Link WA Di-update

Link WA di-update **dua kali**:
1. **Saat init** (`initWhatsAppLink()`): Pesan hanya berisi Total (tanpa No Nota, karena No Nota belum ada)
2. **Setelah POST simpanRiwayat berhasil**: Pesan di-update dengan No Nota dari response server

```javascript
// Setelah simpanRiwayat sukses
if (response.noNota) {
  var ringkasanFinal = "No Nota: " + response.noNota
    + ", Total: " + totalFormatted
    + ". Mohon lampirkan foto nota yang baru terunduh.";
  btnKirimWA.href = "https://wa.me/" + noWA
    + "?text=" + encodeURIComponent(ringkasanFinal);
}
```

### 8.3 `renderNota()` — Render Tabel Nota

```javascript
function renderNota(data) {
  namaPelangganEl.textContent = data.namaPelanggan || "-";

  // Tanggal draft (client-side, sebelum POST)
  var now = new Date();
  tanggalEl.textContent = now.toLocaleDateString("id-ID", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  // Render items
  for (var i = 0; i < data.items.length; i++) {
    var item = data.items[i];
    // Render: No, Produk, Qty, Harga Satuan, Subtotal
  }
  totalValueEl.textContent = formatRupiah(data.total);
}
```

**Tanggal draft** menggunakan format Indonesia (`toLocaleDateString("id-ID", ...)`). Tanggal ini **diganti** dengan tanggal server (`response.tanggal`) setelah POST berhasil.

### 8.4 Replikasi untuk Mode-Edit Priview

Untuk Priview versi Mode-Edit, yang perlu direplikasi:
- Pola `initWhatsAppLink()` — generate link WA berdasarkan data cart + No Nota
- Pola `renderNota()` — render tabel dari data items
- Pola update link WA setelah POST berhasil (jika No Nota berubah atau tetap sama)
- Perbedaan: Mode-Edit perlu **update** (bukan append) — lihat poin 10

---

## 9. Dependency `html2canvas.min.js`

### 9.1 Lokasi & Pemanggilan

```html
<!-- Keranjang-Duit/Priview/index.html -->
<script src="vendor/html2canvas/html2canvas.min.js"></script>
```

File lokal di folder `vendor/html2canvas/` — **bukan CDN**. Berbeda dengan proyek Tempura/Wonton yang pakai CDN (`hertzen.com`).

### 9.2 Fungsi yang Menggunakannya

**`btnDownloadNota` click handler** (ACTION 2 di Priview):

```javascript
btnDownloadNota.addEventListener("click", function () {
  var notaEl = document.getElementById("nota");
  notaEl.style.boxShadow = "none";

  html2canvas(notaEl).then(function (canvas) {
    var dataURL = canvas.toDataURL("image/png");
    var filename = "nota-" + timestamp + ".png";

    var a = document.createElement("a");
    a.href = dataURL;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
});
```

### 9.3 Reusable untuk Folder Priview Baru?

**YA — reusable tanpa modifikasi**, asalkan:
1. File `html2canvas.min.js` di-copy ke folder vendor Priview baru (atau pakai path relatif yang benar)
2. Elemen nota yang di-capture memiliki `id="nota"` (atau selector diubah)
3. Tidak ada dependensi CSS/JS lain dari html2canvas yang hilang

**Catatan:** html2canvas saat ini dipanggil **3 kali** di Priview:
1. `btnDownloadNota` handler — download PNG
2. `btnSimpanSheet` handler — **TIDAK** pakai html2canvas (hanya POST)
3. `btnKirimWA` — **TIDAK** pakai html2canvas (hanya redirect)

Jadi html2canvas hanya dibutuhkan untuk fitur **download gambar nota**, bukan untuk simpan ke Sheet atau kirim WA.

---

## 10. Ringkasan Akhir: `doPost()` — Append-Only atau Sudah Support Update?

### 10.1 Status Saat Ini: MURNI APPEND-ONLY untuk Riwayat

**`simpanRiwayat` action di `doPost()` adalah MURNI APPEND-ONLY.**

Bukti:
```javascript
// code.gs.js — simpanRiwayat
var startRow = sheet.getLastRow() + 1;  // ← SELALU append di baris terakhir
sheet.getRange(startRow, 1, rows.length, 8).setValues(rows);  // ← append, bukan update
```

**Tidak ada mekanisme untuk:**
- ❌ Mencari baris existing berdasarkan No Nota
- ❌ Update/mengganti baris yang sudah ada
- ❌ Hapus baris yang sudah ada
- ❌ Replace baris berdasarkan identifier apapun

`generateNoNota_()` **selalu generate No Nota baru** — tidak pernah cek apakah No Nota sudah dipakai untuk data yang sama.

### 10.2 Perbandingan: `updateProduk` Sudah Punya Pola Update

Sebagai catatan, action `updateProduk` **sudah punya pola update-by-identifier**:

```javascript
// code.gs.js — updateProduk
var row = findProdukRow_(sheet, produk);  // cari baris berdasarkan nama produk
if (row > 0) {
  sheet.getRange(row, 1, 1, 8).setValues([rowData]);  // UPDATE baris existing
} else {
  sheet.getRange(row, 1, 1, 5).setValues([rowData]);  // APPEND baris baru
}
```

Pola ini **bisa dijadikan acuan** untuk action `updateRiwayat` / `repushRiwayat` di Fase 3:
1. Terima No Nota dari client
2. Cari baris-baris di Riwayat yang kolom A = No Nota tersebut
3. Update baris yang ditemukan (atau hapus + tulis ulang)

### 10.3 Kesenjangan untuk Fitur Mode-Edit + Repush

Untuk mendukung fitur Riwayat + Mode-Edit + Repush-to-Sheet, yang perlu ditambahkan:

| Kebutuhan | Status Saat Ini | Yang Perlu Dibuat |
|-----------|-----------------|-------------------|
| **Fetch data Riwayat** (GET) | ❌ Tidak ada | Action baru `getRiwayat` atau `getRiwayatByNoNota` di `doGet()` |
| **Cari baris by No Nota** | ❌ Tidak ada | Fungsi helper `findRiwayatRows_(sheet, noNota)` — return array baris |
| **Update baris Riwayat** (POST) | ❌ Tidak ada (`simpanRiwayat` append-only) | Action baru `updateRiwayat` atau `repushRiwayat` di `doPost()` |
| **Hapus baris Riwayat** (POST) | ❌ Tidak ada | Action baru `deleteRiwayat` atau bagian dari `repushRiwayat` |

### 10.4 Status God Node (untuk Referensi Task Lanjutan)

| God Node | Edges | Status | Relevansi |
|----------|-------|--------|-----------|
| `doPost()` | 6 edges | God node utama | **Krusial** — perlu ditambah action baru `updateRiwayat`/`repushRiwayat` |
| `loadKatalog()` | 8 edges | God node #3 | Relevan — pattern fetch data dari GET |
| `renderProdukList()` | 7+6 edges | Muncul 2x (2 fungsi beda file) | Relevan — pattern render list (Keranjang + Input) |

---

## Catatan & Anomali

1. **No Nota tidak disimpan di sessionStorage** — Priview hanya menerima `items`, `total`, `namaPelanggan`. No Nota di-generate **di server** saat POST `simpanRiwayat`. Untuk Mode-Edit, No Nota perlu di-fetch dari server (butuh endpoint GET Riwayat).

2. **Satu baris Riwayat = satu item** — multi-item dalam satu nota ditulis sebagai multiple rows dengan No Nota yang sama. Saat Mode-Edit, semua baris dengan No Nota yang sama perlu diupdate/hapus sekaligus.

3. **Harga Satuan & Subtotal disimpan sebagai nilai final** — bukan formula. Saat Mode-Edit mengubah qty atau harga, nilai-nilai ini perlu dihitung ulang di client sebelum POST update.

4. **Formula kolom I & J di Riwayat** = live formulas (VLOOKUP + kalkulasi). Jika baris di-update (qty/harga berubah), formula otomatis recalculate — **tidak perlu diubah manual**.

5. **Kategori list di `updateProduk` tidak konsisten** dengan DISCOVERY sebelumnya — daftar kategori di `code.gs.js` versi saat ini lebih lengkap (17 kategori vs 10 di DISCOVERY lama). Ini menandakan kode sudah di-update sejak DISCOVERY terakhir.

6. **`config.js` memiliki URL Apps Script yang berbeda** dari yang tercatat di DISCOVERY sebelumnya — URL berubah dari `AKfycbyGB00xA83g...` ke `AKfycbxQNaF6t1j3h...`. Ini menunjukkan Apps Script sudah di-deploy ulang.

---

*Report ini dihasilkan oleh Freebuff (Buffy) — READ-ONLY investigation, tidak ada file kode yang diubah.*

*File dibuat: `MoroDuit/DISCOVERY_riwayat-edit-repush-mekanisme.md`*
