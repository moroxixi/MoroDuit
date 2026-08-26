# DISCOVERY: Admin/Customer Folder Restructure — Path Reference Report

> **Tanggal:** 2026-08-26
> **Scope:** MoroDuit (root: `~/HomeLab/MoroDuit`)
> **Tujuan:** Pemetaan semua referensi path relatif yang akan rusak jika folder-folder berikut dipindah ke `Admin/` atau `Customer/`.
> **Status:** READ-ONLY discovery — tidak ada file yang dipindah/diedit.

---

## 1. Struktur Restrukturisasi yang Direncanakan

### Admin/
| Folder | Path Sekarang | Path Baru |
|---|---|---|
| Input/ | `MoroDuit/Input/` | `MoroDuit/Admin/Input/` |
| Database-Surya/ | `MoroDuit/Database-Surya/` | `MoroDuit/Admin/Database-Surya/` |
| Input-Sheet-From-Nota/ | `MoroDuit/Input-Sheet-From-Nota/` | `MoroDuit/Admin/Input-Sheet-From-Nota/` |
| Riwayat/ (termasuk Mode-Edit/, Mode-Edit/Priview/) | `MoroDuit/Riwayat/` | `MoroDuit/Admin/Riwayat/` |
| Rekap-Belanja/ (termasuk Priview/) | `MoroDuit/Rekap-Belanja/` | `MoroDuit/Admin/Rekap-Belanja/` |

### Customer/
| Folder | Path Sekarang | Path Baru |
|---|---|---|
| Keranjang-Duit/ (termasuk Priview/, vendor/) | `MoroDuit/Keranjang-Duit/` | `MoroDuit/Customer/Keranjang-Duit/` |
| Perkenalan/ | `MoroDuit/Perkenalan/` | `MoroDuit/Customer/Perkenalan/` |

### Tetap di Root
`Apps-Script/`, `assets/`, `graphify-out/`, `config.js`, `*.md`, `MoroDuit-push.sh`, `verify_layout.mjs`, `.github/`

---

## 2. Ringkasan Angka

| Metrik | Jumlah |
|---|---|
| Total file `.html`/`.js`/`.mjs` di-scan | **26** |
| Total referensi path relatif ditemukan | **28** |
| — kategori: **normal** (perlu update path) | **28** |
| — kategori: **cross-group** | **0** |
| — kategori: **absolute-tidak-terpengaruh** | **0** |
| — kategori: **ambigu** | **0** |

> **Catatan file scan:** 26 file scannable dihitung dari total 204 file tracked di git. Sisanya adalah file binary/asset (`assets/images/*.webp`, `vendor/html2canvas/html2canvas.min.js`), CSS murni (6 file), JSON, Markdown, shell scripts, dan file di `graphify-out/` — none di antaranya mengandung path referensi lintas folder yang relevan.

---

## 3. Tabel Lengkap Referensi Path Relatif

### 3.1. Referensi ke `config.js` (root → tetap di root)

| File | Baris | Referensi Lama | Referensi Baru (usulan) | Kategori |
|---|---|---|---|---|
| `Input/index.html` | 116 | `<script src="../config.js">` | `<script src="../../config.js">` | normal |
| `Database-Surya/index.html` | 233 | `<script src="../config.js">` | `<script src="../../config.js">` | normal |
| `Input-Sheet-From-Nota/index.html` | 333 | `<script src="../config.js">` | `<script src="../../config.js">` | normal |
| `Keranjang-Duit/index.html` | 63 | `<script src="../config.js">` | `<script src="../../config.js">` | normal |
| `Perkenalan/index.html` | 99 | `<script src="../config.js">` | `<script src="../../config.js">` | normal |
| `Rekap-Belanja/index.html` | 36 | `<script src="../config.js">` | `<script src="../../config.js">` | normal |
| `Riwayat/index.html` | 30 | `<script src="../config.js">` | `<script src="../../config.js">` | normal |
| `Keranjang-Duit/Priview/index.html` | 85 | `<script src="../../config.js">` | `<script src="../../../config.js">` | normal |
| `Rekap-Belanja/Priview/index.html` | 279 | `<script src="../../config.js">` | `<script src="../../../config.js">` | normal |
| `Riwayat/Mode-Edit/index.html` | 466 | `<script src="../../config.js">` | `<script src="../../../config.js">` | normal |
| `Riwayat/Mode-Edit/Priview/index.html` | 261 | `<script src="../../../config.js">` | `<script src="../../../../config.js">` | normal |

### 3.2. Referensi ke `style.css` (lintas folder dalam grup yang sama)

| File | Baris | Referensi Lama | Referensi Baru (usulan) | Kategori |
|---|---|---|---|---|
| `Database-Surya/index.html` | 7 | `<link href="../Input/style.css">` | `<link href="../Input/style.css">` | normal |
| `Input-Sheet-From-Nota/index.html` | 7 | `<link href="../Input/style.css">` | `<link href="../Input/style.css">` | normal |
| `Riwayat/Mode-Edit/index.html` | 7 | `<link href="../style.css">` | `<link href="../style.css">` | normal |
| `Riwayat/Mode-Edit/Priview/index.html` | 7 | `<link href="../../style.css">` | `<link href="../../style.css">` | normal |

> **Catatan:** `Database-Surya/` dan `Input-Sheet-From-Nota/` berbagi `Input/style.css`. Setelah restructure, keduanya tetap di `Admin/` — path `../Input/style.css` dari `Admin/Database-Surya/index.html` tetap benar (`Admin/Input/style.css`). Demikian juga `Riwayat/Mode-Edit/` → `../style.css` tetap ke `Riwayat/style.css`.

### 3.3. Referensi `assets/images/` (dari dalam folder yang pindah)

| File | Baris | Referensi Lama | Referensi Baru (usulan) | Kategori |
|---|---|---|---|---|
| `Keranjang-Duit/script.js` | 230 | `'../assets/images/' + p.fotoPath` | `'../../assets/images/' + p.fotoPath` | normal |
| `Perkenalan/script.js` | 65 | `'../assets/images/' + p.fotoPath` | `'../../assets/images/' + p.fotoPath` | normal |

### 3.4. Referensi navigasi antar-halaman (intra-grup)

| File | Baris | Referensi Lama | Referensi Baru (usulan) | Kategori |
|---|---|---|---|---|
| `Keranjang-Duit/script.js` | 485 | `window.location.href = "../Keranjang-Duit/Priview/index.html"` | `window.location.href = "../Keranjang-Duit/Priview/index.html"` | normal |
| `Keranjang-Duit/Priview/index.html` | 15 | `<a href="../index.html">` | `<a href="../index.html">` | normal |
| `Keranjang-Duit/Priview/script.js` | 241 | `window.location.href = "../index.html"` | `window.location.href = "../index.html"` | normal |
| `Perkenalan/index.html` | 87 | `<a href="../Keranjang-Duit/index.html">` | `<a href="../Keranjang-Duit/index.html">` | normal |
| `Riwayat/script.js` | 166 | `window.location.href = "Mode-Edit/index.html"` | `window.location.href = "Mode-Edit/index.html"` | normal |
| `Riwayat/Mode-Edit/index.html` | 422 | `<a href="../index.html">` | `<a href="../index.html">` | normal |
| `Riwayat/Mode-Edit/script.js` | 305 | `window.location.href = "../index.html"` | `window.location.href = "../index.html"` | normal |
| `Riwayat/Mode-Edit/script.js` | 341 | `window.location.href = "Priview/index.html"` | `window.location.href = "Priview/index.html"` | normal |
| `Riwayat/Mode-Edit/Priview/script.js` | 253 | `window.location.href = "../index.html"` | `window.location.href = "../index.html"` | normal |
| `Rekap-Belanja/script.js` | 344 | `window.location.href = "Priview/index.html"` | `window.location.href = "Priview/index.html"` | normal |
| `Rekap-Belanja/Priview/script.js` | 199 | `window.location.href = "../index.html"` | `window.location.href = "../index.html">` | normal |
| `Rekap-Belanja/Priview/index.html` | 216 | `<a href="../index.html">` | `<a href="../index.html">` | normal |

> **Catatan penting:** Semua navigasi antar-halaman ini **intra-grup** — semua file sumber dan target berada di dalam grup yang sama (Admin atau Customer), sehingga path relatif tidak berubah setelah restructure.

---

## 4. Section CROSS-GROUP

**Tidak ditemukan.**

Tidak ada referensi path relatif yang menyeberang dari file di grup Admin ke file di grup Customer, atau sebaliknya. Semua referensi lintas-folder yang ditemukan adalah:
- Referensi ke `config.js` di root (tetap di root, bukan cross-group)
- Referensi ke `assets/images/` di root (tetap di root, bukan cross-group)
- Navigasi intra-grup (Contoh: `Keranjang-Duit/` → `Keranjang-Duit/Priview/`, atau `Riwayat/` → `Riwayat/Mode-Edit/`)

---

## 5. Section ABSOLUTE URL (Tidak Terpengaruh)

| File | Baris | URL | Keterangan |
|---|---|---|---|
| `config.js` | 2 | `https://script.google.com/macros/s/AKfycbwS-AC61xyGpiyXjroP3uBO-M400abUb7aswqyZWSVisD47ce-Ok7wR1dSK-_pENLka/exec` | Apps Script endpoint, tidak dipindah |
| `verify_layout.mjs` | 24 | `http://localhost:8765/Keranjang-Duit/index.html` | Dev server URL, hardcoded path — **perlu update manual** jika folder pindah |
| Semua `script.js` | — | `MORODUIT_CONFIG.APPS_SCRIPT_URL` (variabel) | Endpoint absolut dari config.js, tidak terpengaruh |
| Semua `script.js` | — | `https://wa.me/...` (WhatsApp API) | URL absolut WhatsApp, tidak terpengaruh |

> **Catatan `verify_layout.mjs`:** File ini menggunakan URL absolut `http://localhost:8765/Keranjang-Duit/index.html`. Path `Keranjang-Duit/index.html` di-hardcode dalam URL absolut, bukan path relatif. Setelah restructure, path di dev server juga berubah (`Customer/Keranjang-Duit/index.html`), sehingga **perlu update manual** meskipun ini bukan path relatif.

---

## 6. Section AMBIGU

**Tidak ditemukan.**

Semua file memiliki lokasi yang jelas masuk salah satu grup:
- **Admin:** Input/, Database-Surya/, Input-Sheet-From-Nota/, Riwayat/, Rekap-Belanja/
- **Customer:** Keranjang-Duit/, Perkenalan/
- **Root (tidak dipindah):** Apps-Script/, assets/, graphify-out/, config.js, verify_layout.mjs, *.md, MoroDuit-push.sh, .github/

---

## 7. Analisis Style.css Sharing

`Database-Surya/` dan `Input-Sheet-From-Nota/` berbagi file `Input/style.css` (bukan style.css lokal masing-masing). Setelah restructure, ketiga folder ini tetap berada di dalam `Admin/`:

```
Admin/
├── Input/style.css              ← file CSS
├── Database-Surya/index.html    ← href="../Input/style.css" ✅ benar
└── Input-Sheet-From-Nota/index.html  ← href="../Input/style.css" ✅ benar
```

Path `../Input/style.css` dari `Admin/Database-Surya/` → `Admin/Input/style.css` ✅
Path `../Input/style.css` dari `Admin/Input-Sheet-From-Nota/` → `Admin/Input/style.css` ✅

Tidak perlu perubahan path untuk shared CSS ini.

---

## 8. File yang Tidak Mengandung Referensi Path Relatif

File-file berikut di-scan tetapi **tidak memiliki referensi path relatif lintas folder**:

| File | Alasan |
|---|---|
| `config.js` | Hanya berisi variabel konfigurasi (URL absolut, token) |
| `verify_layout.mjs` | Hanya import dari `playwright` (npm module), URL absolut |
| `Input/script.js` | Hanya fetch ke MORODUIT_CONFIG.APPS_SCRIPT_URL |
| `Database-Surya/script.js` | Hanya fetch ke MORODUIT_CONFIG.APPS_SCRIPT_URL |
| `Input-Sheet-From-Nota/script.js` | Hanya fetch ke MORODUIT_CONFIG.APPS_SCRIPT_URL |
| `Perkenalan/script.js` | Hanya fetch ke MORODUIT_CONFIG.APPS_SCRIPT_URL |
| `Rekap-Belanja/script.js` | Navigate to `Priview/index.html` (intra-grup, tidak berubah) |
| `Rekap-Belanja/Priview/script.js` | Navigate to `../index.html` (intra-grup, tidak berubah) |
| `Riwayat/script.js` | Navigate to `Mode-Edit/index.html` (intra-grup, tidak berubah) |
| `Riwayat/Mode-Edit/script.js` | Navigate to `../index.html` dan `Priview/index.html` (intra-grup) |
| `Riwayat/Mode-Edit/Priview/script.js` | Navigate to `../index.html` (intra-grup) |

---

## 9. Ringkasan Perubahan yang Perlu Dilakukan

### Yang PERLU di-update (11 file, 15 path):

| # | File | Jumlah path | Jenis |
|---|---|---|---|
| 1 | `Input/index.html` | 1 | config.js: `../` → `../../` |
| 2 | `Database-Surya/index.html` | 1 | config.js: `../` → `../../` |
| 3 | `Input-Sheet-From-Nota/index.html` | 1 | config.js: `../` → `../../` |
| 4 | `Keranjang-Duit/index.html` | 1 | config.js: `../` → `../../` |
| 5 | `Keranjang-Duit/script.js` | 1 | assets/images: `../` → `../../` |
| 6 | `Perkenalan/index.html` | 1 | config.js: `../` → `../../` |
| 7 | `Perkenalan/script.js` | 1 | assets/images: `../` → `../../` |
| 8 | `Rekap-Belanja/index.html` | 1 | config.js: `../` → `../../` |
| 9 | `Riwayat/index.html` | 1 | config.js: `../` → `../../` |
| 10 | `Keranjang-Duit/Priview/index.html` | 1 | config.js: `../../` → `../../../` |
| 11 | `Rekap-Belanja/Priview/index.html` | 1 | config.js: `../../` → `../../../` |
| 12 | `Riwayat/Mode-Edit/index.html` | 1 | config.js: `../../` → `../../../` |
| 13 | `Riwayat/Mode-Edit/Priview/index.html` | 1 | config.js: `../../../` → `../../../../` |

### Yang TIDAK perlu di-update (13 file, 13 path):

Semua referensi navigasi intra-grup (lihat Tabel 3.4) — path relatif tetap benar karena direktori sumber dan target berpindah bersama dalam grup yang sama.

---

## 10. Verifikasi

| Check | Hasil |
|---|---|
| Jumlah file `.html`/`.js`/`.mjs` di-scan | 26 (dari 204 tracked, sisanya binary/asset/CSS/JSON/MD/shell) |
| File yang dikecualikan | `Apps-Script/code.gs.js` (dilindungi), `vendor/html2canvas/html2canvas.min.js` (vendor), `assets/images/*` (binary) |
| `git status` | ✅ Bersih — hanya 1 file baru (`DISCOVERY_admin-customer-folder-restructure.md`) |
| `ask_user` dipanggil | Tidak |
| `graphify update` dijalankan | Tidak (sesuai instruksi) |
