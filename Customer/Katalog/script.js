/* ══════════════════════════════════════════════════════════════════════
   MoroDuit Katalog — Browse-only product catalog
   Fetch getKatalogFull, filter client-side (status="Ada"),
   search by nama produk + kategori, chip filter by kategori
   ══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── DOM refs ───────────────────────────────────────────────────────
  var loadingIndicator = document.getElementById("loadingIndicator");
  var produkGrid = document.getElementById("produkGrid");
  var searchInput = document.getElementById("searchInput");
  var kategoriChips = document.getElementById("kategoriChips");

  // ── State ──────────────────────────────────────────────────────────
  var produkData = [];       // All products with status "Ada", sorted A-Z
  var activeKategori = "";   // Empty = show all

  // ── Helpers ────────────────────────────────────────────────────────

  function formatRupiah(val) {
    var num = Number(val);
    if (isNaN(num)) return val;
    return "Rp " + Math.ceil(num).toLocaleString("id-ID");
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ── Get filtered data (search text + kategori chip, AND logic) ─────
  function getFilteredData() {
    var query = searchInput.value.trim().toLowerCase();

    return produkData.filter(function (p) {
      // Search filter: case-insensitive substring match on produk AND kategori
      if (query !== "") {
        var namaProduk = (p.produk || "").toLowerCase();
        var namaKategori = (p.kategori || "").toLowerCase();
        var matchProduk = namaProduk.indexOf(query) !== -1;
        var matchKategori = namaKategori.indexOf(query) !== -1;
        if (!matchProduk && !matchKategori) return false;
      }
      // Kategori chip filter: exact match (empty = show all)
      if (activeKategori !== "") {
        var kategori = (p.kategori && p.kategori.trim() !== "")
          ? p.kategori.trim() : "Lainnya";
        if (kategori !== activeKategori) return false;
      }
      return true;
    });
  }

  // ── Populate kategori chips from data ──────────────────────────────
  function populateKategoriChips() {
    var kategoriSet = {};
    for (var i = 0; i < produkData.length; i++) {
      var k = (produkData[i].kategori && produkData[i].kategori.trim() !== "")
        ? produkData[i].kategori.trim() : "Lainnya";
      kategoriSet[k] = true;
    }
    var sorted = Object.keys(kategoriSet).sort(function (a, b) {
      if (a === "Lainnya") return 1;
      if (b === "Lainnya") return -1;
      return a.localeCompare(b);
    });

    // "Semua" chip first
    var html = '<button class="kategori-chip active" data-kategori="">Semua</button>';
    for (var j = 0; j < sorted.length; j++) {
      html += '<button class="kategori-chip" data-kategori="'
            + escapeHtml(sorted[j]) + '">'
            + escapeHtml(sorted[j]) + '</button>';
    }
    kategoriChips.innerHTML = html;

    // Attach click listeners
    var chips = kategoriChips.querySelectorAll(".kategori-chip");
    for (var c = 0; c < chips.length; c++) {
      chips[c].addEventListener("click", function () {
        // Update active state
        var allChips = kategoriChips.querySelectorAll(".kategori-chip");
        for (var x = 0; x < allChips.length; x++) {
          allChips[x].classList.remove("active");
        }
        this.classList.add("active");
        activeKategori = this.getAttribute("data-kategori") || "";
        renderProdukGrid();
      });
    }
  }

  // ── Apply filters and re-render ────────────────────────────────────
  function applyFilters() {
    renderProdukGrid();
  }

  // ── Render product grid ────────────────────────────────────────────
  function renderProdukGrid() {
    var filtered = getFilteredData();

    if (filtered.length === 0) {
      produkGrid.innerHTML = '<div class="empty-state">Produk tidak ditemukan.</div>';
      return;
    }

    var html = "";
    for (var i = 0; i < filtered.length; i++) {
      var p = filtered[i];
      var nama = p.produk;
      var kategori = (p.kategori && p.kategori.trim() !== "")
        ? p.kategori.trim() : "Lainnya";

      var fotoSrc = p.fotoPath ? ("../../assets/images/" + p.fotoPath) : "";
      var fotoEl = fotoSrc
        ? '<img class="produk-foto-img" src="' + fotoSrc + '" alt="' + escapeHtml(nama) + '" loading="lazy">'
        : '<svg class="produk-foto-placeholder" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';

      html += '<div class="produk-card">'
            + '  <div class="produk-foto">' + fotoEl + '</div>'
            + '  <div class="produk-info">'
            + '    <div class="produk-name">' + escapeHtml(nama) + '</div>'
            + '    <div class="produk-kategori">' + escapeHtml(kategori) + '</div>'
            + '    <div class="produk-harga">' + formatRupiah(p.hargaJual) + '</div>'
            + '  </div>'
            + '</div>';
    }

    produkGrid.innerHTML = html;
  }

  // ── Fetch katalog ──────────────────────────────────────────────────
  function loadKatalog() {
    loadingIndicator.style.display = "block";
    produkGrid.innerHTML = "";

    var url = MORODUIT_CONFIG.APPS_SCRIPT_URL
      + "?action=getKatalogFull"
      + "&token=" + encodeURIComponent(MORODUIT_CONFIG.TOKEN);

    fetch(url)
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        loadingIndicator.style.display = "none";

        if (!Array.isArray(data)) {
          produkGrid.innerHTML = '<div class="empty-state">Gagal memuat produk. Data tidak valid.</div>';
          return;
        }

        // Filter: only products with status "Ada" (client-side filter,
        // since getKatalogFull returns ALL products regardless of status)
        var filtered = [];
        for (var i = 0; i < data.length; i++) {
          if (String(data[i].status || "").trim() === "Ada") {
            filtered.push(data[i]);
          }
        }

        if (filtered.length === 0) {
          produkGrid.innerHTML = '<div class="empty-state">Belum ada produk tersedia.</div>';
          return;
        }

        // Sort A-Z by product name
        filtered.sort(function (a, b) {
          var namaA = (a.produk || "").toLowerCase();
          var namaB = (b.produk || "").toLowerCase();
          return namaA.localeCompare(namaB, "id");
        });

        produkData = filtered;

        populateKategoriChips();
        renderProdukGrid();
      })
      .catch(function (err) {
        loadingIndicator.style.display = "none";
        produkGrid.innerHTML = '<div class="empty-state">Gagal menghubungi server. Periksa koneksi internet.</div>';
        console.error("Fetch error:", err);
      });
  }

  // ── Search input listener ──────────────────────────────────────────
  searchInput.addEventListener("input", function () {
    applyFilters();
  });

  // ── Init ───────────────────────────────────────────────────────────
  loadKatalog();
})();
