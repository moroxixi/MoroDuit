# DISCOVERY: Snapshot Harga Normal / Lagi Promo / Profit di Sheet Riwayat

> **Tanggal:** 2026-08-26
> **Scope:** MoroDuit/ — Investigasi READ-ONLY, tulis hanya 1 file laporan baru.
> **Kode yang dibaca:** `Apps-Script/code.gs.js` (commit `a0dcbf4`, 2026-08-26)
> **Referensi awal:** `DISCOVERY_harga-jual-dan-priview-mobile.md` (2026-08-23) — **BANYAK BASI**, kode sudah berubah signifikan.

---

## 1. Fungsi yang Set Kolom I, J, K sebagai Formula

**Jawaban: Dua fungsi — `simpanRiwayat` DAN `repushRiwayat` (keduanya action handler di dalam `doPost()`).**

Kedua fungsi memiliki blok formula yang identik. Kode asli dari `simpanRiwayat`:

```javascript
// code.gs.js — simpanRiwayat, di dalam doPost()
// ── Auto-fill formula kolom I (Harga Normal), J (Lagi Promo), K (Profit / Baris) ──
// Kolom I: Harga Normal (VLOOKUP ke Katalog $B:$D kolom 3)
// Kolom J: Lagi Promo — cek apakah harga promo di Katalog lebih mahal dari Harga Satuan
// Kolom K: Profit / Baris — (Harga Satuan - Harga Normal atau Promo) * Qty
// CATATAN: Pemisah argumen pakai titik koma (;) — konsisten locale sheet.
var formulasI = [];
var formulasJ = [];
var formulasK = [];
for (var f = 0; f < rows.length; f++) {
  var r = startRow + f;
  formulasI.push(["=IFERROR(VLOOKUP(D" + r + ";Katalog!$B:$D;3;FALSE);\"\")"]);
  formulasJ.push(["=IFERROR(IF(VLOOKUP(D" + r + ";Katalog!$B:$H;7;FALSE)>C" + r + ";VLOOKUP(D" + r + ";Katalog!$B:$H;4;FALSE);\"\");\"\")"]);
  formulasK.push(["=(F" + r + "-IF(J" + r + "<>\"\";J" + r + ";I" + r + "))*E" + r]);
}
sheet.getRange(startRow, 9, rows.length, 1).setFormulas(formulasI);
sheet.getRange(startRow, 10, rows.length, 1).setFormulas(formulasJ);
sheet.getRange(startRow, 11, rows.length, 1).setFormulas(formulasK);
```

**Kode identik juga ada di `repushRiwayat`:**

```javascript
// code.gs.js — repushRiwayat, di dalam doPost()
// ── Auto-fill formula kolom I (Harga Normal), J (Lagi Promo), K (Profit / Baris) ──
// REUSE pola yang SAMA dengan simpanRiwayat.
var formulasI = [];
var formulasJ = [];
var formulasK = [];
for (var f = 0; f < rows.length; f++) {
  var r = startRow + f;
  formulasI.push(["=IFERROR(VLOOKUP(D" + r + ";Katalog!$B:$D;3;FALSE);\"\")"]);
  formulasJ.push(["=IFERROR(IF(VLOOKUP(D" + r + ";Katalog!$B:$H;7;FALSE)>C" + r + ";VLOOKUP(D" + r + ";Katalog!$B:$H;4;FALSE);\"\");\"\")"]);
  formulasK.push(["=(F" + r + "-IF(J" + r + "<>\"\";J" + r + ";I" + r + "))*E" + r]);
}
sheet.getRange(startRow, 9, rows.length, 1).setFormulas(formulasI);
sheet.getRange(startRow, 10, rows.length, 1).setFormulas(formulasJ);
sheet.getRange(startRow, 11, rows.length, 1).setFormulas(formulasK);
```

**Perbedaan dengan `DISCOVERY_harga-jual-dan-priview-mobile.md` (2026-08-23):**

| Aspek | Dokumen Lama (2026-08-23) | Kode Aktual (2026-08-26) |
|-------|---------------------------|--------------------------|
| Kolom I | `VLOOKUP(D{r};Katalog!$B:$D;3;FALSE)` | SAMA ✅ |
| Kolom J | `=IF(I{r}="";"";G{r}-(I{r}*E{r}))` (Profit lama) | `=IFERROR(IF(VLOOKUP(D{r};Katalog!$B:$H;7;FALSE)>C{r};VLOOKUP(D{r};Katalog!$B:$H;4;FALSE);"");"")` (**Lagi Promo** — BEDA TOTAL) |
| Kolom K | Tidak ada | `=(F{r}-IF(J{r}<>"";J{r};I{r}))*E{r}` (**Profit / Baris** — BARU) |
| Jumlah kolom auto-fill | 2 (I & J) | 3 (I, J, K) |

**⚠️ CATATAN PENTING:** Dokumen lama mengklaim kolom J = "Profit per baris". Di kode aktual, kolom J = "Lagi Promo" (menyimpan harga promo jika sedang aktif), dan Profit dipindah ke kolom K. Jadi **rumus acuan yang diberikan user: `=(F2-IF(J2<>"";J2;I2))*E2` SUDAH SAMA PERSIS dengan apa yang ada di kolom K kode aktual** — hanya beda 1 baris offset (user pakai referensi `F2` vs kode pakai `F{r}` di row dinamis).

**Kesimpulan:** Kolom Harga Normal (I), Lagi Promo (J), dan Profit / Baris (K) **sudah ada di kode aktual** dan sudah di-generate sebagai formula otomatis di kedua entry point (`simpanRiwayat` dan `repushRiwayat`). Tidak perlu menambah kolom baru.

---

## 2. Header Lengkap Sheet Riwayat (ensureHeaders_)

Kode asli dari `ensureHeaders_()`:

```javascript
// code.gs.js — ensureHeaders_()
// Tab Riwayat
var riwayat = ss.getSheetByName("Riwayat");
if (!riwayat) {
  riwayat = ss.insertSheet("Riwayat");
}
if (riwayat.getLastRow() === 0) {
  riwayat.getRange(1, 1, 1, 12).setValues([[
    "No Nota", "Nama Pelanggan", "Tanggal", "Produk", "Qty",
    "Harga Satuan", "Subtotal", "Total Nota",
    "Harga Normal", "Lagi Promo", "Profit / Baris", "Sumber"
  ]]);
} else {
  // Idempotent: tambah kolom "Nama Pelanggan" kalau belum ada
  var headers = riwayat.getRange(1, 1, 1, riwayat.getLastColumn()).getValues()[0];
  var hasNamaPelanggan = false;
  for (var h = 0; h < headers.length; h++) {
    if (String(headers[h]).trim().toLowerCase() === "nama pelanggan") {
      hasNamaPelanggan = true;
      break;
    }
  }
  if (!hasNamaPelanggan) {
    riwayat.insertColumnBefore(2);
    riwayat.getRange(1, 2).setValue("Nama Pelanggan");
  }

  // Idempotent: tambah kolom "Harga Normal" (I), "Lagi Promo" (J), "Profit / Baris" (K), "Sumber" (L) kalau belum ada
  var newHeaders = [
    { name: "Harga Normal", col: 9 },
    { name: "Lagi Promo", col: 10 },
    { name: "Profit / Baris", col: 11 },
    { name: "Sumber", col: 12 }
  ];
  for (var nh = 0; nh < newHeaders.length; nh++) {
    var found = false;
    for (var h2 = 0; h2 < headers.length; h2++) {
      if (String(headers[h2]).trim().toLowerCase() === newHeaders[nh].name.toLowerCase()) { found = true; break; }
    }
    if (!found) { riwayat.getRange(1, newHeaders[nh].col).setValue(newHeaders[nh].name); }
  }
}
```

**Urutan header lengkap (12 kolom):**

| Kolom | Huruf | Header | Index Array |
|-------|-------|--------|-------------|
| 1 | A | No Nota | 0 |
| 2 | B | Nama Pelanggan | 1 |
| 3 | C | Tanggal | 2 |
| 4 | D | Produk | 3 |
| 5 | E | Qty | 4 |
| 6 | F | Harga Satuan | 5 |
| 7 | G | Subtotal | 6 |
| 8 | H | Total Nota | 7 |
| 9 | I | Harga Normal | 8 |
| 10 | J | Lagi Promo | 9 |
| 11 | K | Profit / Baris | 10 |
| 12 | L | Sumber | 11 |

**Mapping referensi user:**
- Kolom C user → header "Tanggal" ✅ (bukan "Harga Jual" — koreksi dari asumsi awal)
- Kolom D user → header "Produk" ✅
- Kolom E user → header "Qty" ✅
- Kolom F user → header "Harga Satuan" ✅
- Kolom I user → header "Harga Normal" ✅
- Kolom J user → header "Lagi Promo" ✅

---

## 3. Kolom "Profit" — Sudah Ada atau Belum?

**SUDAH ADA.** Kolom K (index 11) dengan header "Profit / Baris" sudah didefinisikan di `ensureHeaders_()` dan sudah di-generate sebagai formula oleh `simpanRiwayat` dan `repushRiwayat`.

Kode `ensureHeaders_()` mendefinisikan 12 kolom, termasuk:
```javascript
riwayat.getRange(1, 1, 1, 12).setValues([[
  "No Nota", "Nama Pelanggan", "Tanggal", "Produk", "Qty",
  "Harga Satuan", "Subtotal", "Total Nota",
  "Harga Normal", "Lagi Promo", "Profit / Baris", "Sumber"
]]);
```

Dan idempotent check memastikan kolom K tetap ada:
```javascript
var newHeaders = [
  { name: "Harga Normal", col: 9 },
  { name: "Lagi Promo", col: 10 },
  { name: "Profit / Baris", col: 11 },
  { name: "Sumber", col: 12 }
];
```

**Kolom tersedia berikutnya jika perlu:** Kolom M (index 13) — belum terpakai di Riwayat.

---

## 4. Payload yang Dikirim ke `simpanRiwayat`

### Entry Point 1: Keranjang-Duit → Priview → simpanRiwayat

**Checkout di `Keranjang-Duit/script.js`:**
```javascript
// Keranjang-Duit/script.js — checkout handler
items.push({
  produk: nama,
  qty: qty,
  hargaSatuan: Math.ceil(hargaJual),
  subtotal: Math.ceil(hargaJual * qty)
});
```

**Priview mengirim ke server:**
```javascript
// Customer/Keranjang-Duit/Priview/script.js
var payload = {
  action: "simpanRiwayat",
  token: MORODUIT_CONFIG.TOKEN,
  items: keranjangData.items,      // [{produk, qty, hargaSatuan, subtotal}]
  total: keranjangData.total,
  namaPelanggan: keranjangData.namaPelanggan || ""
};
```

### Entry Point 2: Input-Sheet-From-Nota → simpanRiwayat

**Save di `Input-Sheet-From-Nota/script.js`:**
```javascript
// Admin/Input-Sheet-From-Nota/script.js — saveBtn handler
var payload = {
  action: "simpanRiwayat",
  token: MORODUIT_CONFIG.TOKEN,
  items: backendItems,             // [{produk, qty, hargaSatuan, subtotal}]
  total: total,
  namaPelanggan: namaPelangganInput.value.trim(),
  sumber: "Nota"                   ← BEDA: ada field "sumber"
};
```

### Perbandingan Struktur Payload

| Field | Keranjang-Duit/Priview | Input-Sheet-From-Nota |
|-------|----------------------|----------------------|
| `action` | `"simpanRiwayat"` | `"simpanRiwayat"` |
| `token` | ✅ | ✅ |
| `items[].produk` | ✅ (nama produk) | ✅ (nama produk) |
| `items[].qty` | ✅ | ✅ |
| `items[].hargaSatuan` | ✅ (= `hargaJual` dari Katalog) | ✅ (= `hargaJual` dari Katalog atau manual) |
| `items[].subtotal` | ✅ (= `hargaSatuan * qty`) | ✅ (= `hargaSatuan * qty`) |
| `total` | ✅ | ✅ |
| `namaPelanggan` | ✅ (bisa kosong) | ✅ |
| **`sumber`** | ❌ **tidak ada** | ✅ `"Nota"` |

**Kesimpulan payload:**
- **Produk (kolom D)** dan **Harga Satuan (kolom F)** sudah selalu ada di payload kedua entry point.
- **Qty (kolom E)** dan **Subtotal (kolom G)** juga selalu ada.
- Perbedaan: Input-Sheet-From-Nota mengirim field `sumber: "Nota"` yang ditulis ke kolom L oleh `simpanRiwayat`. Keranjang-Duit tidak mengirim `sumber` (kolom L kosong).

---

## 5. Akses ke Sheet "Katalog" di Scope `simpanRiwayat`

**YA — `simpanRiwayat` sudah punya akses langsung ke sheet "Katalog"** karena formula VLOOKUP yang ditulis ke kolom I dan J refer langsung ke `Katalog!$B:$D` dan `Katalog!$B:$H`. Namun ini adalah **formula spreadsheet** (dieksekusi oleh Google Sheets), bukan Apps Script yang membaca data Katalog secara langsung di dalam fungsi `simpanRiwayat`.

**Untuk menghitung snapshot value server-side (tanpa formula), pendekatan yang tepat adalah:**

1. Baca data Katalog di dalam `simpanRiwayat` menggunakan `ss.getSheetByName("Katalog")` — scope yang sama sudah tersedia karena `doPost()` sudah mengakses `SpreadsheetApp.getActiveSpreadsheet()` dan `ss.getSheetByName("Riwayat")`.

2. Contoh pola yang sudah ada di `doGet()` untuk membaca Katalog:
```javascript
// code.gs.js — doGet() → getKatalogFull
var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheetByName("Katalog");
var data = sheet.getDataRange().getValues();
```

3. Fungsi `findProdukRow_(sheet, produk)` sudah tersedia dan bisa dipanggil dengan sheet Katalog:
```javascript
// code.gs.js — helper
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

**Kesimpulan:** `simpanRiwayat` BISA membaca Katalog langsung (sudah ada `SpreadsheetApp` di scope). Untuk menghitung snapshot, cukup tambahkan `ss.getSheetByName("Katalog")` di dalam handler `simpanRiwayat` dan baca hargaNormal/hargaPromo dari data Katalog. **Tidak perlu ubah client sama sekali.**

---

## 6. Tempat Lain yang Hitung Harga Normal / Lagi Promo / Profit

### Client-side (browser)

**TIDAK ADA** di Keranjang-Duit/Priview atau Input-Sheet-From-Nota yang menghitung Harga Normal, Lagi Promo, atau Profit secara terpisah.

- **Keranjang-Duit/script.js:** Hanya menampilkan `hargaJual` dari Katalog (dari endpoint `getKatalogFull`). Tidak ada kalkulasi hargaNormal atau profit.
- **Keranjang-Duit/Priview/script.js:** Hanya menampilkan data dari sessionStorage (items yang sudah di-checkout). Tidak ada kalkulasi hargaNormal, lagipromo, atau profit. Juga tidak mengirim field hargaNormal ke server.
- **Input-Sheet-From-Nota/script.js:** Menggunakan `hargaJual` dari Katalog (dari endpoint `getKatalogFull`) atau input manual user. Tidak ada kalkulasi hargaNormal atau profit.

### Server-side (code.gs.js)

- **`getRiwayat` (doGet):** Membaca data Riwayat termasuk kolom I, J, K tetapi sebagai **nilai hasil formula** (dari `data[i][8]`, `data[i][9]`, `data[i][10]`). Tidak menghitung ulang — hanya meneruskan apa yang ada di sheet.

```javascript
// code.gs.js — doGet() → getRiwayat
for (var i = 1; i < data.length; i++) {
  var row = data[i];
  if (!row[0] && !row[3]) continue;
  result.push({
    noNota: String(row[0] || ""),
    namaPelanggan: String(row[1] || ""),
    tanggal: String(row[2] || ""),
    produk: String(row[3] || ""),
    qty: row[4],
    hargaSatuan: row[5],
    subtotal: row[6],
    total: row[7]
  });
}
```

**Catatan:** `getRiwayat` tidak mengembalikan kolom I (Harga Normal), J (Lagi Promo), atau K (Profit / Baris) ke client — hanya kolom A-H. Jadi bahkan jika formula berubah, client tidak akan tahu. Ini artinya tidak ada **dual source of truth** antara client dan server untuk ketiga kolom ini — **semua ada di server/sheet saja**.

**Kesimpulan:** Tidak ada tempat lain yang menghitung ulang Harga Normal, Lagi Promo, atau Profit secara independen. Satu-satunya sumber adalah formula di kolom I, J, K sheet Riwayat (oleh `simpanRiwayat`/`repushRiwayat`). ✅ Aman untuk diubah ke snapshot value tanpa konflik.

---

## 7. Commit Graph Freshness Check

**Referensi di `graphify-out/graph.json`:**
```json
"built_at_commit": "ad6092b6b185849a63638b66a5d326fcfcccef61"
```

**Commit terakhir yang menyentuh `Apps-Script/code.gs.js`:**
```
a0dcbf4 auto: 2026-08-26 15:45
```

**5 commit terakhir untuk code.gs.js:**
```
a0dcbf4 auto: 2026-08-26 15:45
74a3ffe auto: 2026-08-26 11:12
bc7d60b auto: 2026-08-25 21:00
13c6083 auto: 2026-08-25 09:54
c897f48 auto: 2026-08-24 21:19
```

**Verifikasi:** Commit `ad6092b6` tidak ditemukan di `git log` code.gs.js — kemungkinan hash di graph.json sudah **usang**. Commit aktual terbaru adalah `a0dcbf4` (2026-08-26 15:45), yang sudah **lebih baru** dari yang tercatat di graph.

**Dampak:** Laporan `graphify-out/GRAPH_REPORT.md` tidak 100% mencerminkan kondisi terbaru code.gs.js. Perbedaan signifikan:
- Graph lama mengklaim kolom J = "Profit per baris" → kode aktual kolom J = "Lagi Promo"
- Graph lama tidak mencatat kolom K ("Profit / Baris") → kode aktual sudah ada
- Graph lama tidak mencatat action `repushRiwayat` → kode aktual sudah ada
- Daftar kategori di `updateProduk` sudah berubah (tambah "Gula", "Minuman Serbuk/Sachet", dll)

**⚠️ Graph perlu di-rebuild** setelah task ini selesai.

---

## Ringkasan Temuan Kritis

### Yang Sudah Berubah (dibanding dokumentasi lama)

1. **Kolom J bukan lagi "Profit per baris"** — sekarang "Lagi Promo" (menyimpan harga promo dari Katalog jika aktif)
2. **Kolom K "Profit / Baris" sudah ada** — formula `=(F{r}-IF(J{r}<>"";J{r};I{r}))*E{r}` sudah di-generate otomatis
3. **Rumus acuan user: `=(F2-IF(J2<>"";J2;I2))*E2`** sudah identik dengan kolom K aktual
4. **`ensureHeaders_()` sudah defines 12 kolom** (A-L), termasuk "Profit / Baris" (K) dan "Sumber" (L)
5. **Action `repushRiwayat`** sudah ada di `doPost()` — juga meng-generate formula I, J, K

### Rekomendasi untuk Fase 1 (Implementasi Snapshot)

Karena kolom I, J, K **sudah ada** dan **sudah di-generate sebagai formula**, task Fase 1 sebenarnya adalah:
1. **Menghapus** blok formula `setFormulas` di `simpanRiwayat` dan `repushRiwayat`
2. **Mengganti** dengan kalkulasi server-side (baca Katalog langsung, hitung value, tulis sebagai statis via `setValues`)
3. **Tidak perlu menambah kolom baru** — struktur Riwayat sudah lengkap

Data yang perlu dibaca dari Katalog (index array):
- `data[i][3]` = Harga Normal (kolom D Katalog)
- `data[i][4]` = Harga Promo (kolom E Katalog)
- `data[i][5]` = Harga Jual (kolom F Katalog) — sudah ada sebagai `item.hargaSatuan` di payload

---

*Report ini di-generate secara otomatis. Semua kutipan kode berasal dari `Apps-Script/code.gs.js` commit `a0dcbf4`.*
