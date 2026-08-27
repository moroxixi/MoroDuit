var TOKEN = "c47f9fb4af7826203f70ff7812976ce7f0eb83f04097961a";

// ── Helper: Pastikan tab & header ada ──────────────────────────────────
function ensureHeaders_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Tab Katalog
  var katalog = ss.getSheetByName("Katalog");
  if (!katalog) {
    katalog = ss.insertSheet("Katalog");
  }
  if (katalog.getLastRow() === 0) {
    katalog.getRange(1, 1, 1, 8).setValues([["Timestamp", "Produk", "Kategori", "Harga Normal",
      "Harga Promo", "Harga Jual", "Status", "Catatan"
    ]]);
  } else {
    // Idempotent: tambah kolom "Kategori" kalau belum ada
    var headers = katalog.getRange(1, 1, 1, katalog.getLastColumn()).getValues()[0];
    var hasKategori = false;
    for (var h = 0; h < headers.length; h++) {
      if (String(headers[h]).trim().toLowerCase() === "kategori") {
        hasKategori = true;
        break;
      }
    }
    if (!hasKategori) {
      katalog.insertColumnBefore(3);
      katalog.getRange(1, 3).setValue("Kategori");
    }
  }

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
}

// ── Helper: Pastikan tab "Katalog-Surya" & header ada ────────────────
// Tab baru untuk Database Surya (harga referensi pasar dari nota Surya Toserba).
function ensureKatalogSuryaHeaders_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Katalog-Surya");
  if (!sheet) {
    sheet = ss.insertSheet("Katalog-Surya");
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 4).setValues([["Tanggal Scan", "Nama Produk", "Harga Satuan", "Status"]]);
  }
}

// ── Helper: Validasi token ────────────────────────────────────────────
function validateToken_(token) {
  return token === TOKEN;
}

// ── Helper: Cari baris Produk di Katalog ──────────────────────────────
// Mengembalikan nomor baris (1-indexed) atau -1 jika tidak ketemu
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

// ── Helper: Cari baris Riwayat berdasarkan No Nota ─────────────────────
// Mengembalikan array nomor baris (1-indexed), kosong [] jika tidak ketemu.
// PERHATIAN: operasi ini mendukung repushRiwayat — JANGAN panggil dari
// fungsi yang tidak memerlukan pencarian baris Riwayat.
function findRiwayatRows_(sheet, noNota) {
  var data = sheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === noNota) {
      rows.push(i + 1); // 1-indexed
    }
  }
  return rows;
}

// ── Helper: Generate No Nota ──────────────────────────────────────────
// Format: MD-YYYYMMDD-XXX (timezone WIB / Asia/Jakarta)
function generateNoNota_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var riwayat = ss.getSheetByName("Riwayat");

  var now = new Date();
  var ymd = Utilities.formatDate(now, "Asia/Jakarta", "yyyyMMdd");

  // Hitung jumlah No Nota unik untuk tanggal ini
  var count = 0;
  if (riwayat.getLastRow() > 1) {
    var allNota = riwayat.getRange(2, 1, riwayat.getLastRow() - 1, 1).getValues();
    var prefix = "MD-" + ymd + "-";
    var seen = {};
    for (var i = 0; i < allNota.length; i++) {
      var val = String(allNota[i][0]);
      if (val.indexOf(prefix) === 0 && !seen[val]) {
        seen[val] = true;
        count++;
      }
    }
  }

  var seq = count + 1;
  var seqStr = ("00" + seq).slice(-3);
  return "MD-" + ymd + "-" + seqStr;
}

// ── Helper: JSON response ─────────────────────────────────────────────
function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════════════════════════════════════════════════════════
// GET ENDPOINT
// ══════════════════════════════════════════════════════════════════════
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

    // Cari indeks kolom "FotoPath" dari header (defensif — kolom mungkin belum ada)
    var headers = data.length > 0 ? data[0] : [];
    var fotoPathIdx = -1;
    for (var h = 0; h < headers.length; h++) {
      if (String(headers[h]).trim().toLowerCase() === "fotopath") {
        fotoPathIdx = h;
        break;
      }
    }

    for (var i = 1; i < data.length; i++) {
      var fotoPath = fotoPathIdx >= 0 && fotoPathIdx < data[i].length ? String(data[i][fotoPathIdx] || "").trim() : "";
      result.push({
        produk: String(data[i][1]).trim(),
        kategori: String(data[i][2] || ""),
        hargaNormal: data[i][3],
        hargaPromo: data[i][4],
        hargaJual: data[i][5],
        status: String(data[i][6]).trim(),
        catatan: String(data[i][7] || ""),
        fotoPath: fotoPath
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

    // Cari indeks kolom "FotoPath" dari header (defensif — kolom mungkin belum ada)
    var headers = data.length > 0 ? data[0] : [];
    var fotoPathIdx = -1;
    for (var h = 0; h < headers.length; h++) {
      if (String(headers[h]).trim().toLowerCase() === "fotopath") {
        fotoPathIdx = h;
        break;
      }
    }

    for (var i = 1; i < data.length; i++) {
      // Kolom J (index 9) mungkin belum ada — defensif
      var tandai = data[i].length > 9 ? String(data[i][9] || "").trim() : "";
      var status = String(data[i][6]).trim();
      if (tandai === "Perkenalan" && status === "Ada") {
        var fotoPath = fotoPathIdx >= 0 && fotoPathIdx < data[i].length ? String(data[i][fotoPathIdx] || "").trim() : "";
        result.push({
          produk: String(data[i][1]).trim(),
          kategori: String(data[i][2] || ""),
          hargaJual: data[i][5],
          catatan: String(data[i][7] || ""),
          fotoPath: fotoPath
        });
      }
    }

    return jsonResponse_(result);
  }

  // ── getRiwayat ──
  // Ambil SEMUA baris dari sheet "Riwayat" (skip header row 1).
  // Return array of object per baris: { noNota, namaPelanggan, tanggal,
  //   produk, qty, hargaSatuan, subtotal, total, profitBaris }.
  // Field "total" = kolom H "Total Nota" (sama untuk semua baris 1 nota).
  // Field "profitBaris" = kolom K "Profit / Baris" (snapshot value per item).
  // Grouping by noNota dilakukan di client (Riwayat/script.js).
  if (action === "getRiwayat") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Riwayat");
    var data = sheet.getDataRange().getValues();
    var result = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      // Skip baris kosong (semua cell kosong)
      if (!row[0] && !row[3]) continue;
      result.push({
        noNota: String(row[0] || ""),
        namaPelanggan: String(row[1] || ""),
        tanggal: String(row[2] || ""),
        produk: String(row[3] || ""),
        qty: row[4],
        hargaSatuan: row[5],
        subtotal: row[6],
        total: row[7],
        profitBaris: row[10]
      });
    }

    return jsonResponse_(result);
  }

  // ── getKatalogSurya ──
  // Return seluruh isi tab "Katalog-Surya" — dipakai populate dropdown "cocok"
  // dan referensi harga terakhir di frontend Database-Surya.
  if (action === "getKatalogSurya") {
    ensureKatalogSuryaHeaders_();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Katalog-Surya");
    var data = sheet.getDataRange().getValues();
    var result = [];

    for (var i = 1; i < data.length; i++) {
      // Skip baris kosong (semua cell kosong)
      if (!data[i][0] && !data[i][1]) continue;
      result.push({
        tanggalScan: String(data[i][0] || ""),
        namaProduk: String(data[i][1] || ""),
        hargaSatuan: data[i][2],
        status: String(data[i][3] || "")
      });
    }

    return jsonResponse_(result);
  }

  return jsonResponse_({success: false, error: "unknown action"});
}

// ── Helper: Gemini OCR Nota ─────────────────────────────────────────
var GEMINI_MODEL_NOTA_ = "gemini-3.5-flash";
var JUMLAH_API_KEY_NOTA_ = 6;

function getGeminiApiKeysNota_() {
  var props = PropertiesService.getScriptProperties();
  var keys = [];
  for (var i = 1; i <= JUMLAH_API_KEY_NOTA_; i++) {
    var k = props.getProperty("GEMINI_API_KEY_" + i);
    if (k) keys.push(k);
  }
  if (keys.length === 0) {
    throw new Error("Tidak ada GEMINI_API_KEY_1..." + JUMLAH_API_KEY_NOTA_ + " di Script Properties MoroDuit.");
  }
  return keys;
}

function callGeminiGenerateContentNota_(payload) {
  var keys = getGeminiApiKeysNota_();
  var lastError = null;
  for (var i = 0; i < keys.length; i++) {
    var url = "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL_NOTA_ + ":generateContent?key=" + keys[i];
    var res;
    try {
      res = UrlFetchApp.fetch(url, { method: "post", contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true });
    } catch (fetchErr) {
      lastError = "Key ke-" + (i + 1) + " gagal fetch: " + fetchErr;
      continue;
    }
    var code = res.getResponseCode();
    var text = res.getContentText();
    if (code === 200) return JSON.parse(text);
    var isRetryable = code === 429 || code === 503 || text.indexOf("high demand") !== -1 || text.indexOf("quota") !== -1 || text.indexOf("RESOURCE_EXHAUSTED") !== -1 || text.indexOf("UNAVAILABLE") !== -1;
    lastError = "Key ke-" + (i + 1) + " gagal (HTTP " + code + "): " + text;
    if (!isRetryable) throw new Error(lastError);
  }
  throw new Error("Semua " + keys.length + " API key Gemini gagal. Error terakhir: " + lastError);
}

function callGeminiOCRNota_(imageBase64, mimeType) {
  var prompt = "Ini foto nota belanja dari toko sembako MoroDuit. Format nota: ada baris 'Nama Pelanggan: ...' di header, " +
    "lalu tabel kolom No/Produk/Qty/Harga Satuan/Subtotal, lalu baris Total Nota di bawah. " +
    "Balas HANYA dengan JSON object (tanpa markdown, tanpa penjelasan), format persis: " +
    '{"namaPelanggan":"nama atau string kosong kalau tidak ada/tertulis -","items":[{"produk":"nama barang","qty":angka,"hargaSatuan":angka,"subtotal":angka}],"total":angka}. ' +
    "Semua angka = angka murni tanpa titik/koma/Rp. Kalau ada baris tidak jelas/tidak terbaca, lewati baris itu, jangan mengarang.";
  var payload = {
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: imageBase64 } }] }],
    generationConfig: { temperature: 0 }
  };
  var data = callGeminiGenerateContentNota_(payload);
  if (data.error) throw new Error("Gemini error: " + data.error.message);
  var text = data.candidates[0].content.parts[0].text.trim();
  text = text.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  var start = text.indexOf("{");
  var end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Gemini tidak mengembalikan JSON object yang valid.");
  return JSON.parse(text.substring(start, end + 1));
}

// ── Helper: Gemini OCR Nota Surya Toserba ─────────────────────────────
// Prompt dikustomisasi khusus format nota Surya Toserba: barcode + nama
// barang, kadang baris "( Harga PROMO )", lalu qty X harga_satuan subtotal.
// TIDAK reuse/modify callGeminiOCRNota_() existing.
function callGeminiOCRNotaSurya_(imageBase64, mimeType) {
  var prompt = "Ini foto nota belanja dari toko \"Surya Toserba\". " +
    "Format nota Surya Toserba: tiap item biasanya punya barcode di atas, lalu nama barang, " +
    "kadang ada baris \"( Harga PROMO )\" di bawah nama produk jika sedang promo, " +
    "lalu baris qty X harga_satuan subtotal. " +
    "Balas HANYA dengan JSON object (tanpa markdown, tanpa penjelasan), format persis: " +
    '{"items":[{"namaProduk":"nama barang","hargaSatuan":angka,"isPromo":true/false}]}. ' +
    "Harga satuan = harga PER UNIT (bukan subtotal). Semua angka = angka murni tanpa titik/koma/Rp. " +
    "Kalau ada baris tidak jelas/tidak terbaca, lewati baris itu, jangan mengarang. " +
    "Flag isPromo = true kalau item itu punya baris \"( Harga PROMO )\" menyertainya, false jika tidak.";
  var payload = {
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: imageBase64 } }] }],
    generationConfig: { temperature: 0 }
  };
  // Reuse callGeminiGenerateContentNota_() sebagai shared API helper (key rotation),
  // BUKAN memodifikasi fungsi OCR existing.
  var data = callGeminiGenerateContentNota_(payload);
  if (data.error) throw new Error("Gemini error: " + data.error.message);
  var text = data.candidates[0].content.parts[0].text.trim();
  text = text.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  var start = text.indexOf("{");
  var end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Gemini tidak mengembalikan JSON object yang valid.");
  return JSON.parse(text.substring(start, end + 1));
}

// ══════════════════════════════════════════════════════════════════════
// POST ENDPOINT
// ══════════════════════════════════════════════════════════════════════
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
    var catatan = body.catatan || "";
    var status = body.status || "Ada";
    var timestamp = new Date();

    var row = findProdukRow_(sheet, produk);
    var kategori = String(body.kategori || "").trim();
    var kategoriList = [
      "Bumbu Dapur", "Gula", "Kopi", "Mie Instan", "Minuman Serbuk/Sachet",
      "Minuman Siap Minum", "Obat Nyamuk", "Pembersih Rumah Tangga",
      "Perawatan Diri", "Perawatan Gigi", "Popok & Pembalut", "Roti",
      "Sabun Cuci/Deterjen Sachet", "Sabun Mandi & Shampoo Sachet",
      "Snack & Biskuit", "Suplemen", "Susu", "Tisu"
    ];
    if (!kategori) {
      return jsonResponse_({success: false, error: "kategori wajib diisi"});
    }
    if (kategoriList.indexOf(kategori) === -1) {
      return jsonResponse_({success: false, error: "kategori tidak valid, harus salah satu dari: " + kategoriList.join(", ")});
    }

    // ── Tentukan nomor baris (update existing ATAU baris baru) ──
    if (row < 0) {
      // Produk baru — tulis pakai getRange (bukan appendRow) agar
      // kita tahu pasti nomor barisnya untuk formula kolom F.
      row = sheet.getLastRow() + 1;
    }

    // ── Tulis kolom A-E (Timestamp, Produk, Kategori, Harga Normal, Harga Promo) ──
    sheet.getRange(row, 1, 1, 5).setValues([[
      timestamp, produk, kategori, hargaNormal, hargaPromo
    ]]);

    // ── Tulis kolom G-H (Status, Catatan) — SKIP kolom F (Harga Jual) ──
    sheet.getRange(row, 7, 1, 2).setValues([[status, catatan]]);

    // ── Kolom F (Harga Jual): formula auto-generate dari tabel margin K:L ──
    // Asumsi: tabel margin (Kategori → %) ada di range $K$2:$L$100
    // pada sheet Katalog yang SAMA. User WAJIB verifikasi manual saat deploy.
    // Kalau tabel margin ternyata di sheet lain, ganti $K$2:$L$100 jadi
    // NamaSheet!$K$2:$L$100.
    sheet.getRange(row, 6).setFormula(
      "=IFERROR(D" + row + "*(1+VLOOKUP(C" + row + ";$K$2:$L$100;2;FALSE));D" + row + ")"
    );

    // ── Kolom I (Profit per Item) ──
    sheet.getRange(row, 9).setFormula(
      "=F" + row + "-D" + row + ""
    );

    // ── Kolom M (Turun Berapa Persen -> Normal) ──
    sheet.getRange(row, 13).setFormula(
      "=IF(E" + row + "=\"\";\"\";(E" + row + "-D" + row + ")/D" + row + ")"
    );

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

      // ── Snapshot value kolom I (Harga Normal), J (Lagi Promo), K (Profit / Baris) ──
      // Dihitung sekali saat disimpan — data historis tidak berubah walau Katalog diupdate.
      var katalogSheet = ss.getSheetByName("Katalog");
      var valuesI = [];
      var valuesJ = [];
      var valuesK = [];
      for (var f = 0; f < rows.length; f++) {
        var produkName = rows[f][3];
        var qty = rows[f][4];
        var hargaSatuan = rows[f][5];
        var katalogRow = findProdukRow_(katalogSheet, produkName);

        var hargaNormal = "";
        var lagiPromo = "";
        var profitBaris = "";

        if (katalogRow > 0) {
          hargaNormal = katalogSheet.getRange(katalogRow, 4).getValue();
          var hargaPromo = katalogSheet.getRange(katalogRow, 5).getValue();
          var tanggalPromo = katalogSheet.getRange(katalogRow, 8).getValue();

          if (tanggalPromo) {
            var promoDate = (tanggalPromo instanceof Date) ? tanggalPromo : new Date(tanggalPromo);
            var txDate = new Date(tanggal);
            if (!isNaN(promoDate.getTime()) && promoDate > txDate) {
              lagiPromo = hargaPromo;
            }
          }

          var hargaRef = (lagiPromo !== "") ? lagiPromo : hargaNormal;
          profitBaris = (hargaSatuan - hargaRef) * qty;
        }

        valuesI.push([hargaNormal]);
        valuesJ.push([lagiPromo]);
        valuesK.push([profitBaris]);
      }
      sheet.getRange(startRow, 9, rows.length, 1).setValues(valuesI);
      sheet.getRange(startRow, 10, rows.length, 1).setValues(valuesJ);
      sheet.getRange(startRow, 11, rows.length, 1).setValues(valuesK);

      // ── Tulis kolom L (Sumber) hanya kalau sumber diisi ──
      if (body.sumber) {
        var sumberCol = [];
        for (var s = 0; s < rows.length; s++) sumberCol.push([body.sumber]);
        sheet.getRange(startRow, 12, rows.length, 1).setValues(sumberCol);
      }
    }

    return jsonResponse_({success: true, noNota: noNota, tanggal: tanggal});
  }

  // ── repushRiwayat ──
  // Update transaksi existing: hapus baris lama berdasarkan noNota,
  // tulis ulang dengan data baru + tanggal baru.
  // KRUSIAL: operasi DESTRUCTIVE — hapus baris lama sebelum tulis baru.
  if (action === "repushRiwayat") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Riwayat");

    var noNota = String(body.noNota || "").trim();
    if (!noNota) {
      return jsonResponse_({success: false, error: "noNota wajib diisi"});
    }

    // Validasi format noNota: MD-YYYYMMDD-XXX
    if (!/^MD-\d{8}-\d{3}$/.test(noNota)) {
      return jsonResponse_({success: false, error: "Format noNota tidak valid, harus MD-YYYYMMDD-XXX"});
    }

    var items = body.items || [];
    var total = body.total;
    var namaPelanggan = body.namaPelanggan || "";

    if (items.length === 0) {
      return jsonResponse_({success: false, error: "items tidak boleh kosong"});
    }

    // ── Cari baris existing ──
    var existingRows = findRiwayatRows_(sheet, noNota);
    if (existingRows.length === 0) {
      return jsonResponse_({success: false, error: "No Nota tidak ditemukan, tidak bisa di-repush"});
    }

    var rowsDeleted = existingRows.length;

    // ── Hapus baris existing (dari row TERBESAR ke TERKECIL) ──
    // Agar index baris di bawahnya tidak bergeser saat delete berjalan.
    existingRows.sort(function (a, b) { return b - a; });
    for (var d = 0; d < existingRows.length; d++) {
      sheet.deleteRows(existingRows[d], 1);
    }

    // ── Tulis baris baru dengan noNota YANG SAMA + tanggal BARU ──
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

      // ── Snapshot value kolom I (Harga Normal), J (Lagi Promo), K (Profit / Baris) ──
      // Dihitung sekali saat disimpan — data historis tidak berubah walau Katalog diupdate.
      // REUSE pola yang SAMA dengan simpanRiwayat.
      var katalogSheet = ss.getSheetByName("Katalog");
      var valuesI = [];
      var valuesJ = [];
      var valuesK = [];
      for (var f = 0; f < rows.length; f++) {
        var produkName = rows[f][3];
        var qty = rows[f][4];
        var hargaSatuan = rows[f][5];
        var katalogRow = findProdukRow_(katalogSheet, produkName);

        var hargaNormal = "";
        var lagiPromo = "";
        var profitBaris = "";

        if (katalogRow > 0) {
          hargaNormal = katalogSheet.getRange(katalogRow, 4).getValue();
          var hargaPromo = katalogSheet.getRange(katalogRow, 5).getValue();
          var tanggalPromo = katalogSheet.getRange(katalogRow, 8).getValue();

          if (tanggalPromo) {
            var promoDate = (tanggalPromo instanceof Date) ? tanggalPromo : new Date(tanggalPromo);
            var txDate = new Date(tanggal);
            if (!isNaN(promoDate.getTime()) && promoDate > txDate) {
              lagiPromo = hargaPromo;
            }
          }

          var hargaRef = (lagiPromo !== "") ? lagiPromo : hargaNormal;
          profitBaris = (hargaSatuan - hargaRef) * qty;
        }

        valuesI.push([hargaNormal]);
        valuesJ.push([lagiPromo]);
        valuesK.push([profitBaris]);
      }
      sheet.getRange(startRow, 9, rows.length, 1).setValues(valuesI);
      sheet.getRange(startRow, 10, rows.length, 1).setValues(valuesJ);
      sheet.getRange(startRow, 11, rows.length, 1).setValues(valuesK);
    }

    return jsonResponse_({
      success: true,
      noNota: noNota,
      tanggal: tanggal,
      rowsDeleted: rowsDeleted,
      rowsWritten: rows.length
    });
  }

  // ── scanNota (OCR nota belanja) ──
  if (action === "scanNota") {
    if (!body.imageBase64) return jsonResponse_({success: false, error: "imageBase64 wajib diisi"});
    var mimeType = body.mimeType || "image/png";
    var ocrResult;
    try {
      ocrResult = callGeminiOCRNota_(body.imageBase64, mimeType);
    } catch (ocrErr) {
      return jsonResponse_({success: false, error: "OCR gagal: " + ocrErr.message});
    }
    var katalogSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Katalog");
    var rawItems = ocrResult.items || [];
    var matchedItems = [];
    for (var mi = 0; mi < rawItems.length; mi++) {
      var it = rawItems[mi];
      var rowIdx = findProdukRow_(katalogSheet, it.produk);
      matchedItems.push({
        produk: it.produk,
        qty: it.qty,
        hargaSatuan: it.hargaSatuan,
        subtotal: it.subtotal,
        matched: rowIdx !== -1,
        matchedProduk: rowIdx !== -1 ? katalogSheet.getRange(rowIdx, 2).getValue() : null
      });
    }
    return jsonResponse_({success: true, namaPelanggan: ocrResult.namaPelanggan || "", items: matchedItems});
  }

  // ── scanNotaSurya (OCR nota Surya Toserba untuk Database-Surya) ──
  if (action === "scanNotaSurya") {
    if (!body.imageBase64) return jsonResponse_({success: false, error: "imageBase64 wajib diisi"});
    var mimeType = body.mimeType || "image/png";
    var ocrResult;
    try {
      ocrResult = callGeminiOCRNotaSurya_(body.imageBase64, mimeType);
    } catch (ocrErr) {
      return jsonResponse_({success: false, error: "OCR Surya gagal: " + ocrErr.message});
    }
    var items = ocrResult.items || [];
    var result = [];
    for (var si = 0; si < items.length; si++) {
      var s = items[si];
      result.push({
        namaProduk: s.namaProduk || "",
        hargaSatuan: s.hargaSatuan || 0,
        status: s.isPromo ? "Promo" : "Normal"
      });
    }
    return jsonResponse_({success: true, items: result});
  }

  // ── simpanKatalogSurya (Database Surya — harga referensi pasar) ──
  // Terima array item {namaProduk, hargaSatuan, status, tanggalScan}.
  // Model append-only/history log: skip kalau harga & status SAMA dengan
  // entri terakhir produk itu, append kalau BEDA.
  if (action === "simpanKatalogSurya") {
    ensureKatalogSuryaHeaders_();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Katalog-Surya");
    var items = body.items || [];
    if (items.length === 0) {
      return jsonResponse_({success: false, error: "items tidak boleh kosong"});
    }
    var tanggal = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
    var saved = 0;
    var skipped = 0;
    for (var k = 0; k < items.length; k++) {
      var item = items[k];
      var namaProduk = String(item.namaProduk || "").trim();
      var hargaSatuan = Number(item.hargaSatuan) || 0;
      var status = String(item.status || "Normal").trim();
      if (!namaProduk) continue;
      // Cari entri TERAKHIR (baris paling bawah) untuk namaProduk yang PERSIS sama.
      // Matching sudah dikonfirmasi manual dari dropdown UI,
      // backend tidak fuzzy-match sendiri.
      var lastHarga = null;
      var lastStatus = null;
      if (sheet.getLastRow() > 1) {
        var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
        for (var d = 0; d < data.length; d++) {
          if (String(data[d][1]).trim().toLowerCase() === namaProduk.toLowerCase()) {
            lastHarga = Number(data[d][2]);
            lastStatus = String(data[d][3]).trim();
          }
        }
      }
      if (lastHarga === null) {
        // Belum ada entri sama sekali → append baris baru.
        sheet.appendRow([tanggal, namaProduk, hargaSatuan, status]);
        saved++;
      } else if (lastHarga === hargaSatuan && lastStatus.toLowerCase() === status.toLowerCase()) {
        // Entri terakhir ADA, hargaSatuan SAMA dan status SAMA → SKIP.
        skipped++;
      } else {
        // Entri terakhir ADA tapi hargaSatuan BEDA atau status BEDA → APPEND.
        // Model append-only/history log — JANGAN overwrite baris lama.
        sheet.appendRow([tanggal, namaProduk, hargaSatuan, status]);
        saved++;
      }
    }
    return jsonResponse_({success: true, saved: saved, skipped: skipped});
  }

  return jsonResponse_({success: false, error: "unknown action"});
}
