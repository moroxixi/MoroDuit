# Graph Report - MoroDuit  (2026-08-25)

## Corpus Check
- 18 files · ~29,649 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 387 nodes · 487 edges · 50 communities (37 shown, 13 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `739f0da9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- MoroDuit — Rencana Proyek & Task Roadmap
- Keranjang-Duit/script.js
- code.gs.js
- Input/script.js
- Priview/script.js
- MoroDuit-push.sh
- wA
- te
- gs
- on
- UA
- xB
- A
- an
- Be
- dA
- Kr
- Lr
- Perkenalan/script.js
- DISCOVERY: Harga Jual & Priview Mobile — MoroDuit
- DISCOVERY: Priview Mobile Download Failure & Baseline Spacing Tempura/Wonton
- DISCOVERY: Mekanisme Riwayat, Mode-Edit & Repush — MoroDuit
- Mode-Edit/script.js
- 10. Ringkasan Akhir: `doPost()` — Append-Only atau Sudah Support Update?
- Riwayat/script.js
- 3. Alur `doPost()` Lengkap Saat Ini
- wA
- Mode-Edit/Priview/script.js
- 4. Alur `doGet()` Lengkap Saat Ini
- 6. Mekanisme Passing Data Keranjang → Priview
- 1. Struktur Sheet "Riwayat" — Kolom Persis & Tipe Data
- 7. Mekanisme Tombol "Kembali" di Priview
- 8. Mekanisme `initWhatsAppLink()` dan `renderNota()` di Priview
- 2. Format & Pola Generate No Nota (`generateNoNota_()`)
- 5. Fungsi `findProdukRow_()` — Cari Row Apa?
- te
- gs
- on
- UA
- xB
- A
- an
- Be
- dA
- Kr
- Lr

## God Nodes (most connected - your core abstractions)
1. `DISCOVERY: Mekanisme Riwayat, Mode-Edit & Repush — MoroDuit` - 12 edges
2. `MoroDuit — Rencana Proyek & Task Roadmap` - 10 edges
3. `DISCOVERY: Harga Jual & Priview Mobile — MoroDuit` - 9 edges
4. `loadKatalog()` - 8 edges
5. `doPost()` - 7 edges
6. `renderProdukList()` - 7 edges
7. `DISCOVERY: Priview Mobile Download Failure & Baseline Spacing Tempura/Wonton` - 7 edges
8. `renderProdukList()` - 6 edges
9. `wA()` - 6 edges
10. `wA()` - 6 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (50 total, 13 thin omitted)

### Community 0 - "MoroDuit — Rencana Proyek & Task Roadmap"
Cohesion: 0.15
Nodes (12): 1. Ringkasan Proyek, 2. Keputusan dari Diskusi (Q&A), 3. Struktur Folder (Final), 4. Struktur Data — Google Sheet "Toko Sembako Online Moro Duit", 5. Alur Kerja Tiap Halaman, 6. Apps Script Endpoints (`code.gs.js`), 7. Hal yang Perlu Dikonfirmasi/Dikoreksi Sebelum Prompt Disusun, 8. Task Breakdown untuk Freebuff (Dipecah Bertahap) (+4 more)

### Community 1 - "Keranjang-Duit/script.js"
Cohesion: 0.23
Nodes (15): applyFilters(), attachListeners(), escapeHtml(), formatRupiah(), getFilteredData(), hideStatus(), loadKatalog(), populateKategoriFilter() (+7 more)

### Community 2 - "code.gs.js"
Cohesion: 0.47
Nodes (8): doGet(), doPost(), ensureHeaders_(), findProdukRow_(), findRiwayatRows_(), generateNoNota_(), jsonResponse_(), validateToken_()

### Community 3 - "Input/script.js"
Cohesion: 0.33
Nodes (8): applyFilters(), escapeHtml(), formatRupiah(), getFilteredData(), handleProdukClick(), loadProdukList(), populateKategoriFilter(), renderProdukList()

### Community 4 - "Priview/script.js"
Cohesion: 0.43
Nodes (4): escapeHtml(), formatRupiah(), initWhatsAppLink(), renderNota()

### Community 9 - "wA"
Cohesion: 0.25
Nodes (8): B(), E(), I(), p(), SUPPORT_RANGE_BOUNDS(), SUPPORT_WORD_BREAKING(), t(), wA()

### Community 10 - "te"
Cohesion: 0.50
Nodes (4): ee(), He(), te(), ye()

### Community 11 - "gs"
Cohesion: 0.50
Nodes (4): gs(), ns(), rs(), ts()

### Community 12 - "on"
Cohesion: 0.67
Nodes (3): cn(), on(), Qn()

### Community 13 - "UA"
Cohesion: 0.67
Nodes (3): FA(), lA(), UA()

### Community 14 - "xB"
Cohesion: 0.67
Nodes (3): fe(), oe(), xB()

### Community 21 - "Perkenalan/script.js"
Cohesion: 0.83
Nodes (3): escapeHtml(), formatRupiah(), loadProdukPerkenalan()

### Community 22 - "DISCOVERY: Harga Jual & Priview Mobile — MoroDuit"
Cohesion: 0.07
Nodes (26): 1.1 Semua Referensi Nama Sheet di `Apps-Script/code.gs.js`, 1.2 Konfirmasi Tab "Riwayat", 1.3 Formula Kalkulasi Margin di Tab Riwayat (POLA ACUAN), 1.4 Kapan Margin Disimpan sebagai NILAI FINAL vs FORMULA, 1. Struktur Google Sheet & Tab "Riwayat", 2.1 `doGet()` — Lengkap, 2.2 `doPost()` — Lengkap, 2.3 Kolom Katalog — Harga Normal vs Harga Jual vs Formula (+18 more)

### Community 23 - "DISCOVERY: Priview Mobile Download Failure & Baseline Spacing Tempura/Wonton"
Cohesion: 0.08
Nodes (25): 1.1 File yang Diperiksa, 1.2 Analisis Lebar Elemen & Potensi Overflow, 1.3 Mekanisme Download PNG Saat Ini, 1.4 Catatan Tambahan: `captureAndDownloadNota()`, 1. State Priview MoroDuit Saat Ini (Post-Edit), 2.1 File Diperiksa, 2.2 Kode Download Persis, 2.3 Library (+17 more)

### Community 24 - "DISCOVERY: Mekanisme Riwayat, Mode-Edit & Repush — MoroDuit"
Cohesion: 0.29
Nodes (6): 9.1 Lokasi & Pemanggilan, 9.2 Fungsi yang Menggunakannya, 9.3 Reusable untuk Folder Priview Baru?, 9. Dependency `html2canvas.min.js`, Catatan & Anomali, DISCOVERY: Mekanisme Riwayat, Mode-Edit & Repush — MoroDuit

### Community 25 - "Mode-Edit/script.js"
Cohesion: 0.23
Nodes (13): attachItemListeners(), escapeHtml(), formatRupiah(), handleAddProduct(), handleLanjut(), init(), loadKatalog(), recalcAndRender() (+5 more)

### Community 26 - "10. Ringkasan Akhir: `doPost()` — Append-Only atau Sudah Support Update?"
Cohesion: 0.40
Nodes (5): 10.1 Status Saat Ini: MURNI APPEND-ONLY untuk Riwayat, 10.2 Perbandingan: `updateProduk` Sudah Punya Pola Update, 10.3 Kesenjangan untuk Fitur Mode-Edit + Repush, 10.4 Status God Node (untuk Referensi Task Lanjutan), 10. Ringkasan Akhir: `doPost()` — Append-Only atau Sudah Support Update?

### Community 27 - "Riwayat/script.js"
Cohesion: 0.40
Nodes (9): escapeHtml(), formatRupiah(), formatTanggalIndo(), groupByNoNota(), handleCardClick(), hideStatus(), loadRiwayat(), renderRiwayat() (+1 more)

### Community 28 - "3. Alur `doPost()` Lengkap Saat Ini"
Cohesion: 0.40
Nodes (5): 3.1 Struktur Umum, 3.2 Action: `updateProduk`, 3.3 Action: `simpanRiwayat`, 3.4 Ringkasan Validasi, 3. Alur `doPost()` Lengkap Saat Ini

### Community 30 - "wA"
Cohesion: 0.25
Nodes (8): B(), E(), I(), p(), SUPPORT_RANGE_BOUNDS(), SUPPORT_WORD_BREAKING(), t(), wA()

### Community 31 - "Mode-Edit/Priview/script.js"
Cohesion: 0.43
Nodes (4): escapeHtml(), formatRupiah(), initWhatsAppLink(), renderNota()

### Community 32 - "4. Alur `doGet()` Lengkap Saat Ini"
Cohesion: 0.33
Nodes (6): 4.1 Struktur Umum, 4.2 Action: `getKatalog`, 4.3 Action: `getKatalogFull`, 4.4 Action: `getKatalogPerkenalan`, 4.5 Yang BELUM Ada di `doGet()`, 4. Alur `doGet()` Lengkap Saat Ini

### Community 33 - "6. Mekanisme Passing Data Keranjang → Priview"
Cohesion: 0.33
Nodes (6): 6.1 Media: `sessionStorage`, 6.2 Key yang Digunakan, 6.3 Struktur Data `moroduit_keranjang`, 6.4 Proses Checkout (Keranjang-Duit/script.js), 6.5 Proses Baca (Priview/script.js), 6. Mekanisme Passing Data Keranjang → Priview

### Community 34 - "1. Struktur Sheet "Riwayat" — Kolom Persis & Tipe Data"
Cohesion: 0.40
Nodes (5): 1.1 Header yang Didefinisikan oleh `ensureHeaders_()`, 1.2 Kolom Lengkap (termasuk kolom formula yang di-auto-fill oleh `simpanRiwayat`), 1.3 Formula Kolom I & J (auto-fill), 1.4 Catatan: Satu Baris = Satu Item, 1. Struktur Sheet "Riwayat" — Kolom Persis & Tipe Data

### Community 35 - "7. Mekanisme Tombol "Kembali" di Priview"
Cohesion: 0.40
Nodes (5): 7.1 Elemen HTML, 7.2 Handler, 7.3 Analisis, 7.4 Error State Link, 7. Mekanisme Tombol "Kembali" di Priview

### Community 36 - "8. Mekanisme `initWhatsAppLink()` dan `renderNota()` di Priview"
Cohesion: 0.40
Nodes (5): 8.1 `initWhatsAppLink()` — Generate Link WA, 8.2 Kapan Link WA Di-update, 8.3 `renderNota()` — Render Tabel Nota, 8.4 Replikasi untuk Mode-Edit Priview, 8. Mekanisme `initWhatsAppLink()` dan `renderNota()` di Priview

### Community 37 - "2. Format & Pola Generate No Nota (`generateNoNota_()`)"
Cohesion: 0.50
Nodes (4): 2.1 Format, 2.2 Mekanisme Hitung Sequence, 2.3 Potensi Dipakai sebagai Identifier Cari Baris, 2. Format & Pola Generate No Nota (`generateNoNota_()`)

### Community 38 - "5. Fungsi `findProdukRow_()` — Cari Row Apa?"
Cohesion: 0.50
Nodes (4): 5.1 Definisi, 5.2 Analisis, 5.3 Potensi Dipakai untuk Cari Row Transaksi di Riwayat, 5. Fungsi `findProdukRow_()` — Cari Row Apa?

### Community 39 - "te"
Cohesion: 0.50
Nodes (4): ee(), He(), te(), ye()

### Community 40 - "gs"
Cohesion: 0.50
Nodes (4): gs(), ns(), rs(), ts()

### Community 41 - "on"
Cohesion: 0.67
Nodes (3): cn(), on(), Qn()

### Community 42 - "UA"
Cohesion: 0.67
Nodes (3): FA(), lA(), UA()

### Community 43 - "xB"
Cohesion: 0.67
Nodes (3): fe(), oe(), xB()

## Knowledge Gaps
- **90 isolated node(s):** `MoroDuit-push.sh script`, `1.1 Semua Referensi Nama Sheet di `Apps-Script/code.gs.js``, `1.2 Konfirmasi Tab "Riwayat"`, `1.3 Formula Kalkulasi Margin di Tab Riwayat (POLA ACUAN)`, `1.4 Kapan Margin Disimpan sebagai NILAI FINAL vs FORMULA` (+85 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DISCOVERY: Mekanisme Riwayat, Mode-Edit & Repush — MoroDuit` connect `DISCOVERY: Mekanisme Riwayat, Mode-Edit & Repush — MoroDuit` to `4. Alur `doGet()` Lengkap Saat Ini`, `6. Mekanisme Passing Data Keranjang → Priview`, `1. Struktur Sheet "Riwayat" — Kolom Persis & Tipe Data`, `7. Mekanisme Tombol "Kembali" di Priview`, `8. Mekanisme `initWhatsAppLink()` dan `renderNota()` di Priview`, `2. Format & Pola Generate No Nota (`generateNoNota_()`)`, `5. Fungsi `findProdukRow_()` — Cari Row Apa?`, `10. Ringkasan Akhir: `doPost()` — Append-Only atau Sudah Support Update?`, `3. Alur `doPost()` Lengkap Saat Ini`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `MoroDuit-push.sh script`, `1.1 Semua Referensi Nama Sheet di `Apps-Script/code.gs.js``, `1.2 Konfirmasi Tab "Riwayat"` to the rest of the system?**
  _90 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `html2canvas.min.js` be split into smaller, more focused modules?**
  _Cohesion score 0.037037037037037035 - nodes in this community are weakly interconnected._
- **Should `DISCOVERY: Harga Jual & Priview Mobile — MoroDuit` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `DISCOVERY: Priview Mobile Download Failure & Baseline Spacing Tempura/Wonton` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `Mode-Edit/Priview/vendor/html2canvas/html2canvas.min.js` be split into smaller, more focused modules?**
  _Cohesion score 0.037037037037037035 - nodes in this community are weakly interconnected._