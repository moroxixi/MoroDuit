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
    katalog.getRange(1, 1, 1, 7).setValues([[
      "Timestamp", "Produk", "Harga Normal", "Harga Promo",
      "Harga Jual", "Status", "Catatan"
    ]]);
  }

  // Tab Riwayat
  var riwayat = ss.getSheetByName("Riwayat");
  if (!riwayat) {
    riwayat = ss.insertSheet("Riwayat");
  }
  if (riwayat.getLastRow() === 0) {
    riwayat.getRange(1, 1, 1, 7).setValues([[
      "No Nota", "Tanggal", "Produk", "Qty",
      "Harga Satuan", "Subtotal", "Total Nota"
    ]]);
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
      if (String(data[i][5]).trim() === "Ada") {
        result.push({
          produk: String(data[i][1]).trim(),
          hargaJual: data[i][4],
          catatan: String(data[i][6] || "")
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
        hargaNormal: data[i][2],
        hargaPromo: data[i][3],
        hargaJual: data[i][4],
        status: String(data[i][5]).trim(),
        catatan: String(data[i][6] || "")
      });
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
    var hargaJual = (body.hargaJual !== undefined && body.hargaJual !== "")
      ? body.hargaJual
      : hargaNormal;
    var catatan = body.catatan || "";
    var status = body.status || "Ada";
    var timestamp = new Date();

    var row = findProdukRow_(sheet, produk);
    var rowData = [timestamp, produk, hargaNormal, hargaPromo, hargaJual, status, catatan];

    if (row > 0) {
      sheet.getRange(row, 1, 1, 7).setValues([rowData]);
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
        tanggal,
        item.produk,
        item.qty,
        item.hargaSatuan,
        item.subtotal,
        total
      ]);
    }

    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
    }

    return jsonResponse_({success: true, noNota: noNota, tanggal: tanggal});
  }

  return jsonResponse_({success: false, error: "unknown action"});
}
