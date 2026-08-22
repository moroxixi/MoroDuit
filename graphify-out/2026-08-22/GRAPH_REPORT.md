# Graph Report - MoroDuit  (2026-08-22)

## Corpus Check
- 9 files · ~10,450 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 149 nodes · 197 edges · 21 communities (14 shown, 7 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `19efbcac`
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

## God Nodes (most connected - your core abstractions)
1. `MoroDuit — Rencana Proyek & Task Roadmap` - 10 edges
2. `doPost()` - 6 edges
3. `renderProdukList()` - 6 edges
4. `wA()` - 6 edges
5. `renderProdukList()` - 6 edges
6. `loadKatalog()` - 5 edges
7. `doGet()` - 4 edges
8. `te()` - 4 edges
9. `gs()` - 4 edges
10. `applyFilters()` - 4 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (21 total, 7 thin omitted)

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
Cohesion: 0.31
Nodes (5): escapeHtml(), formatRupiah(), handlePrintError(), renderNota(), resetPrintBtn()

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

## Knowledge Gaps
- **11 isolated node(s):** `MoroDuit-push.sh script`, `1. Ringkasan Proyek`, `2. Keputusan dari Diskusi (Q&A)`, `3. Struktur Folder (Final)`, `Tab 1 — `Katalog`` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `wA()` connect `wA` to `html2canvas.min.js`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `wA()` (e.g. with `B()` and `t()`) actually correct?**
  _`wA()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `MoroDuit-push.sh script`, `1. Ringkasan Proyek`, `2. Keputusan dari Diskusi (Q&A)` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `html2canvas.min.js` be split into smaller, more focused modules?**
  _Cohesion score 0.037037037037037035 - nodes in this community are weakly interconnected._