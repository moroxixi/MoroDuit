# Graph Report - MoroDuit  (2026-08-19)

## Corpus Check
- 8 files · ~6,622 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 49 nodes · 63 edges · 9 communities (8 shown, 1 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8be3612a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- MoroDuit — Rencana Proyek & Task Roadmap
- Keranjang-Duit/script.js
- code.gs.js
- Input/script.js
- Priview/script.js
- 4. Struktur Data — Google Sheet "Toko Sembako Online Moro Duit"
- MoroDuit-push.sh

## God Nodes (most connected - your core abstractions)
1. `MoroDuit — Rencana Proyek & Task Roadmap` - 10 edges
2. `doPost()` - 6 edges
3. `renderProdukList()` - 5 edges
4. `renderProdukList()` - 5 edges
5. `doGet()` - 4 edges
6. `loadKatalog()` - 4 edges
7. `ensureHeaders_()` - 3 edges
8. `validateToken_()` - 3 edges
9. `jsonResponse_()` - 3 edges
10. `renderNota()` - 3 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (9 total, 1 thin omitted)

### Community 0 - "MoroDuit — Rencana Proyek & Task Roadmap"
Cohesion: 0.20
Nodes (9): 1. Ringkasan Proyek, 2. Keputusan dari Diskusi (Q&A), 3. Struktur Folder (Final), 5. Alur Kerja Tiap Halaman, 6. Apps Script Endpoints (`code.gs.js`), 7. Hal yang Perlu Dikonfirmasi/Dikoreksi Sebelum Prompt Disusun, 8. Task Breakdown untuk Freebuff (Dipecah Bertahap), 9. Catatan untuk Sesi Lanjutan (+1 more)

### Community 1 - "Keranjang-Duit/script.js"
Cohesion: 0.44
Nodes (8): attachListeners(), escapeHtml(), formatRupiah(), hideStatus(), loadKatalog(), renderProdukList(), showStatus(), updateTotal()

### Community 2 - "code.gs.js"
Cohesion: 0.54
Nodes (7): doGet(), doPost(), ensureHeaders_(), findProdukRow_(), generateNoNota_(), jsonResponse_(), validateToken_()

### Community 3 - "Input/script.js"
Cohesion: 0.39
Nodes (5): escapeHtml(), formatRupiah(), handleProdukClick(), loadProdukList(), renderProdukList()

### Community 4 - "Priview/script.js"
Cohesion: 0.38
Nodes (3): escapeHtml(), formatRupiah(), renderNota()

### Community 5 - "4. Struktur Data — Google Sheet "Toko Sembako Online Moro Duit""
Cohesion: 0.67
Nodes (3): 4. Struktur Data — Google Sheet "Toko Sembako Online Moro Duit", Tab 1 — `Katalog`, Tab 2 — `Riwayat` *(baru, sesuai keputusan simpan histori)*

## Knowledge Gaps
- **11 isolated node(s):** `MoroDuit-push.sh script`, `1. Ringkasan Proyek`, `2. Keputusan dari Diskusi (Q&A)`, `3. Struktur Folder (Final)`, `Tab 1 — `Katalog`` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MoroDuit — Rencana Proyek & Task Roadmap` connect `MoroDuit — Rencana Proyek & Task Roadmap` to `4. Struktur Data — Google Sheet "Toko Sembako Online Moro Duit"`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `4. Struktur Data — Google Sheet "Toko Sembako Online Moro Duit"` connect `4. Struktur Data — Google Sheet "Toko Sembako Online Moro Duit"` to `MoroDuit — Rencana Proyek & Task Roadmap`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `MoroDuit-push.sh script`, `1. Ringkasan Proyek`, `2. Keputusan dari Diskusi (Q&A)` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._