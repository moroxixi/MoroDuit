# DISCOVERY: Bug Riwayat Kosong di Semua Periode

**Tanggal:** 2026-08-27
**Status:** Root cause ditemukan, fix BELUM dieksekusi
**Severity:** P1 — halaman Riwayat non-functional (selalu kosong)

---

## TL;DR

**Root cause ada di backend** (`Apps-Script/code.gs.js`, `getRiwayat` action):
kolom `Tanggal` (index 2) dikembalikan sebagai `String(Date object)` — format panjang
`"Mon Aug 27 2026 10:30:00 GMT+0700 (Western Indonesia Time)"` — bukan format
`"yyyy-MM-dd HH:mm:ss"` yang diharapkan frontend. Akibatnya, `dateKeyOf()` dan
`monthKeyOf()` di frontend menghasilkan key yang SALAH, sehingga `filterByPeriode()`
tidak pernah match untuk periode apapun.

---

## Detail Teknis

### Alur Data (Write)

Saat transaksi disimpan via `simpanRiwayat`, tanggal ditulis sebagai **string**:

**`code.gs.js` baris 518:**
```javascript
var tanggal = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
```

Output: `"2026-08-27 10:30:00"` (string, WIB)

String ini ditulis ke kolom C (Tanggal) sheet "Riwayat" via `setValues()`.
**Google Sheets mengenali format ini sebagai tanggal dan menyimpannya sebagai Date object内部.**

### Alur Data (Read) — **DI SINI BUGNYA**

Saat `getRiwayat` membaca data dari sheet:

**`code.gs.js` baris 270:**
```javascript
var data = sheet.getDataRange().getValues();
```

`getValues()` mengembalikan `row[2]` (kolom Tanggal) sebagai **JavaScript Date object**,
bukan string — karena Google Sheets menyimpan nilai tersebut sebagai Date internal.

**`code.gs.js` baris 280 (BUG):**
```javascript
tanggal: String(row[2] || ""),
```

`String()` pada Date object di Google Apps Script (V8 runtime) memanggil
`Date.prototype.toString()`, yang menghasilkan format panjang:
```
"Mon Aug 27 2026 10:30:00 GMT+0700 (Western Indonesia Time)"
```

**Bukan** format `"2026-08-27 10:30:00"`.

### Alur Filter di Frontend — **MENGAPA SEMUA PERIODE GAGAL**

Frontend menggunakan `substring`-based helpers untuk extract date key:

**`script.js` baris 129-131 (`dateKeyOf`):**
```javascript
function dateKeyOf(tanggal) {
    return (tanggal || "").substring(0, 10);
}
```

**`script.js` baris 134-136 (`monthKeyOf`):**
```javascript
function monthKeyOf(tanggal) {
    return (tanggal || "").substring(0, 7);
}
```

#### Day mode (`filterByPeriode`, baris 165-175):

```javascript
var targetKey = dateKeyOf(
    currentPeriodeDate.getFullYear() + "-" +
    String(currentPeriodeDate.getMonth() + 1).padStart(2, "0") + "-" +
    String(currentPeriodeDate.getDate()).padStart(2, "0") + " 00:00:00"
);
return groups.filter(function (g) {
    return dateKeyOf(g.tanggal) === targetKey;
});
```

- **Target key** (dari `currentPeriodeDate`): `"2026-08-27"`
  → `dateKeyOf("2026-08-27 00:00:00")` → `.substring(0, 10)` → **`"2026-08-27"`** ✓

- **Data key** (dari `g.tanggal` dari backend):
  `"Mon Aug 27 2026 10:30:00 GMT+0700 (Western Indonesia Time)"`
  → `.substring(0, 10)` → **`"Mon Aug 27"`** ✗

- **Perbandingan:** `"Mon Aug 27"` === `"2026-08-27"` → **FALSE → filter kosong!**

#### Month mode (baris 178-183):

- **Target month:** `"2026-08"`
- **Data key:** `monthKeyOf(g.tanggal)` → `"Mon Aug 27...".substring(0, 7)` → **`"Mon Aug"`**
- **Perbandingan:** `"Mon Aug"` === `"2026-08"` → **FALSE → filter kosong!**

**Karena SEMUA tanggal dari backend memiliki format yang salah, SEMUA periode
(harian DAN bulanan) menghasilkan kosong. Ini bukan off-by-one atau mismatch
1 tanggal — ini adalah bug format yang mempengaruhi 100% data.**

---

## Kode Persis di Titik Bug

### Backend (GOD NODE — baca saja, jangan ubah dulu)

| File | Baris | Kode | Status |
|------|-------|------|--------|
| `Apps-Script/code.gs.js` | 270 | `var data = sheet.getDataRange().getValues();` | OK — data masuk |
| `Apps-Script/code.gs.js` | 280 | `tanggal: String(row[2] || ""),` | **BUG** — Date → long string |
| `Apps-Script/code.gs.js` | 518 | `var tanggal = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");` | OK — format benar saat write |

### Frontend

| File | Baris | Kode | Status |
|------|-------|------|--------|
| `Admin/Riwayat/script.js` | 130 | `return (tanggal \|\| "").substring(0, 10);` | OK asumsi: input `"yyyy-MM-dd..."` |
| `Admin/Riwayat/script.js` | 135 | `return (tanggal \|\| "").substring(0, 7);` | OK asumsi: input `"yyyy-MM..."` |
| `Admin/Riwayat/script.js` | 173 | `return dateKeyOf(g.tanggal) === targetKey;` | SELALU FALSE karena key salah |

---

## Mengapa "tidak ada transaksi" ditampilkan (bukan error)

1. `loadRiwayat()` → fetch berhasil → API mengembalikan array (bukan error object)
2. `Array.isArray(data)` → TRUE → tidak masuk error branch
3. `allGroups = groupByNoNota(data)` → berhasil, groups terisi
4. `renderFiltered()` → `filterByPeriode(allGroups)` → **mengembalikan [] karena key mismatch**
5. `renderRiwayat([])` → menampilkan: `"Belum ada riwayat transaksi di periode ini"`

---

## Mengapa browser-use tidak bisa digunakan untuk verifikasi

`browser-use` tidak tersedia di environment ini. Analisis dilakukan sepenuhnya
dengan static code reading. Verifikasi manual via browser disarankan sebelum fix.

**Verifikasi manual yang disarankan:**
1. Buka halaman Riwayat di Chrome
2. Buka DevTools → Console
3. Jalankan:
   ```javascript
   // Fetch data dan cek format tanggal
   fetch(MORODUIT_CONFIG.APPS_SCRIPT_URL + "?action=getRiwayat&token=" + MORODUIT_CONFIG.TOKEN)
     .then(r => r.json())
     .then(data => {
       console.log("Jumlah baris:", data.length);
       if (data.length > 0) {
         console.log("Contoh tanggal[0]:", JSON.stringify(data[0].tanggal));
         console.log("Tipe:", typeof data[0].tanggal);
         console.log("substring(0,10):", (data[0].tanggal || "").substring(0, 10));
       }
     });
   ```
4. **Jika output menunjukkan format `"Mon Aug 27 2026..."` → root cause terkonfirmasi**

---

## Rekomendasi Arah Fix

**Opsi 1 (Backend fix — REKOMENDASI):**
Di `code.gs.js` `getRiwayat` action (baris 280), gunakan `Utilities.formatDate()`
untuk mengonversi Date object ke string yang konsisten:

```javascript
// SEBELUM (bug):
tanggal: String(row[2] || ""),

// SESUDAH (fix):
tanggal: row[2] instanceof Date
    ? Utilities.formatDate(row[2], "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss")
    : String(row[2] || ""),
```

**Kelebihan:** Fix di satu titik, semua client otomatis benar.
**Kekurangan:** Bergantung pada Google Apps Script runtime (bukan issue, karena ini memang GAS).

**Opsi 2 (Frontend fix — sebagai defense-in-depth):**
Buat `dateKeyOf()` dan `monthKeyOf()` lebih robust dengan parse Date dulu:

```javascript
function dateKeyOf(tanggal) {
    if (!tanggal) return "";
    // Handle both "yyyy-MM-dd HH:mm:ss" and Date.toString() formats
    var d = new Date(tanggal.replace(" ", "T"));
    if (isNaN(d.getTime())) return (tanggal || "").substring(0, 10);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var dd = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + dd;
}
```

**Kelebihan:** Handle semua format tanggal yang mungkin.
**Kekurangan:** Lebih kompleks, harus handle timezone.

**Rekomendasi:** Opsi 1 (backend fix) sebagai primary fix.
Opsi 2 bisa ditambahkan sebagai defense-in-depth (optional).

---

## Catatan Tambahan

- **`profitBaris: row[10]`** (code.gs.js baris 281) — Kolom K (Profit / Baris) tidak
  menyebabkan crash karena hanya dibaca nilainya. Jika kolom kosong, `row[10]` akan
  `""` atau `null`, dan frontend handle dengan `Number(row.profitBaris) || 0`.

- **Data Riwayat yang sudah ada** di sheet TIDAK perlu diubah. Fix hanya di kode
  (backend `getRiwayat`), data di sheet sudah benar format-nya.

- **Bug ini mempengaruhi SEMUA data yang ditulis oleh `simpanRiwayat`** — semua
  transaksi yang pernah disimpan akan menampilkan tanggal yang salah di response API.

---

*Generated by Codebuff diagnosis — 2026-08-27*
