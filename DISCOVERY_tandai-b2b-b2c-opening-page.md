# DISCOVERY: Kolom Tandai b2b/b2c & Rencana Halaman Opening

> Dibuat: 2026-08-28 | Scope: `~/HomeLab/MoroDuit/` | Mode: **READ-ONLY investigation**

---

## 1. Status Freshness Graph

| Item | Value |
|------|-------|
| **Current HEAD** | `24e9aa37ccd1c5ef9d2806cc2569b6774757b512` |
| **GRAPH_REPORT.md commit** | `c0eb09d9` |
| **Status** | ⚠️ **BEDA** — HEAD lebih baru dari commit graph. Perlu re-run `MoroDuit-push.sh` untuk refresh graph sebelum task implementasi dimulai. |

---

## 2. Logic Filter `getKatalogPerkenalan` Saat Ini

**Lokasi:** `Apps-Script/code.gs.js` baris 224–259

```javascript
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
```

### Analisis Filter

| Aspek | Detail |
|-------|--------|
| **Kolom Tandai** | Hardcode index **9** (kolom J, 0-indexed) |
| **Metode matching** | **Exact-match string** — `tandai === "Perkenalan"` |
| **Kondisi AND** | `status === "Ada"` (index 6 / kolom G) |
| **Defensif check** | `data[i].length > 9` — aman kalau baris belum punya kolom J |
| **Value saat ini** | Hanya `"Perkenalan"` yang di-check |

> **⚠️ TEMUAN PENTING:** Filter pakai exact-match (`===`), **bukan** `includes()`. Untuk skema multi-tag `b2b;b2c`, baris ini **WAJIB diubah** dari exact-match ke contains/split-based check. Exact-match `"Perkenalan"` tidak akan cocok dengan `"b2b"` atau `"b2c"` — ini perlu penulisan ulang total di bagian filter logic.

---

## 3. Definisi & Posisi Kolom `Tandai` di Header Katalog

### `ensureHeaders_()` (baris 4–40)

Kolom yang didefinisikan di `ensureHeaders_()` untuk sheet "Katalog":

| Index (0-based) | Kolom (1-based / Huruf) | Header |
|:---:|:---:|--------|
| 0 | 1 / A | Timestamp |
| 1 | 2 / B | Produk |
| 2 | 3 / C | Kategori |
| 3 | 4 / D | Harga Normal |
| 4 | 5 / E | Harga Promo |
| 5 | 6 / F | Harga Jual |
| 6 | 7 / G | Status |
| 7 | 8 / H | Catatan |
| 8 | 9 / I | *(FotoPath — dicari dinamis via header scan, tidak di-ensure)* |
| **9** | **10 / J** | **Tandai** |

### Catatan Penting

- **Kolom "Tandai" TIDAK diinisialisasi oleh `ensureHeaders_()`** — kolom ini diasumsikan sudah ada manual di sheet, atau ditambahkan oleh mekanisme lain (Admin Input, dll).
- `ensureHeaders_()` hanya memastikan 8 kolom pertama (Timestamp–Catatan) + menambahkan "Kategori" kalau belum ada.
- Kolom "FotoPath" juga tidak di-ensure — dicari dinamis via header scan di setiap action.
- Kolom "Tandai" di-index 9 (kolom J) dengan hardcode — **tidak ada header scan dinamis** untuk Tandai, unlike FotoPath.

### Nilai Contoh/Format

- **Tidak ada nilai hardcode/contoh di kode.** Satu-satunya nilai yang direferensikan adalah `"Perkenalan"` di baris 247.
- Format saat ini: **single-value string** (mis. `"Perkenalan"`). Belum ada bukti pemakaian multi-value semicolon di kode manapun.
- Format aktual kolom Tandai di sheet hanya bisa dikonfirmasi dari data sheet langsung (Google Sheets UI / Apps Script dashboard).

---

## 4. Semua Kemunculan String `Tandai` di `Apps-Script/code.gs.js`

| Baris | Konteks | Isi Baris |
|:---:|---------|-----------|
| 225 | Comment | `// Filter produk yang ditandai "Perkenalan" di kolom J (index 9)` |
| 245 | Variabel | `var tandai = data[i].length > 9 ? String(data[i][9] || "").trim() : "";` |
| 247 | Filter condition | `if (tandai === "Perkenalan" && status === "Ada") {` |

**Total: 3 kemunculan** — semua di dalam action `getKatalogPerkenalan` (baris 224–259). Tidak ada kemunculan di action lain, di `doPost()`, atau di bagian mana pun dari file ini.

### Kemunculan di File Lain (referensi)

| File | Baris | Isi | Relevansi |
|------|:---:|-----|-----------|
| `Customer/Perkenalan/script.js` | 3 | `Fetch produk favorit (ditandai "Perkenalan" di Katalog) dan render` | Comment saja |
| `Customer/Perkenalan/script.js` | 50 | `// Belum ada produk ditandai — sembunyikan section` | Comment saja |
| `Admin/Riwayat/Mode-Edit/script.js` | 213 | `// Cek apakah sudah ada di list (tandai)` | **TIDAK TERKAIT** — arti "tandai" di sini = "mark/flag" untuk deduplikasi item di riwayat edit, bukan kolom Tandai di Katalog |

---

## 5. Detail `loadProdukPerkenalan()`

**File:** `Customer/Perkenalan/script.js` baris 41–82

### Action & Payload

```javascript
var url = MORODUIT_CONFIG.APPS_SCRIPT_URL
  + "?action=getKatalogPerkenalan"
  + "&token=" + encodeURIComponent(MORODUIT_CONFIG.TOKEN);

fetch(url)
```

| Aspek | Detail |
|-------|--------|
| **HTTP Method** | GET (query parameter, bukan POST body) |
| **Action name** | `getKatalogPerkenalan` |
| **Payload** | `action` + `token` (no POST body) |
| **Response handling** | `res.json()` → array of objects |
| **Sort** | Client-side A-Z by `produk` (localeCompare "id") |
| **Fields consumed** | `produk`, `fotoPath`, `hargaJual` |

### Perilaku saat data kosong
Jika array kosong atau bukan array → sembunyikan section (`section.style.display = "none"`).

---

## 6. Apakah `Katalog/script.js` Ikut Memakai Kolom `Tandai`?

### Jawaban: **TIDAK**

**Bukti:**

1. `Customer/Katalog/script.js` memanggil action **`getKatalogFull`** (bukan `getKatalogPerkenalan`):
   ```javascript
   // baris 140-141
   var url = MORODUIT_CONFIG.APPS_SCRIPT_URL
     + "?action=getKatalogFull"
     + "&token=" + encodeURIComponent(MORODUIT_CONFIG.TOKEN);
   ```

2. `getKatalogFull` di `code.gs.js` (baris 190–220) **tidak mengembalikan field `Tandai`** — hanya: `produk`, `kategori`, `hargaNormal`, `hargaPromo`, `hargaJual`, `status`, `catatan`, `fotoPath`.

3. Client-side filter di `Customer/Katalog/script.js` hanya berdasarkan:
   - `status === "Ada"` (baris 153)
   - Search text (produk + kategori substring match)
   - Kategori chip filter (exact match)

4. **Tidak ada string "Tandai" atau "tandai" yang muncul di `Customer/Katalog/script.js`** — sudah diverifikasi via grep global.

> **Kesimpulan:** Kolom `Tandai` murni eksklusif dipakai oleh action `getKatalogPerkenalan` dan halaman `Customer/Perkenalan/`. Katalog page tidak terpengaruh oleh perubahan skema Tandai.

---

## 7. Rekomendasi

### Skema Multi-Tag `b2b;b2c`

**Filter matching sekarang:**
```javascript
if (tandai === "Perkenalan" && status === "Ada")
```

**Yang perlu diubah untuk multi-tag:**

1. **`getKatalogPerkenalan`** — ganti exact-match ke contains check:
   ```javascript
   // Contoh: filter untuk tag "b2b"
   var tags = tandai.split(";").map(function(t) { return t.trim().toLowerCase(); });
   if (tags.indexOf("b2b") !== -1 && status === "Ada") {
   ```

2. **Action baru `getKatalogOpening`** — salin struktur `getKatalogPerkenalan`, ganti filter ke tag `"b2c"`.

3. **Renaming kolom** — nilai `"Perkenalan"` di kolom Tandai perlu diganti ke format `"b2b"` / `"b2c"` / `"b2b;b2c"` di data sheet secara manual atau via script migration.

### Estimasi Scope Perubahan

| File | Perubahan | Estimasi |
|------|-----------|----------|
| `Apps-Script/code.gs.js` | Modifikasi `getKatalogPerkenalan` filter + tambah action `getKatalogOpening` | Sedang |
| `Customer/Perkenalan/script.js` | Ubah action name jika rename (opsional) | Kecil |
| `Customer/Opening/script.js` | **FILE BARU** — clone dari Perkenalan, ganti action ke `getKatalogOpening` | Sedang |
| `Customer/Opening/index.html` | **FILE BARU** — clone dari Perkenalan | Sedang |
| Data sheet Katalog | Update nilai kolom Tandai dari `"Perkenalan"` ke `"b2b"` / `"b2c"` | Manual |

### Verdict

> **Filter logic saat ini perlu ditulis ulang di bagian condition saja** — tidak perlu restrukturisasi besar. Struktur action (read sheet → filter → return JSON) sudah bagus. Yang berubah cuma baris `if (tandai === "Perkenalan"...)` → split-and-check. Tambah action baru `getKatalogOpening` sebagai copy-paste dari `getKatalogPerkenalan` dengan filter tag berbeda.

---

## 8. Folder `Customer/Opening/`

**Status:** ❌ Belum ada. Folder `Customer/` hanya berisi:
- `Katalog/`
- `Keranjang-Duit/`
- `Perkenalan/`

Halaman Opening perlu dibuat dari scratch (atau clone dari Perkenalan).
