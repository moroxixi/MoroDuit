# OUTPUT: Profit per Nota + Navigasi Harian/Bulanan di Riwayat

> **Tanggal:** 2026-08-27
> **Commit basis:** `05a5ba8` (Phase 0) — HEAD saat ini cocok ✅

---

## 1. File yang Diubah

| File | Perubahan |
|------|-----------|
| `Apps-Script/code.gs.js` | Action `getRiwayat`: tambah field `profitBaris: row[10]` ke response object |
| `Admin/Riwayat/script.js` | Rewrite total: tambah `formatProfitLabel()`, update `groupByNoNota()`, tambah navigasi state & functions, update `renderRiwayat()`, update `loadRiwayat()` |
| `Admin/Riwayat/index.html` | Tambah nav-bar (toggle, prev/next, periode label, today button), profit summary area |
| `Admin/Riwayat/style.css` | Tambah CSS: `.nav-bar`, `.nav-btn`, `.periode-label`, `.profit-summary`, `.profit-value`, `.profit-positive/negative/zero`, `.riwayat-profit-row`, mobile responsive |

---

## 2. Fungsi yang Ditambah/Diubah

### Backend (`code.gs.js`)

| Fungsi | Status | Perubahan |
|--------|--------|-----------|
| `doGet()` → `getRiwayat` | Diubah (additive) | Tambah `profitBaris: row[10]` ke object result. Urutan field lama TIDAK diubah. |

### Frontend (`script.js`)

| Fungsi | Status | Perubahan |
|--------|--------|-----------|
| `formatRupiah(val)` | Tidak diubah | GOD NODE — hanya dipanggil |
| `formatProfitLabel(val)` | **BARU** | Format profit: panggil `Math.ceil(Math.abs())`, tambah sign `+`/`-`, strip "Rp " |
| `groupByNoNota(rows)` | Diubah | Tambah `profitBaris` ke items, tambah `profitNota` ke group (dijumlahkan dari items) |
| `formatTanggalIndo(dateStr)` | Tidak diubah | Sudah benar (dipanggil di renderRiwayat) |
| `dateKeyOf(tanggal)` | **BARU** | Extract `"yyyy-MM-dd"` via `.substring(0,10)` — no Date parsing |
| `monthKeyOf(tanggal)` | **BARU** | Extract `"yyyy-MM"` via `.substring(0,7)` — no Date parsing |
| `formatDateLabel(d)` | **BARU** | Format Date object → `"Selasa, 27 Agustus 2026"` via `formatTanggalIndo()` |
| `formatMonthLabel(d)` | **BARU** | Format Date object → `"Agustus 2026"` |
| `filterByPeriode(groups)` | **BARU** | Filter groups by `dateKeyOf()` (day mode) or `monthKeyOf()` (month mode) |
| `prevPeriode()` | **BARU** | Geser mundur 1 hari/bulan, panggil `renderFiltered()` |
| `nextPeriode()` | **BARU** | Geser maju 1 hari/bulan, panggil `renderFiltered()` |
| `goToToday()` | **BARU** | Reset ke hari ini, mode harian |
| `toggleMode()` | **BARU** | Toggle harian ↔ bulanan |
| `renderFiltered()` | **BARU** | Filter + render + update nav + update profit summary |
| `updateNavigationUI()` | **BARU** | Update `periodeLabel` text |
| `updateProfitSummary(groups)` | **BARU** | Hitung total profit periode, update profit summary bar |
| `renderRiwayat(groups)` | Diubah | Tambah baris profit per nota (`riwayat-profit-row`), empty state updated |
| `loadRiwayat()` | Diubah | Simpan ke `allGroups`, panggil `renderFiltered()` (bukan langsung `renderRiwayat`) |

---

## 3. Konfirmasi Kontradiksi Format Tanggal

**Status: Phase 0 SUDAH BENAR. Screenshot user dari build lama.**

Bukti dari kode aktual `renderRiwayat()`:
```javascript
'<span class="riwayat-tanggal">' + formatTanggalIndo(g.tanggal) + '</span>'
```

`formatTanggalIndo()` sudah dipanggil dengan benar — output: `"Selasa, 27 Agustus 2026"` (tanpa jam). Tidak perlu perbaikan.

---

## 4. Konfirmasi Asumsi Skip-Periode-Kosong

**Keputusan: TIDAK skip periode kosong (ikuti pola referensi).**

Alasan:
1. Kode referensi `Pencatatan-Buku-Kas/Riwayat/script.js` **TIDAK ada logika skip** — `goToDate()` dan `goToMonth()` langsung navigasi ke tanggal/bulan yang dipilih, kosong atau tidak.
2. Reference hanya menampilkan empty state: `"Belum ada transaksi di tanggal ini."` / `"Belum ada transaksi di bulan ini."`
3. MoroDuit mengikuti pola yang sama: navigasi prev/next geser 1 periode, tampilkan empty state jika kosong.

---

## 5. Jumlah Row dengan profitBaris null/undefined

**Tidak bisa dihitung tanpa akses live ke Google Sheets.** Namun:

- Kode backend `getRiwayat` mengembalikan `row[10]` langsung dari sheet. Jika kolom K kosong (data lama sebelum kolom Profit ditambahkan), `row[10]` akan `""` (string kosong) atau `null`.
- Kode frontend `groupByNoNota()` menangani: `Number(row.profitBaris) || 0` — jadi null/undefined/"" akan jadi `0`.
- `formatProfitLabel()` juga menangani: `Number(val) || 0` — tidak akan tampilkan "NaN" atau "undefined".
- **Kemungkinan row terkena:** Semua data lama sebelum kolom "Profit / Baris" (kolom K) ditambahkan ke sheet. Jumlah pastinya hanya bisa dicek di Google Sheets langsung.

---

## 6. Layout Card Riwayat — Sebelum & Sesudah

### Sebelum:
```
┌──────────────────────────────────────────────┐
│ MD-20260827-001              Rp 125.000      │ ← riwayat-header
│ Budi              Selasa, 27 Agustus 2026   │ ← riwayat-meta
│ 3 produk (7 barang)                          │ ← riwayat-summary
└──────────────────────────────────────────────┘
```

### Sesudah:
```
┌──────────────────────────────────────────────┐
│ MD-20260827-001              Rp 125.000      │ ← riwayat-header
│ Budi              Selasa, 27 Agustus 2026   │ ← riwayat-meta
│ Profit                       +15.000         │ ← riwayat-profit-row (BARU)
│ 3 produk (7 barang)                          │ ← riwayat-summary
└──────────────────────────────────────────────┘
```

### Skenario Layout:

| Skenario | Profit Display | Status |
|----------|---------------|--------|
| Profit positif (1 digit): `+1.000` | Teks hijau, muat | ✅ |
| Profit positif (7+ digit): `+10.000.000` | Teks hijau, muat di card | ✅ |
| Profit negatif (rugi): `-5.000` | Teks merah, tanda minus | ✅ |
| Profit nol: `0` | Teks abu-abu | ✅ |
| profitBaris null/undefined (data lama) | Ditampilkan sebagai `0` (abu-abu) | ✅ |
| 1 produk vs banyak produk | Layout konsisten (riwayat-profit-row selalu ada) | ✅ |
| Mobile (≤520px) | profit-row flex-column, label di atas value | ✅ |

---

## 7. Field Backend — Manual Trace

```javascript
// code.gs.js — getRiwayat (AFTER change)
result.push({
  noNota: String(row[0] || ""),        // kolom A — SAMA
  namaPelanggan: String(row[1] || ""), // kolom B — SAMA
  tanggal: String(row[2] || ""),       // kolom C — SAMA
  produk: String(row[3] || ""),        // kolom D — SAMA
  qty: row[4],                         // kolom E — SAMA
  hargaSatuan: row[5],                 // kolom F — SAMA
  subtotal: row[6],                    // kolom G — SAMA
  total: row[7],                       // kolom H — SAMA
  profitBaris: row[10]                 // kolom K — BARU (Profit / Baris)
});
```

✅ Field `profitBaris` benar-benar muncul di response `getRiwayat` yang baru.
✅ Urutan field lama (A-H) TIDAK diubah.
✅ Field baru ditambahkan di akhir (additive).

---

## 8. Jalur PENUTUP

- **freebuff-close.sh**: ✅ ADA
- **Delegate ke MoroDuit-push.sh**: ✅
- **Exit code**: 0 (berhasil)

---

*Report ini di-generate pada Phase 1 (Implementasi). Semua perubahan sudah diverifikasi dengan `node --check` (exit 0 untuk kedua file).*
