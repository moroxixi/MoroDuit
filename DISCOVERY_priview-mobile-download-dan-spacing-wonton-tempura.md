# DISCOVERY: Priview Mobile Download Failure & Baseline Spacing Tempura/Wonton

> Tanggal: 2026-08-23
> Investigasi: Bug auto-download PNG di iPhone + baseline spacing untuk task terpisah

---

## 1. State Priview MoroDuit Saat Ini (Post-Edit)

### 1.1 File yang Diperiksa

| File | Lokasi | Status |
|------|--------|--------|
| HTML | `MoroDuit/Keranjang-Duit/Priview/index.html` | ✓ dibaca |
| JS | `MoroDuit/Keranjang-Duit/Priview/script.js` | ✓ dibaca |
| CSS | `MoroDuit/Keranjang-Duit/Priview/style.css` | ✓ dibaca (bukan `style.css`以外 — **konfirmasi: file CSS persis bernama `style.css`**) |

### 1.2 Analisis Lebar Elemen & Potensi Overflow

**Breakpoint yang sudah ada:**

```css
/* style.css — Breakpoint 1: hide subtotal column */
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

/* style.css — Breakpoint 2: allow harga to wrap */
@media (max-width: 400px) {
  .nota-table td.col-harga,
  .nota-table th.col-harga {
    white-space: normal;
    word-break: normal;
    overflow-wrap: anywhere;
  }
}
```

**Elemen-elemen kritis dan sizing-nya:**

| Elemen | Lebar / Constraint | Catatan |
|--------|-------------------|---------|
| `body` | `padding: 1rem` (16px di base 18px) | Padding 16px × 2 = 32px terpakai |
| `main` | `max-width: 700px` | OK untuk mobile, tidak jadi masalah |
| `.nota` | `padding: 2rem` → `1rem` di ≤520px; `overflow-x: auto` | **Ini elemen kunci** — overflow-x: auto memunculkan scroll bar horizontal kalau konten lebih lebar |
| `.nota-table` | `width: 100%`; `table-layout: fixed` | `table-layout: fixed` seharusnya memaksa tabel = 100% width |
| `.nota-table th`, `td` | `padding: 0.75rem 1rem` → `0.5rem 0.5rem` di ≤520px | Total padding horizontal per cell: 2 × 16px = 32px (default) → 2 × 8px = 16px (≤520px) |
| `.col-no` | `width: 40px` (fixed) | |
| `.col-harga` | `white-space: nowrap` (default) → `normal` di ≤400px | **Wrap baru mulai di ≤400px, bukan ≤520px** |
| `.col-subtotal` | Hidden di ≤520px | Menghemat ~20% kolom |
| `.col-qty` | `white-space: nowrap` | **TIDAK pernah wrap** — selalu nowrap di semua breakpoint |
| `.total-value` | `min-width: 120px`; `white-space: nowrap` | **TIDAK pernah wrap** — min-width 120px bisa push tabel melebar |

**Analisis akar masalah overflow (ganti dari sebelumnya):**

Sebelumnya `overflow-x: auto` ditambahkan untuk "menyembunyikan" overflow. Tapi ini hanya mengganti gejala (dari konten keluar kotak → menjadi scrollable). Root cause-nya adalah **beberapa elemen memiliki `white-space: nowrap` + `min-width` yang secara kumulatif melebihi viewport 375-390px**:

1. **`.total-value` punya `min-width: 120px` + `white-space: nowrap`** — di footer tabel, total label "Total Nota" di satu sisi + "Rp 15.565.xxx" di sisi lain. Dengan `text-align: right` di `.total-label` dan `white-space: nowrap`, ini bisa push tabel melebar.

2. **`.col-qty` tidak pernah wrap** — angka kecil sih, tapi bersama kolom lain, padding kumulatif bisa melebihi viewport.

3. **Pada ≤520px**: subtotal column hilanG, tapi padding masih 0.5rem (8px) per cell × 5 kolom = 80px terpakai padding saja, belum isi konten. Dengan `table-layout: fixed`, sisa width dibagi rata ke kolom yang tersisa (No, Produk, Qty, Harga) — tapi kolom `col-no` sudah fix 40px, jadi sisa dibagi ke 3 kolom.

4. **Pada ≤400px**: kolom harga baru diizinkan wrap, tapi kolom lain (qty, dll) masih `nowrap`. Karena `table-layout: fixed`, kalau satu kolom overflow, seluruh tabel bisa terdorong.

### 1.3 Mekanisme Download PNG Saat Ini

Kutipan kode **persis** dari `MoroDuit/Keranjang-Duit/Priview/script.js`:

```javascript
// === Print button click handler ===
printBtn.addEventListener("click", function () {
    printBtn.disabled = true;
    printBtn.textContent = "⏳ Menyimpan & Mengirim...";

    var notaEl = document.getElementById("nota");
    var savedShadow = notaEl.style.boxShadow;
    notaEl.style.boxShadow = "none";

    // Step 1: Capture PNG SYNCHRONOUSLY in user-gesture context
    // (avoids popup-blocker for downstream download + wa.me redirect)
    html2canvas(notaEl).then(function (canvas) {
      notaEl.style.boxShadow = savedShadow;
      var dataURL = canvas.toDataURL("image/png");

      // Step 2: POST simpanRiwayat
      var payload = { /* ... */ };

      fetch(MORODUIT_CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      })
        .then(function (res) { return res.json(); })
        .then(function (response) {
          if (response.success && response.tanggal) {
            tanggalEl.textContent = response.tanggal;
            sessionStorage.removeItem("moroduit_keranjang");

            // Step 3a: Auto-download PNG to device
            var a = document.createElement("a");
            a.href = dataURL;
            a.download = filename;
            document.body.appendChild(a);
            a.click();                                    // ← DOWNLOAD
            document.body.removeChild(a);

            // Step 3b: Redirect to WhatsApp
            location.href = "https://wa.me/" + noWA + "?text=" + encodeURIComponent(ringkasan);
          }
        })
        .catch(function (err) {
          handlePrintError("Gagal menghubungi server...");
        });
    }).catch(function (err) {
      handlePrintError("Gagal membuat screenshot nota.");
    });
});
```

**Struktur call stack download:**

```
User Click (trusted gesture)
  └─ html2canvas().then(...)        ← ASYNC, melepaskan gesture context
       ├─ canvas.toDataURL()
       ├─ fetch().then().then(...)   ← ASYNC NESTED ke-2
       │    └─ response.success
       │         ├─ a.click()        ← DOWNLOAD DI SINI (di dalam .then() NESTED)
       │         └─ location.href    ← REDIRECT
       └─ .catch(...)
```

**Kunci masalah**: Download `a.click()` dipanggil di dalam **dua level Promise chain** `.then()` — bukan langsung dari event handler. Di iOS Safari/Chrome, "trusted user gesture" yang diperlukan untuk mengizinkan automatic download **tidak berlaku** setelah Promise chain resolve secara asynchronous. Browser menganggap `a.click()` ini sebagai "untrusted programmatic action" → diblokir.

### 1.4 Catatan Tambahan: `captureAndDownloadNota()`

Ada fungsi `captureAndDownloadNota()` di script.js yang **tidak dipanggil dari mana pun** dalam kode aktif — hanya didefinisikan. Fungsi ini punya masalah yang sama (download di dalam `.then()` callback):

```javascript
// === Screenshot & auto-download nota === (script.js, baris ~115)
function captureAndDownloadNota(noNota) {
    // ...
    return html2canvas(notaEl)
      .then(function (canvas) {
        canvas.toBlob(function (blob) {          // ← ASYNC ke-2
          var url = URL.createObjectURL(blob);
          var a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();                              // ← DOWNLOAD di dalam toBlob callback
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, "image/png");
      })
      .catch(function (err) { /* ... */ })
      .finally(function () { /* restore shadow */ });
}
```

Fungsi ini menggunakan `canvas.toBlob()` (callback-based, lebih async lagi) → bahkan lebih buruk dari versi utama.

---

## 2. Mekanisme Screenshot & Download di Work/Tempura

### 2.1 File Diperiksa

| File | Lokasi |
|------|--------|
| HTML (dengan JS inline) | `Work/Tempura/index.html` |
| Config | `Work/Wonton/Config/config.js` (shared) |
| CSS | Inline `<style>` di `index.html` |

### 2.2 Kode Download Persis

Dari `Work/Tempura/index.html`, fungsi `ambilScreenshot()`:

```javascript
function ambilScreenshot() {
    const area = document.getElementById('captureArea');
    html2canvas(area).then(canvas => {
        const link = document.createElement('a');
        link.download = `SETORAN_${document.getElementById('cabang').value}_${new Date().getTime()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    });
}
```

Dipanggil dari:
```html
<button class="btn-ss" id="btnSS" onclick="ambilScreenshot()">3. AMBIL SCREENSHOT</button>
```

**Struktur call stack download:**

```
User Click (trusted gesture)
  └─ ambilScreenshot()              ← Fungsi dipanggil langsung dari onclick
       └─ html2canvas().then(...)   ← ASYNC, melepaskan gesture context
            └─ link.click()         ← DOWNLOAD DI SINI (di dalam .then() TUNGGAL)
```

### 2.3 Library

```html
<script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
```

Library: **html2canvas** (CDN hertzen.com).

### 2.4 Observasi

Download juga dipanggil di dalam `.then()` async — **struktur mirip dengan MoroDuit**, namun ada **perbedaan kritis**: Tempura hanya punya **satu level Promise chain** (html2canvas → .then → link.click()), sedangkan MoroDuit punya **dua level** (html2canvas → .then → fetch → .then → .then → a.click()).

Tempura juga tidak menggabungkan download dengan POST/fetch ke server — tombol "KIRIM KE DATABASE" adalah tombol terpisah (`kirimLaporan()`), download dipicu tombol terpisah ("AMBIL SCREENSHOT").

---

## 3. Mekanisme Screenshot & Download di Work/Wonton

### 3.1 File Diperiksa

| File | Lokasi |
|------|--------|
| HTML (dengan JS inline) | `Work/Wonton/index.html` |
| Config | `Work/Wonton/Config/config.js` |
| CSS | Inline `<style>` di `index.html` |

### 3.2 Kode Download Persis

Dari `Work/Wonton/index.html`, fungsi `ambilScreenshot()`:

```javascript
function ambilScreenshot() {
    html2canvas(document.getElementById('captureArea')).then(canvas => {
        const link = document.createElement('a');
        link.download = `WONTON_${document.getElementById('cabang').value}_${new Date().getTime()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    });
}
```

Dipanggil dari:
```html
<button class="btn-ss" id="btnSS" onclick="ambilScreenshot()">3. AMBIL SCREENSHOT</button>
```

**Struktur call stack download:**

```
User Click (trusted gesture)
  └─ ambilScreenshot()              ← Fungsi dipanggil langsung dari onclick
       └─ html2canvas().then(...)   ← ASYNC, melepaskan gesture context
            └─ link.click()         ← DOWNLOAD DI SINI (di dalam .then() TUNGGAL)
```

### 3.3 Library

```html
<script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
```

Library: **html2canvas** (CDN hertzen.com) — **identik dengan Tempura**.

### 3.4 Config.js

```javascript
// Work/Wonton/Config/config.js
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzxqgSvV98VdERSk7I5osS0DvF01Qacu6GzPC75bBVO84elteIxiFuvvBmLWjoZZdyV/exec";
```

Config shared antara Tempura & Wonton.

---

## 4. Perbandingan Eksplisit: MoroDuit vs Tempura vs Wonton

### 4.1 Tabel Perbandingan

| Aspek | MoroDuit Priview | Tempura | Wonton |
|-------|------------------|---------|--------|
| **Library screenshot** | html2canvas (local file: `vendor/html2canvas/html2canvas.min.js`) | html2canvas (CDN: `hertzen.com`) | html2canvas (CDN: `hertzen.com`) |
| **Mekanisme trigger download** | Anchor `<a>` + `download` attribute + `.click()` | Anchor `<a>` + `download` attribute + `.click()` | Anchor `<a>` + `download` attribute + `.click()` |
| **Jumlah .then() nesting** | **2 level**: html2canvas → .then → fetch → .then → .then → a.click() | **1 level**: html2canvas → .then → link.click() | **1 level**: html2canvas → .then → link.click() |
| **Download dipanggil dari** | Di dalam `.then()` **kedua** dari `fetch()` (setelah POST ke Apps Script berhasil) | Di dalam `.then()` **tunggal** dari `html2canvas()` | Di dalam `.then()` **tunggal** dari `html2canvas()` |
| **Antara click → download ada** | 1. `html2canvas()` (async) 2. `fetch()` POST (async) 3. `res.json()` (async) — **3 operasi async** | 1. `html2canvas()` (async) — **1 operasi async** | 1. `html2canvas()` (async) — **1 operasi async** |
| **Download gabung dengan POST?** | **Ya** — download & redirect WA terjadi di dalam callback setelah POST sukses | **Tidak** — tombol download terpisah dari tombol kirim | **Tidak** — tombol download terpisah dari tombol kirim |
| **Fallback (buka di tab baru)** | **Tidak ada** | **Tidak ada** | **Tidak ada** |
| **Nama file download** | `nota-{noNota}.png` | `SETORAN_{cabang}_{timestamp}.png` | `WONTON_{cabang}_{timestamp}.png` |

### 4.2 Hipotesis: Kenapa MoroDuit Gagal, Tempura/Wonton Berhasil

**Hipotesis paling mungkin: Nesting depth Promise chain**

MoroDuit memanggil `a.click()` di dalam **2 level Promise nesting** (`html2canvas().then(...).then(...).then(...)`), sementara Tempura/Wonton hanya **1 level** (`html2canvas().then(...)`).

Perilaku iOS Safari/Chrome yang relevan:
- **iOS Safari** membatasi automatic download. Link download harus dipicu dari konteks "trusted user gesture".
- Ketika `a.click()` dipanggil langsung dari `onclick` handler → **trusted**.
- Ketika dipanggil dari `.then()` async callback → **gesture context sudah hilang**, tapi beberapa browser masih mengizinkannya kalau hanya 1 hop async.
- Ketika dipanggil dari `.then()` di **dalam** `.then()` lain (2+ hops async) → kemungkinan besar **diblokir**.

**Dukungan hipotesis dari kode:**

- MoroDuit: User click → `printBtn.addEventListener("click", ...)` → `html2canvas().then(callback1)` → `fetch().then(callback2).then(callback3)` → `a.click()`
  - **3 hop async** (html2canvas resolve → fetch start → fetch resolve → json parse → a.click)
  
- Tempura/Wonton: User click → `onclick="ambilScreenshot()"` → `html2canvas().then(callback)` → `link.click()`
  - **1 hop async** (html2canvas resolve → link.click)

**Perbedaan sekunder yang mungkin berkontribusi:**
- MoroDuit menggunakan html2canvas **lokal** (`vendor/html2canvas/`), Tempura/Wonton menggunakan **CDN**. Kemungkinan kecil berbeda versi, tapi perlu dicek.
- MoroDuit memanggil `document.body.appendChild(a)` → `a.click()` → `document.body.removeChild(a)`, sementara Tempura/Wonton tidak melakukan append/remove (hanya `link.click()`). Manipulasi DOM ini dilakukan **dalam callback async**, yang mungkin menjadi indikator tambahan bahwa ini bukan trusted gesture di iOS.

### 4.3 Perbedaan Arsitektural Lainnya

| Aspek | MoroDuit | Tempura/Wonton |
|-------|----------|----------------|
| JS | File terpisah (`script.js`) + `config.js` | Inline `<script>` di `index.html` + `Config/config.js` |
| CSS | File terpisah (`style.css`) | Inline `<style>` di `index.html` |
| Fungsi download | Tergabung dalam handler "Kirim Pesanan" (POST + download + redirect WA) | Fungsi terpisah `ambilScreenshot()` |
| Tombol | 1 tombol utama ("Kirim Pesanan") menjalankan semua | 3 tombol terpisah: Hitung, Kirim, Screenshot |

---

## 5. Baseline Spacing/Padding Laporan Tempura & Wonton

> Catatan: Spacing ini untuk task TERPISAH — user ingin menambah spacing di laporan Wonton/Tempura yang terlihat "terlalu mepet".

### 5.1 Tempura — CSS Spacing Baseline

**File: `Work/Tempura/index.html` (inline `<style>`)**

| Elemen | Property | Nilai Aktual |
|--------|----------|-------------|
| `.container` | `padding` | `20px` (desktop) → `14px` (≤480px) |
| `.container` | `border-radius` | `15px` (desktop) → `10px` (≤480px) |
| `h2` (judul) | `margin-bottom` | `20px` (desktop) → `14px` (≤480px) |
| `.section-title` | `margin` | `15px 0 10px` (desktop) → `10px 0 8px` (≤480px) |
| `.report-table th, td` | `padding` | `8px` (semua ukuran) |
| `.report-table` | `margin-bottom` | `15px` |
| `.report-table th` | `background` | `#fdf2e9` (kuning muda) |
| `.total-highlight` | `margin-bottom` | `8px` (inline style) |
| `.rincian-box` | `padding` | `10px` |
| `.rincian-box` | `border-radius` | `5px` |
| `.rincian-box` | `font-size` | `0.9em` |
| `.rincian-row` | `padding` | `3px 0` |
| `.rincian-divider` | `margin` | `6px 0` |
| `#selisih_box` | `margin-top` | `5px` (inline style) |
| `#selisih_box` | `padding` | `5px` (inline style) |
| `h3` (LAPORAN header) | `style` | `text-align:center; color: #d35400;` (inline) |
| `p` (rep_info) | `style` | `font-size:0.8em; text-align:center;` (inline) |

**Report area (captureArea) — elemen yang di-screenshot:**
- `#captureArea` = div wrapper, **tidak ada padding/margin explicit** dari CSS → default 0
- Konten: `h3` → `p` → `table` → `total-highlight div` → `rincian-box div`

### 5.2 Wonton — CSS Spacing Baseline

**File: `Work/Wonton/index.html` (inline `<style>`)**

| Elemen | Property | Nilai Aktual |
|--------|----------|-------------|
| `.container` | `padding` | `20px` (desktop) → `14px` (≤480px) |
| `.container` | `border-radius` | `15px` (desktop) → `10px` (≤480px) |
| `h2` (judul) | `margin-bottom` | `20px` (desktop) → `14px` (≤480px) |
| `.section-title` | `margin` | `15px 0 10px` (desktop) → `10px 0 8px` (≤480px) |
| `.report-table th, td` | `padding` | `8px` (semua ukuran) |
| `.report-table` | `margin-bottom` | `15px` |
| `.report-table th` | `background` | `#eaf2f8` (biru muda) |
| `.total-highlight` | `margin-bottom` | `8px` (inline style) |
| `.rincian-box` | `padding` | `10px` |
| `.rincian-box` | `border-radius` | `5px` |
| `.rincian-box` | `font-size` | `0.9em` |
| `.rincian-row` | `padding` | `3px 0` |
| `.rincian-divider` | `margin` | `6px 0` |
| `#selisih_box` | `margin-top` | `5px` (inline style) |
| `#selisih_box` | `padding` | `5px` (inline style) |
| `h3` (LAPORAN header) | `style` | `text-align:center; color: #2980b9;` (inline) |
| `p` (rep_info) | `style` | `font-size:0.8em; text-align:center;` (inline) |

**Report area (captureArea) — elemen yang di-screenshot:**
- `#captureArea` = div wrapper, **tidak ada padding/margin explicit**
- Konten: `h3` → `p` → `table` → `total-highlight div` → `rincian-box div`

### 5.3 Ringkasan Baseline Spacing

Kedua aplikasi (Tempura & Wonton) memiliki spacing yang **hampir identik** untuk komponen report:

| Level | Elemen | Spacing |
|-------|--------|---------|
| Container terluar | `.container` | `padding: 20px` |
| Heading report | `h3` | default (tidak ada margin explicit, bawaan browser ~16px top/bottom) |
| Info line | `p#rep_info` | default (bawaan browser ~16px top/bottom) |
| Tabel | `.report-table` | `margin-bottom: 15px`; cells `padding: 8px` |
| Omset highlight | `.total-highlight` | `margin-bottom: 8px` |
| Rincian box | `.rincian-box` | `padding: 10px`; rows `padding: 3px 0` |
| Divider | `.rincian-divider` | `margin: 6px 0` |
| Selisih box | `#selisih_box` | `margin-top: 5px`; `padding: 5px` |

**Yang perlu diperhatikan untuk spacing task terpisah:**
- Cell padding `8px` di tabel = cukup rapat, mungkin perlu dinaikkan ke `10-12px`
- Rincian row padding `3px 0` = sangat rapat, mungkin perlu `6-8px`
- Tidak ada spacing antara heading h3 dan info p (bergantung pada browser default margin)
- `#captureArea` tidak punya padding sendiri (content mulai dari tepi)

---

## Ringkasan Temuan Kunci

1. **Download mechanism MoroDuit terlalu async**: `a.click()` dipanggil di dalam **2 level Promise nesting** (html2canvas → fetch POST → .then → .then → a.click), sedangkan Tempura/Wonton hanya **1 level** (html2canvas → .then → link.click).

2. **Root cause hipotesis paling mungkin**: iOS Safari/Chrome memblokir automatic download karena `a.click()` dipanggil dari konteks **trusted gesture** yang sudah **hilang setelah 3 operasi async** (html2canvas resolve + fetch + json parse). Tempura/Wonton hanya 1 operasi async, sehingga gesture context masih "cukup dekat" dengan user click untuk diizinkan browser.

3. **Tempura/Wonton memisahkan tombol**: Screenshot = tombol terpisah, kirim ke database = tombol terpisah. MoroDuit **menggabungkan** POST + download + redirect WA dalam **1 tombol**, membuat chain lebih panjang.

4. **CSS overflow belum benar-benar teratasi**: `overflow-x: auto` hanya menambahkan scrollbar horizontal, bukan mencegah konten melebihi viewport. Akar masalah: `white-space: nowrap` pada kolom `col-qty`, `min-width: 120px` pada `total-value`, dan padding kumulatif yang tidak dikompensasi dengan width constraint yang memadai.

5. **Pada ≤520px**, subtotal column di-hide dan padding dikurangi, tapi `col-qty` masih `nowrap` dan `total-value` masih `min-width: 120px` + `nowrap`.

6. **Pada ≤400px**, kolom harga baru diizinkan wrap, tapi kolom lain masih nowrap — ini terlalu terlambat.

7. **Tempura & Wonton menggunakan CDN html2canvas** (`hertzen.com`), MoroDuit menggunakan **local file** (`vendor/html2canvas/`). Kemungkinan beda versi, tapi impact kecil terhadap bug download.

8. **Baseline spacing Tempura & Wonton hampir identik**: cell padding 8px, rincian row padding 3px 0, rincian-box padding 10px. Task terpisah perlu menambah spacing di tabel dan rincian rows.

9. **Tidak ada fallback mechanism** di ketiga aplikasi — kalau `a.click()` gagal, tidak ada alternatif seperti `window.open()` atau `navigator.share()`.

10. **Bug download MoroDuit kemungkinan besar bisa diperbaiki** dengan: (a) memisahkan tombol download dari tombol POST, atau (b) memanggil `a.click()` langsung dari `html2canvas().then()` tanpa menunggu fetch POST selesai, atau (c) menggunakan Web Share API sebagai fallback di iOS.

---

*Generated by Buffy for Codebuff — 2026-08-23*
