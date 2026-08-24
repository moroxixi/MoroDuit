# Graph Report - MoroDuit  (2026-08-24)

## Corpus Check
- 13 files · ~18,055 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 204 nodes · 251 edges · 24 communities (17 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8d66e216`
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

## God Nodes (most connected - your core abstractions)
1. `MoroDuit — Rencana Proyek & Task Roadmap` - 10 edges
2. `DISCOVERY: Harga Jual & Priview Mobile — MoroDuit` - 9 edges
3. `DISCOVERY: Priview Mobile Download Failure & Baseline Spacing Tempura/Wonton` - 7 edges
4. `doPost()` - 6 edges
5. `renderProdukList()` - 6 edges
6. `wA()` - 6 edges
7. `renderProdukList()` - 6 edges
8. `loadKatalog()` - 5 edges
9. `1. Struktur Google Sheet & Tab "Riwayat"` - 5 edges
10. `2. `doPost()` dan `doGet()` di `code.gs.js`` - 5 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (24 total, 7 thin omitted)

### Community 0 - "MoroDuit — Rencana Proyek & Task Roadmap"
Cohesion: 0.15
Nodes (12): 1. Ringkasan Proyek, 2. Keputusan dari Diskusi (Q&A), 3. Struktur Folder (Final), 4. Struktur Data — Google Sheet "Toko Sembako Online Moro Duit", 5. Alur Kerja Tiap Halaman, 6. Apps Script Endpoints (`code.gs.js`), 7. Hal yang Perlu Dikonfirmasi/Dikoreksi Sebelum Prompt Disusun, 8. Task Breakdown untuk Freebuff (Dipecah Bertahap) (+4 more)

### Community 1 - "Keranjang-Duit/script.js"
Cohesion: 0.32
Nodes (12): applyFilters(), attachListeners(), escapeHtml(), formatRupiah(), getFilteredData(), hideStatus(), loadKatalog(), populateKategoriFilter() (+4 more)

### Community 2 - "code.gs.js"
Cohesion: 0.54
Nodes (7): doGet(), doPost(), ensureHeaders_(), findProdukRow_(), generateNoNota_(), jsonResponse_(), validateToken_()

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

## Knowledge Gaps
- **50 isolated node(s):** `MoroDuit-push.sh script`, `1.1 Semua Referensi Nama Sheet di `Apps-Script/code.gs.js``, `1.2 Konfirmasi Tab "Riwayat"`, `1.3 Formula Kalkulasi Margin di Tab Riwayat (POLA ACUAN)`, `1.4 Kapan Margin Disimpan sebagai NILAI FINAL vs FORMULA` (+45 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `MoroDuit-push.sh script`, `1.1 Semua Referensi Nama Sheet di `Apps-Script/code.gs.js``, `1.2 Konfirmasi Tab "Riwayat"` to the rest of the system?**
  _50 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `html2canvas.min.js` be split into smaller, more focused modules?**
  _Cohesion score 0.037037037037037035 - nodes in this community are weakly interconnected._
- **Should `DISCOVERY: Harga Jual & Priview Mobile — MoroDuit` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `DISCOVERY: Priview Mobile Download Failure & Baseline Spacing Tempura/Wonton` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._