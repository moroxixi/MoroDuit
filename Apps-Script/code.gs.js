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
    riwayat.getRange(1, 1, 1, 8).setValues([[
      "No Nota", "Nama Pelanggan", "Tanggal", "Produk", "Qty",
      "Harga Satuan", "Subtotal", "Total Nota"
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
      "Kopi", "Minuman Manis", "Bumbu Dapur", "Mie Instan",
      "Perawatan Diri", "Obat Nyamuk", "Tisu", "Susu", "Roti", "Sabun"
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
    }

    return jsonResponse_({success: true, noNota: noNota, tanggal: tanggal});
  }

  return jsonResponse_({success: false, error: "unknown action"});
}


