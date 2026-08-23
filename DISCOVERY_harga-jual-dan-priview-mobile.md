# DISCOVERY: Harga Jual & Priview Mobile — MoroDuit

> **Tanggal:** 2026-08-23  
> **Scope:** MoroDuit/ — Investigasi total, READ-ONLY.  
> **Tujuan:** Pahami pola kalkulasi margin/harga jual di Google Sheet, alur data dari Input → Keranjang → Priview, dan bug CSS mobile pada card nota.

---

## 1. Struktur Google Sheet & Tab "Riwayat"

### 1.1 Semua Referensi Nama Sheet di `Apps-Script/code.gs.js`

| Fungsi | Sheet Name | Metode |
|--------|-----------|--------|
| `ensureHeaders_()` (baris ~4) | `"Katalog"` | `ss.getSheetByName("Katalog")` |
| `ensureHeaders_()` (baris ~27) | `"Riwayat"` | `ss.getSheetByName("Riwayat")` |
| `findProdukRow_()` (baris ~58) | Parameter `sheet` (dipanggil dengan sheet Katalog) | — |
| `generateNoNota_()` (baris ~67) | `"Riwayat"` | `ss.getSheetByName("Riwayat")` |
| `doGet()` → `getKatalog` (baris ~95) | `"Katalog"` | `ss.getSheetByName("Katalog")` |
| `doGet()` → `getKatalogFull` (baris ~112) | `"Katalog"` | `ss.getSheetByName("Katalog")` |
| `doGet()` → `getKatalogPerkenalan` (baris ~130) | `"Katalog"` | `ss.getSheetByName("Katalog")` |
| `doPost()` → `updateProduk` (baris ~157) | `"Katalog"` | `ss.getSheetByName("Katalog")` |
| `doPost()` → `simpanRiwayat` (baris ~193) | `"Riwayat"` | `ss.getSheetByName("Riwayat")` |

**Konsistensi:** Semua referensi sheet name menggunakan string literal `"Katalog"` dan `"Riwayat"` — tidak ada yang di-construct dinamis dari variabel. Konsisten di seluruh fungsi.

### 1.2 Konfirmasi Tab "Riwayat"

**YA, tab "Riwayat" ADA** di spreadsheet yang sama dengan Katalog. Dibuat/dijamin oleh `ensureHeaders_()`:

```javascript
// code.gs.js — ensureHeaders_(), sekitar baris 27–45
var riwayat = ss.getSheetByName("Riwayat");
if (!riwayat) {
  riwayat = ss.insertSheet("Riwayat");
}
if (riwayat.getLastRow() === 0) {
  riwayat.getRange(1, 1, 1, 8).setValues([[
    "No Nota", "Nama Pelanggan", "Tanggal", "Produk", "Qty",
    "Harga Satuan", "Subtotal", "Total Nota"
  ]]);
}
```

**Kolom Tab Riwayat (setelah auto-fill oleh `simpanRiwayat`):**

| Kolom | Index | Isi | Tipe |
|-------|-------|-----|------|
| A (1) | 0 | No Nota | Value (dari `generateNoNota_()`) |
| B (2) | 1 | Nama Pelanggan | Value (dari `body.namaPelanggan`) |
| C (3) | 2 | Tanggal | Value (dari `Utilities.formatDate()`) |
| D (4) | 3 | Produk | Value (dari `item.produk`) |
| E (5) | 4 | Qty | Value (dari `item.qty`) |
| F (6) | 5 | Harga Satuan | Value (dari `item.hargaSatuan` — **ini Harga Jual dari Katalog**) |
| G (7) | 6 | Subtotal | Value (dari `item.subtotal` — `hargaJual * qty`) |
| H (8) | 7 | Total Nota | Value (dari `body.total`) |
| **I (9)** | 8 | **Harga Normal** | **FORMULA LIVE** (VLOOKUP) |
| **J (10)** | 9 | **Profit per baris** | **FORMULA LIVE** (kalkulasi margin) |

### 1.3 Formula Kalkulasi Margin di Tab Riwayat (POLA ACUAN)

**Fungsi yang menulisnya:** `doPost()` → `action === "simpanRiwayat"`, di `code.gs.js`, sekitar baris 208–220.

```javascript
// code.gs.js — simpanRiwayat, baris ~208-220
// ── Auto-fill formula kolom I (Harga Normal) & J (Profit per baris) ──
// CATATAN: Pemisah argumen pakai koma (,) — konvensi API setFormulas()
// Apps Script, BUKAN locale sheet. User WAJIB verify setelah deploy manual
// apakah formula tampil benar (locale sheet tertentu bisa pakai titik koma).
var formulasI = [];
var formulasJ = [];
for (var f = 0; f < rows.length; f++) {
  var r = startRow + f;
  formulasI.push(["=IFERROR(VLOOKUP(D" + r + ";Katalog!$B:$D;3;FALSE);\"\")"]);
  formulasJ.push(["=IF(I" + r + "=\"\";\"\";G" + r + "-(I" + r + "*E" + r + "))"]);
}
sheet.getRange(startRow, 9, rows.length, 1).setFormulas(formulasI);
sheet.getRange(startRow, 10, rows.length, 1).setFormulas(formulasJ);
```

**Analisis Formula:**

- **Kolom I (Harga Normal):** `=IFERROR(VLOOKUP(D{row};Katalog!$B:$D;3;FALSE);"")`
  - Melakukan VLOOKUP Produk (kolom D Riwayat) ke range `Katalog!$B:$D`, mengambil kolom ke-3 dari range tersebut.
  - **PENTING:** Range `$B:$D` = kolom B (Produk), C (Kategori), D (Harga Normal) — artinya kolom ke-3 = **Harga Normal**. Ini benar HANYA JIKA Katalog kolom masih urutan asli (B=Produk, C=Kategori, D=Harga Normal).
  - **⚠️ POTENTIAL BUG:** Jika kolom Katalog sudah di-reorder (mis. Kategori dipindah ke posisi lain), formula VLOOKUP akan salah ambil kolom.

- **Kolom J (Profit per baris):** `=IF(I{row}="";"";G{row}-(I{row}*E{row}))`
  - Profit = Subtotal (G) − (Harga Normal × Qty)
  - Catatan: Harga Normal dari VLOOKUP dikalikan Qty, lalu dikurangkan dari Subtotal. **Ini menghitung margin berdasarkan Harga Normal, bukan Harga Jual.**

### 1.4 Kapan Margin Disimpan sebagai NILAI FINAL vs FORMULA

- **Kolom F (Harga Satuan)** dan **Kolom G (Subtotal)** disimpan sebagai **NILAI FINAL** (bukan formula) — langsung dari payload client:
  ```javascript
  // code.gs.js — simpanRiwayat, baris ~200-206
  rows.push([
    noNota,
    namaPelanggan,
    tanggal,
    item.produk,
    item.qty,
    item.hargaSatuan,  // ← VALUE, bukan formula
    item.subtotal,      // ← VALUE, bukan formula
    total               // ← VALUE, bukan formula
  ]);
  ```

- **Kolom I (Harga Normal)** dan **Kolom J (Profit)** disimpan sebagai **FORMULA LIVE** (VLOOKUP + kalkulasi) — menyesuaikan otomatis jika data Katalog berubah.

**Kesimpulan:** Tab Riwayat tidak menyimpan margin/harga jual sebagai nilai final tertulis — melainkan menggunakan formula live VLOOKUP. Pola ini bisa direplikasi untuk menghitung Harga Jual Katalog nantinya (mis. dengan formula yang mengambil Harga Normal + markup tertentu di kolom terpisah).

---

## 2. `doPost()` dan `doGet()` di `code.gs.js`

### 2.1 `doGet()` — Lengkap

```javascript
// code.gs.js — doGet(), baris ~85-147
function doGet(e) {
  ensureHeaders_();

  var action = e && e.parameter ? e.parameter.action : "";
  var token = e && e.parameter ? e.parameter.token : "";

  if (!validateToken_(token)) {
    return jsonResponse_({success: false, error: "unauthorized"});
  }

  // ── getKatalog ──
  if (action === "getKatalog") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Katalog");
    var data = sheet.getDataRange().getValues();
    var result = [];

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][6]).trim() === "Ada") {
        result.push({
          produk: String(data[i][1]).trim(),
          kategori: String(data[i][2] || ""),
          hargaJual: data[i][5],
          catatan: String(data[i][7] || "")
        });
      }
    }

    return jsonResponse_(result);
  }

  // ── getKatalogFull ──
  if (action === "getKatalogFull") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Katalog");
    var data = sheet.getDataRange().getValues();
    var result = [];

    for (var i = 1; i < data.length; i++) {
      result.push({
        produk: String(data[i][1]).trim(),
        kategori: String(data[i][2] || ""),
        hargaNormal: data[i][3],
        hargaPromo: data[i][4],
        hargaJual: data[i][5],
        status: String(data[i][6]).trim(),
        catatan: String(data[i][7] || "")
      });
    }

    return jsonResponse_(result);
  }

  // ── getKatalogPerkenalan ──
  // Filter produk yang ditandai "Perkenalan" di kolom J (index 9)
  // DAN status "Ada" di kolom G (index 6).
  if (action === "getKatalogPerkenalan") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Katalog");
    var data = sheet.getDataRange().getValues();
    var result = [];

    for (var i = 1; i < data.length; i++) {
      // Kolom J (index 9) mungkin belum ada — defensif
      var tandai = data[i].length > 9 ? String(data[i][9] || "").trim() : "";
      var status = String(data[i][6]).trim();
      if (tandai === "Perkenalan" && status === "Ada") {
        result.push({
          produk: String(data[i][1]).trim(),
          kategori: String(data[i][2] || ""),
          hargaJual: data[i][5],
          catatan: String(data[i][7] || "")
        });
      }
    }

    return jsonResponse_(result);
  }

  return jsonResponse_({success: false, error: "unknown action"});
}
```

### 2.2 `doPost()` — Lengkap

```javascript
// code.gs.js — doPost(), baris ~153-232
function doPost(e) {
  ensureHeaders_();

  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse_({success: false, error: "invalid JSON body"});
  }

  var token = body.token || "";
  if (!validateToken_(token)) {
    return jsonResponse_({success: false, error: "unauthorized"});
  }

  var action = body.action || "";

  // ── updateProduk ──
  if (action === "updateProduk") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Katalog");

    var produk = String(body.produk || "").trim();
    if (!produk) {
      return jsonResponse_({success: false, error: "produk wajib diisi"});
    }

    var hargaNormal = body.hargaNormal;
    if (hargaNormal === undefined || hargaNormal === null) {
      return jsonResponse_({success: false, error: "hargaNormal wajib diisi"});
    }

    var hargaPromo = body.hargaPromo || "";
    var hargaJual = (body.hargaJual !== undefined && body.hargaJual !== "")
      ? body.hargaJual
      : hargaNormal;
    var catatan = body.catatan || "";
    var status = body.status || "Ada";
    var timestamp = new Date();

    var row = findProdukRow_(sheet, produk);
    var kategori = String(body.kategori || "").trim();
    var kategoriList = [
      "Kopi", "Minuman Manis", "Bumbu Dapur", "Mie Instan",
      "Perawatan Diri", "Obat Nyamuk", "Tisu", "Susu", "Roti", "Sabun"
    ];
    if (!kategori) {
      return jsonResponse_({success: false, error: "kategori wajib diisi"});
    }
    if (kategoriList.indexOf(kategori) === -1) {
      return jsonResponse_({success: false, error: "kategori tidak valid, harus salah satu dari: " + kategoriList.join(", ")});
    }

    var rowData = [timestamp, produk, kategori, hargaNormal, hargaPromo, hargaJual, status, catatan];

    if (row > 0) {
      sheet.getRange(row, 1, 1, 8).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }

    return jsonResponse_({success: true});
  }

  // ── simpanRiwayat ──
  if (action === "simpanRiwayat") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Riwayat");

    var items = body.items || [];
    var total = body.total;
    var namaPelanggan = body.namaPelanggan || "";

    if (items.length === 0) {
      return jsonResponse_({success: false, error: "items tidak boleh kosong"});
    }

    var noNota = generateNoNota_();
    var tanggal = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");

    var rows = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      rows.push([
        noNota,
        namaPelanggan,
        tanggal,
        item.produk,
        item.qty,
        item.hargaSatuan,
        item.subtotal,
        total
      ]);
    }

    if (rows.length > 0) {
      var startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rows.length, 8).setValues(rows);

      // ── Auto-fill formula kolom I (Harga Normal) & J (Profit per baris) ──
      var formulasI = [];
      var formulasJ = [];
      for (var f = 0; f < rows.length; f++) {
        var r = startRow + f;
        formulasI.push(["=IFERROR(VLOOKUP(D" + r + ";Katalog!$B:$D;3;FALSE);\"\")"]);
        formulasJ.push(["=IF(I" + r + "=\"\";\"\";G" + r + "-(I" + r + "*E" + r + "))"]);
      }
      sheet.getRange(startRow, 9, rows.length, 1).setFormulas(formulasI);
      sheet.getRange(startRow, 10, rows.length, 1).setFormulas(formulasJ);
    }

    return jsonResponse_({success: true, noNota: noNota, tanggal: tanggal});
  }

  return jsonResponse_({success: false, error: "unknown action"});
}
```

### 2.3 Kolom Katalog — Harga Normal vs Harga Jual vs Formula

**Struktur kolom Katalog (setelah `ensureHeaders_()`):**

| Kolom | Header | Index | Keterangan |
|-------|--------|-------|------------|
| A (1) | Timestamp | 0 | Waktu update terakhir |
| B (2) | Produk | 1 | Nama produk (unique key) |
| C (3) | Kategori | 2 | Kategori produk |
| D (4) | Harga Normal | 3 | Harga modal/beli |
| E (5) | Harga Promo | 4 | Harga promo (opsional) |
| F (6) | Harga Jual | 5 | **Harga yang dilihat pelanggan — disimpan sebagai NILAI, bukan formula** |
| G (7) | Status | 6 | "Ada" / "Tidak Ada" |
| H (8) | Catatan | 7 | Keterangan tambahan |

**Temuan Kritis:** Kolom "Harga Jual" (kolom F, index 5) di sheet Katalog saat ini **BUKAN formula live** — melainkan **nilai final** yang ditulis langsung dari client-side via `updateProduk`. Tidak ada formula otomatis yang menghitung Harga Jual dari Harga Normal + margin. Client mengirim `hargaJual` langsung (atau default ke `hargaNormal` jika kosong):

```javascript
// code.gs.js — updateProduk, baris ~177-179
var hargaJual = (body.hargaJual !== undefined && body.hargaJual !== "")
  ? body.hargaJual
  : hargaNormal;
```

### 2.4 Ringkasan Alur Data

```
Input/script.js                    code.gs.js                    Google Sheet
──────────────                    ──────────                    ────────────
loadProdukList() ──GET──→ getKatalogFull ──READ──→ Katalog (all rows)
renderProdukList() ←───── response with hargaNormal, hargaJual, etc.

submit form ──POST──→ updateProduk ──WRITE──→ Katalog (row更新/append)
                       hargaJual = value dari form

Keranjang-Duit/script.js
loadKatalog() ──GET──→ getKatalog ──READ──→ Katalog (status=Ada only)
                      (returns produk, kategori, hargaJual, catatan)

checkout ──sessionStorage──→ Priview/script.js
renderNota() ←── items with hargaSatuan (=hargaJual)

printBtn click ──POST──→ simpanRiwayat ──WRITE──→ Riwayat (8 cols value)
                                               ──FORMULA──→ Kolom I: VLOOKUP (Harga Normal)
                                               ──FORMULA──→ Kolom J: Profit calc
```

---

## 3. `Input/script.js` — `loadProdukList()` dan `renderProdukList()`

### 3.1 `loadProdukList()` (alias "loadKatalog" di Input page)

> **Catatan:** Fungsi di `Input/script.js` bernama `loadProdukList()`, bukan `loadKatalog()`. Fungsi `loadKatalog()` ada di `Keranjang-Duit/script.js`.

```javascript
// Input/script.js — loadProdukList(), sekitar baris 98-130
function loadProdukList() {
  loadingIndicator.style.display = "block";

  var url = MORODUIT_CONFIG.APPS_SCRIPT_URL
    + "?action=getKatalogFull"
    + "&token=" + encodeURIComponent(MORODUIT_CONFIG.TOKEN);

  fetch(url)
    .then(function (res) { return res.json(); })
    .then(function (data) {
      loadingIndicator.style.display = "none";
      if (Array.isArray(data)) {
        produkData = data;

        // Sort produk A-Z berdasarkan nama (case-insensitive)
        produkData.sort(function (a, b) {
          var namaA = (a.produk || "").toLowerCase();
          var namaB = (b.produk || "").toLowerCase();
          return namaA.localeCompare(namaB, "id");
        });

        populateKategoriFilter();
      }
      renderProdukList(data);
    })
    .catch(function (err) {
      loadingIndicator.style.display = "none";
      produkList.innerHTML = '<div class="empty-state">Gagal memuat data. Coba muat ulang halaman.</div>';
      console.error("Gagal fetch katalog:", err);
    });
}
```

**Endpoint yang dipanggil:** `getKatalogFull` — mengembalikan SEMUA produk (tanpa filter status "Ada").

### 3.2 `renderProdukList()`

```javascript
// Input/script.js — renderProdukList(), sekitar baris 132-178
function renderProdukList(produkArray) {
  if (!produkArray || produkArray.length === 0) {
    produkList.innerHTML = '<div class="empty-state">Belum ada produk. Silakan tambah produk baru!</div>';
    return;
  }

  var html = "";
  for (var i = 0; i < produkArray.length; i++) {
    var p = produkArray[i];
    var statusClass = p.status === "Ada" ? "ada" : "tidak-ada";
    var statusLabel = p.status === "Ada" ? "Stok Ada" : "Stok Habis";
    var hargaFormatted = formatRupiah(p.hargaJual);

    html += '<div class="produk-item" role="listitem" tabindex="0" '
          + 'data-produk="' + escapeHtml(p.produk) + '" '
          + 'data-kategori="' + escapeHtml(p.kategori || "") + '" '
          + 'data-harga-normal="' + p.hargaNormal + '" '
          + 'data-harga-promo="' + (p.hargaPromo || "") + '" '
          + 'data-harga-jual="' + p.hargaJual + '" '
          + 'data-status="' + escapeHtml(p.status) + '" '
          + 'data-catatan="' + escapeHtml(p.catatan) + '">'
          + '<span class="produk-name">' + escapeHtml(p.produk) + '</span>'
          + '<span class="produk-kategori">' + escapeHtml(p.kategori || "-") + '</span>'
          + '<span class="produk-status ' + statusClass + '">' + statusLabel + '</span>'
          + '<span class="produk-price">' + hargaFormatted + '</span>'
          + '</div>';
  }

  produkList.innerHTML = html;

  // Attach click handlers
  var items = produkList.querySelectorAll(".produk-item");
  for (var j = 0; j < items.length; j++) {
    items[j].addEventListener("click", handleProdukClick);
  }
}
```

### 3.3 Field yang Ditampilkan di Daftar Produk Input

**Yang ditampilkan:** `hargaJual` — ditampilkan via `formatRupiah(p.hargaJual)` di `<span class="produk-price">`.

**Yang tersimpan di data attributes:** Semua field tersedia:
- `data-harga-normal` → `p.hargaNormal`
- `data-harga-promo` → `p.hargaPromo`
- `data-harga-jual` → `p.hargaJual`

**Konfirmasi:** Halaman Input sudah menampilkan **Harga Jual** (bukan Harga Normal) di daftar produk. Saat produk diklik, semua field (termasuk Harga Normal dan Harga Promo) di-prefill ke form untuk editing.

---

## 4. `Keranjang-Duit/script.js` — Harga di Daftar Keranjang

### 4.1 `loadKatalog()` — Menggunakan endpoint `getKatalog`

```javascript
// Keranjang-Duit/script.js — loadKatalog(), sekitar baris 87-124
function loadKatalog() {
  loadingIndicator.style.display = "block";
  produkList.innerHTML = "";

  var url = MORODUIT_CONFIG.APPS_SCRIPT_URL
    + "?action=getKatalog"
    + "&token=" + encodeURIComponent(MORODUIT_CONFIG.TOKEN);

  fetch(url)
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      loadingIndicator.style.display = "none";

      if (!Array.isArray(data)) {
        showStatus("❌ Gagal memuat produk. Data tidak valid.", "error");
        return;
      }

      if (data.length === 0) {
        produkList.innerHTML = '<div class="empty-state">Belum ada produk tersedia.</div>';
        return;
      }

      hideStatus();
      produkData = data;

      // Sort produk A-Z berdasarkan nama (case-insensitive)
      produkData.sort(function (a, b) {
        var namaA = (a.produk || "").toLowerCase();
        var namaB = (b.produk || "").toLowerCase();
        return namaA.localeCompare(namaB, "id");
      });

      populateKategoriFilter();
      renderProdukList(data);
    })
    .catch(function (err) {
      loadingIndicator.style.display = "none";
      showStatus("❌ Gagal menghubungi server. Periksa koneksi internet.", "error");
      console.error("Fetch error:", err);
    });
}
```

**Endpoint:** `getKatalog` (bukan `getKatalogFull`) — hanya mengembalikan produk dengan `status === "Ada"`, dan field: `produk`, `kategori`, `hargaJual`, `catatan`. **TIDAK ada `hargaNormal`** dalam response.

### 4.2 `renderProdukList()` — Harga yang Ditampilkan

```javascript
// Keranjang-Duit/script.js — renderProdukList(), baris ~134 (dalam loop render)
html += '<div class="produk-card" data-index="' + idx + '">'
      + '  <div class="checkbox-wrapper">'
      + '    <input type="checkbox" id="chk_' + idx + '" '
      + '           data-index="' + idx + '">'
      + '    <label class="checkbox-custom" for="chk_' + idx + '"></label>'
      + '  </div>'
      + '  <div class="produk-info">'
      + '    <div class="produk-name">' + escapeHtml(p.produk) + '</div>'
      + '  </div>'
      + '  <div class="produk-harga">' + formatRupiah(p.hargaJual) + '</div>'
      + '  <div class="qty-wrapper">'
      + '    <input type="number" id="qty_' + idx + '" '
      + '           data-index="' + idx + '" '
      + '           min="1" max="999" value="1" disabled>'
      + '    <span class="qty-label">pcs</span>'
      + '  </div>'
      + '</div>';
```

### 4.3 `updateTotal()` dan `checkout()`

```javascript
// Keranjang-Duit/script.js — updateTotal(), baris ~194-207
function updateTotal() {
  var total = 0;

  for (var i = 0; i < produkData.length; i++) {
    var st = produkState[i];
    if (st && st.checked) {
      var harga = Number(produkData[i].hargaJual);
      var qty = st.qty;
      if (isNaN(qty) || qty < 1) qty = 1;
      total += harga * qty;
    }
  }

  totalValue.textContent = formatRupiah(total);
  checkoutBtn.disabled = (total === 0);
}
```

```javascript
// Keranjang-Duit/script.js — checkout handler, baris ~212-248
checkoutBtn.addEventListener("click", function () {
  saveState();
  var items = [];

  for (var i = 0; i < produkData.length; i++) {
    var st = produkState[i];
    if (st && st.checked) {
      var hargaJual = Number(produkData[i].hargaJual);
      var qty = st.qty;
      if (isNaN(qty) || qty < 1) qty = 1;

      items.push({
        produk: produkData[i].produk,
        qty: qty,
        hargaSatuan: hargaJual,      // ← hargaJual dari Katalog
        subtotal: hargaJual * qty     // ← hargaJual * qty
      });
    }
  }

  // ... save to sessionStorage, redirect to Priview
});
```

**Konfirmasi:** Keranjang-Duit **sudah menggunakan `hargaJual`** di semua tempat:
- Display harga produk: `formatRupiah(p.hargaJual)` ✓
- Perhitungan total: `Number(produkData[i].hargaJual)` ✓
- Data checkout ke Priview: `hargaSatuan: hargaJual` ✓

**User benar** — field yang dipakai di Keranjang sudah Harga Jual.

---

## 5. `Keranjang-Duit/Priview/` — Fitur "Kirim Pesanan" + Bug Mobile CSS

### 5.1 Struktur HTML Card Nota

```html
<!-- Keranjang-Duit/Priview/index.html -->
<div id="notaContainer" class="nota-container hidden">
  <div class="nota" id="nota">
    <!-- Nota Header -->
    <div class="nota-header">
      <h1 class="nota-toko">Toko Sembako Online Moro Duit</h1>
      <div class="nota-meta">
        <div class="nota-row">
          <span class="nota-label">Nama Pelanggan:</span>
          <span class="nota-value" id="namaPelanggan">-</span>
        </div>
        <div class="nota-row">
          <span class="nota-label">Tanggal:</span>
          <span class="nota-value" id="tanggal">—</span>
        </div>
      </div>
    </div>

    <!-- Nota Items -->
    <table class="nota-table">
      <thead>
        <tr>
          <th class="col-no">No</th>
          <th class="col-produk">Produk</th>
          <th class="col-qty">Qty</th>
          <th class="col-harga">Harga Satuan</th>
          <th class="col-subtotal">Subtotal</th>
        </tr>
      </thead>
      <tbody id="notaItems"></tbody>
      <tfoot>
        <tr>
          <td colspan="4" class="total-label">Total Nota</td>
          <td class="total-value" id="totalValue">Rp 0</td>
        </tr>
      </tfoot>
    </table>

    <!-- Nota Footer -->
    <div class="nota-footer">
      <p>Terima kasih sudah belanja di Moro Duit! 🙏</p>
    </div>
  </div>

  <!-- Action buttons -->
  <div class="nota-actions" id="notaActions">
    <button id="printBtn" class="btn btn-primary">
      🛒 Kirim Pesanan
    </button>
    <button id="batalBtn" class="btn btn-secondary">
      ❌ Batal / Kembali
    </button>
  </div>
</div>
```

### 5.2 Fitur Tombol "Kirim Pesanan" — `printBtn` click handler

```javascript
// Keranjang-Duit/Priview/script.js — printBtn handler, baris ~93-150
printBtn.addEventListener("click", function () {
  // Disable button (prevent double-click)
  printBtn.disabled = true;
  printBtn.textContent = "⏳ Menyimpan & Mengirim...";

  var notaEl = document.getElementById("nota");
  var savedShadow = notaEl.style.boxShadow;
  notaEl.style.boxShadow = "none";

  // Step 1: Capture PNG SYNCHRONOUSLY in user-gesture context
  // (avoids popup-blocker for downstream download + wa.me redirect)
  html2canvas(notaEl).then(function (canvas) {
    notaEl.style.boxShadow = savedShadow;

    // Generate data URL while still in gesture context
    var dataURL = canvas.toDataURL("image/png");

    // Step 2: POST simpanRiwayat — payload, timing, logic UNCHANGED
    var payload = {
      action: "simpanRiwayat",
      token: MORODUIT_CONFIG.TOKEN,
      items: keranjangData.items,
      total: keranjangData.total,
      namaPelanggan: keranjangData.namaPelanggan || ""
    };

    fetch(MORODUIT_CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json(); })
      .then(function (response) {
        if (response.success && response.tanggal) {
          // Update display with real Tanggal
          tanggalEl.textContent = response.tanggal;

          // Remove from sessionStorage (prevent double-submit)
          sessionStorage.removeItem("moroduit_keranjang");

          // Step 3a: Auto-download PNG to device
          var safeNoNota = response.noNota
            ? String(response.noNota).replace(/[^A-Za-z0-9_-]/g, "-")
            : null;
          var filename = safeNoNota
            ? "nota-" + safeNoNota + ".png"
            : "nota.png";
          var a = document.createElement("a");
          a.href = dataURL;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          // Step 3b: Redirect to WhatsApp (location.href = same tab, no popup blocker)
          var noWA = MORODUIT_CONFIG.NOMOR_WA_TOKO.replace(/[^0-9]/g, "");
          var totalFormatted = formatRupiah(keranjangData.total);
          var ringkasan = "No Nota: " + (response.noNota || "-")
            + ", Total: " + totalFormatted
            + ". Mohon lampirkan foto nota yang baru terunduh.";
          location.href = "https://wa.me/" + noWA
            + "?text=" + encodeURIComponent(ringkasan);
        } else {
          // Server returned failure
          handlePrintError(response.error || "Gagal menyimpan nota");
        }
      })
      .catch(function (err) {
        handlePrintError("Gagal menghubungi server. Periksa koneksi internet.");
        console.error("Print fetch error:", err);
      });

  }).catch(function (err) {
    notaEl.style.boxShadow = savedShadow;
    console.error("html2canvas render failed:", err);
    handlePrintError("Gagal membuat screenshot nota.");
  });
});
```

**Alur "Kirim Pesanan":**
1. **Screenshot** — `html2canvas(notaEl)` → generate PNG data URL
2. **Simpan ke Sheet** — POST `simpanRiwayat` ke `code.gs.js` → tulis ke tab Riwayat + auto-fill formula kolom I & J
3. **Download PNG** — Auto-download file `nota-{noNota}.png` ke device
4. **Redirect WhatsApp** — `location.href` ke `wa.me/{nomorToko}` dengan pesan ringkasan (No Nota + Total)

### 5.3 Bug CSS Mobile — Teks Nota Keluar dari Batas Card

**CSS Terkait (Priview/style.css):**

```css
/* ── Nota Table ────────────────────────────────────────────────── */
.nota-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1.5rem;
}

.nota-table td {
  padding: 0.75rem 1rem;
  font-size: 1.125rem;
  border-bottom: 1px solid #e0e0e0;
  overflow-wrap: anywhere;
  word-break: normal;
}

.nota-table td.col-produk {
  word-break: normal;
  overflow-wrap: anywhere;
}

.nota-table td.col-qty,
.nota-table td.col-harga,
.nota-table td.col-subtotal {
  text-align: right;
  white-space: nowrap;          /* ← KUNCI: mencegah wrap angka */
}

/* ── Mobile: hide subtotal column to save space ───────────────── */
@media (max-width: 520px) {
  .nota-table th.col-subtotal,
  .nota-table td.col-subtotal {
    display: none;
  }

  .nota-table th,
  .nota-table td {
    padding: 0.5rem 0.5rem;
    font-size: 1rem;
  }

  .nota {
    padding: 1rem;
  }
}
```

```css
/* ── Nota Container (outer) ──────────────────────────────────── */
.nota {
  background-color: #ffffff;
  border: 2px solid #2e7d32;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* ── Main ────────────────────────────────────────────────────── */
main {
  max-width: 700px;
  margin: 0 auto;
}

body {
  padding: 1rem;
}
```

**Analisis Bug Mobile (iPhone/Chrome):**

1. **Root Cause: `white-space: nowrap` pada kolom harga/subtotal** — kolom `.col-harga` dan `.col-subtotal` memiliki `white-space: nowrap`, yang memaksa angka (mis. `Rp 125.000`) tetap satu baris. Di layar sempit (< 520px), kolom-kolom ini bisa memaksa tabel melebihi lebar container.

2. **Media query `max-width: 520px` hanya menyembunyikan kolom Subtotal** — kolom Harga Satuan (`.col-harga`) masih ditampilkan dengan `white-space: nowrap`. Jika nama produk panjang + harga satuan, tabel bisa overflow.

3. **Tidak ada `overflow` / `overflow-x` pada `.nota` atau `main`** — card nota tidak memiliki `overflow: hidden` atau `overflow-x: auto`, sehingga konten tabel yang overflow akan muncul di luar batas card (terlihat keluar dari card).

4. **`word-break: normal` + `overflow-wrap: anywhere` pada kolom produk** — ini seharusnya membantu wrap nama panjang, tapi jika kolom harga/subtotal sudah memakan banyak lebar, sisa lebar untuk kolom produk menjadi sangat sempit.

**Rekomendasi Perbaikan (READ-ONLY — untuk referensi desain berikutnya):**
- Tambahkan `overflow-x: auto` pada `.nota` atau `main` sebagai fallback
- Pertimbangkan sembunyikan kolom Harga Satuan di mobile (< 400px), tampilkan Qty × Harga dalam format ringkas
- Atau gunakan `table-layout: fixed` + `width: 100%` agar browser secara otomatis distribute lebar kolom
- Tambahkan `overflow-wrap: break-word` (atau `anywhere`) pada `.nota-table` sebagai container

---

## 6. `config.js`

```javascript
// MoroDuit/config.js — lengkap
var MORODUIT_CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyGB00xA83gUvvzs5KVjspYEJ0e60lTLQovxm_Ec5Uq5XZN_1G8mXyt-OEcE7zVB7Yw/exec",
  TOKEN: "c47f9fb4af7826203f70ff7812976ce7f0eb83f04097961a",
  NOMOR_WA_TOKO: "6283156569954"
};
```

**Konfirmasi:**
- **Spreadsheet ID** tidak ada di `config.js` secara eksplisit — Spreadsheet diakses via `SpreadsheetApp.getActiveSpreadsheet()` di Apps-Script (ide spreadsheet di-bind ke Apps Script project, bukan di-hardcode di config).
- **Apps Script URL** sudah ada — endpoint deployed GAS.
- **Token** = `c47f9fb4af7826203f70ff7812976ce7f0eb83f04097961a` — konsisten dengan `TOKEN` di `code.gs.js`.
- **Nomor WA Toko** = `6283156569954` — dipakai di Priview untuk redirect WhatsApp.

---

## Ringkasan Temuan Kunci

1. **Tab "Riwayat" ADA** di spreadsheet yang sama dengan Katalog — dibuat otomatis oleh `ensureHeaders_()` di `code.gs.js`. Kolom: No Nota, Nama Pelanggan, Tanggal, Produk, Qty, Harga Satuan, Subtotal, Total Nota + 2 kolom formula (Harga Normal via VLOOKUP, Profit per baris).

2. **Formula VLOOKUP di Riwayat** = `=IFERROR(VLOOKUP(D{row};Katalog!$B:$D;3;FALSE);"")` — mengambil Harga Normal dari Katalog berdasarkan nama Produk. Range `$B:$D` = Produk(B), Kategori(C), Harga Normal(D). **⚠️ Rentan bug jika kolom Katalog di-reorder.**

3. **Profit per baris** = `Subtotal − (Harga Normal × Qty)` — menghitung margin berdasarkan Harga Normal, bukan Harga Jual. Formula ini live, bukan nilai final.

4. **Kolom "Harga Jual" di Katalog = NILAI FINAL**, bukan formula. Ditulis langsung dari client-side via `updateProduk`. Default ke `hargaNormal` jika kosong.

5. **Input/script.js menampilkan `hargaJual`** di daftar produk. Endpoint yang dipakai: `getKatalogFull` (semua produk, semua field).

6. **Keranjang-Duit/script.js sudah benar** — menggunakan `hargaJual` untuk display harga, kalkulasi total, dan data checkout ke Priview. Endpoint: `getKatalog` (hanya status=Ada).

7. **Priview "Kirim Pesanan"** = html2canvas screenshot → POST `simpanRiwayat` → auto-download PNG → redirect WhatsApp. Alur sudah berfungsi dengan benar.

8. **Bug mobile CSS**: `white-space: nowrap` pada kolom harga/subtotal + tidak ada `overflow` pada card nota = teks/angka keluar dari batas card di layar sempit (iPhone). Media query 520px hanya sembunyikan kolom Subtotal, kolom Harga Satuan masih ditampilkan dengan nowrap.

9. **Tidak ditemukan pola kalkulasi margin otomatis di Katalog** — tidak ada formula atau backend logic yang otomatis menghitung Harga Jual dari Harga Normal + markup. Harga Jual diinput manual di form Input.

10. **Konsistensi sheet name**: Semua referensi `"Katalog"` dan `"Riwayat"` konsisten di semua fungsi (doGet, doPost, helpers). Tidak ada string yang di-construct dinamis dari variabel.

---

## Pertanyaan & Jawaban (jika ada ask_user)

> Tidak ada pertanyaan yang diajukan selama investigasi ini. Semua data tersedia dari pembacaan kode statis.

---

*Report ini dihasilkan oleh Freebuff (Buffy) — READ-ONLY investigation, tidak ada file kode yang diubah.*
