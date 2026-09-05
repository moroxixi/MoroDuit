/* ══════════════════════════════════════════════════════════════════════
   MoroDuit — Database-Surya/Katalog (READ-ONLY view)
   Tampilkan isi tab "Katalog-Surya" dari action GET getKatalogSurya
   (sudah ada di Apps-Script/code.gs.js — TIDAK ada POST/form di halaman ini).
   Filter: search nama produk (case-insensitive) + chip status Semua/Promo/Normal.
   Pola: Customer/Katalog/script.js (applyFilters/getFilteredData/render grid).
   ══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── DOM refs ───────────────────────────────────────────────────────
  var loadingIndicator = document.getElementById("loadingIndicator");
  var katalogGrid = document.getElementById("katalogGrid");
  var searchInput = document.getElementById("searchInput");
  var statusChips = document.getElementById("statusChips");

  // ── State ──────────────────────────────────────────────────────────
  var katalogData = [];     // Data bersih hasil sanitasi, siap dirender
  var activeStatus = "";    // "" = Semua; "Promo"; "Normal"

  // ── Helpers (duplikasi lokal — konvensi repo: tidak ada shared .js) ──
  function showStatus(message, type) {
    var statusMessage = document.getElementById("statusMessage");
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.className = "status-message " + type;
    setTimeout(function () {
      statusMessage.className = "status-message hidden";
    }, 5000);
  }

  // hargaSatuan dari backend = angka (hasil curl test: number, mis. 26775).
  // Defensif: kalau suatu saat string ter-format ("Rp20.900") masuk,
  // Number() menghasilkan NaN → tampilkan string apa adanya.
  function formatRupiah(val) {
    var num = Number(val);
    if (isNaN(num)) {
      return (val === null || val === undefined) ? "" : String(val);
    }
    return "Rp " + Math.round(num).toLocaleString("id-ID");
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str === null || str === undefined ? "" : String(str)));
    return div.innerHTML;
  }

  // ── Sanitasi baris hasil fetch ─────────────────────────────────────
  // Sheet "Katalog-Surya" saat ini BELUM punya header baris 1 yang benar,
  // jadi response bisa mengandung baris sampah (mis. teks header
  // "Tanggal Scan/Nama Produk/Harga Satuan/Status" ikut terbaca sebagai data,
  // atau status/harga tidak valid). Baris seperti itu dibuang di sini.
  function isBarisValid(item) {
    if (!item) return false;
    var nama = String(item.namaProduk || "").trim();
    if (nama === "") return false;
    // Baris header yang salah terbaca sebagai data (teks persis header)
    if (nama.toLowerCase() === "nama produk") return false;
    if (String(item.tanggalScan || "").trim().toLowerCase() === "tanggal scan") return false;
    var status = String(item.status || "").trim();
    if (status !== "Promo" && status !== "Normal") return false;
    // hargaSatuan harus numerik — baris header/teks lain dibuang
    if (isNaN(Number(item.hargaSatuan))) return false;
    return true;
  }

  // ── Get filtered data (search text + status chip, AND logic) ──────
  function getFilteredData() {
    var query = searchInput.value.trim().toLowerCase();

    return katalogData.filter(function (p) {
      // Search filter: case-insensitive substring match on nama produk
      if (query !== "") {
        var namaProduk = (p.namaProduk || "").toLowerCase();
        if (namaProduk.indexOf(query) === -1) return false;
      }
      // Status chip filter: exact match ("" = show all)
      if (activeStatus !== "" && (p.status || "") !== activeStatus) {
        return false;
      }
      return true;
    });
  }

  // ── Populate status chips (Semua / Promo / Normal) ────────────────
  function populateStatusChips() {
    var options = [
      { value: "", label: "Semua" },
      { value: "Promo", label: "Promo" },
      { value: "Normal", label: "Normal" }
    ];

    var html = "";
    for (var i = 0; i < options.length; i++) {
      var isActive = options[i].value === activeStatus;
      html += '<button class="status-chip' + (isActive ? " active" : "") + '" data-status="'
            + options[i].value + '" type="button">'
            + escapeHtml(options[i].label) + '</button>';
    }
    statusChips.innerHTML = html;

    // Attach click listeners
    var chips = statusChips.querySelectorAll(".status-chip");
    for (var c = 0; c < chips.length; c++) {
      chips[c].addEventListener("click", function () {
        var allChips = statusChips.querySelectorAll(".status-chip");
        for (var x = 0; x < allChips.length; x++) {
          allChips[x].classList.remove("active");
        }
        this.classList.add("active");
        activeStatus = this.getAttribute("data-status") || "";
        applyFilters();
      });
    }
  }

  // ── Apply filters and re-render ────────────────────────────────────
  function applyFilters() {
    renderKatalogSuryaGrid();
  }

  // ── Render katalog grid ────────────────────────────────────────────
  function renderKatalogSuryaGrid() {
    var filtered = getFilteredData();

    if (filtered.length === 0) {
      katalogGrid.innerHTML = '<div class="empty-state">Produk tidak ditemukan.</div>';
      return;
    }

    var html = "";
    for (var i = 0; i < filtered.length; i++) {
      var p = filtered[i];
      var nama = String(p.namaProduk || "").trim();
      var status = (p.status || "").trim();
      var badgeClass = (status === "Promo") ? "promo" : "normal";

      html += '<div class="katalog-card">'
            + '  <div class="katalog-info">'
            + '    <div class="katalog-name">' + escapeHtml(nama) + '</div>'
            + '    <div class="katalog-tanggal">' + escapeHtml(p.tanggalScan || "") + '</div>'
            + '  </div>'
            + '  <div class="katalog-right">'
            + '    <div class="katalog-harga">' + escapeHtml(formatRupiah(p.hargaSatuan)) + '</div>'
            + '    <span class="status-badge ' + badgeClass + '">' + escapeHtml(status) + '</span>'
            + '  </div>'
            + '</div>';
    }

    katalogGrid.innerHTML = html;
  }

  // ── Fetch katalog surya (GET read-only) ────────────────────────────
  function loadKatalogSurya() {
    loadingIndicator.style.display = "block";
    katalogGrid.innerHTML = "";

    var url = MORODUIT_CONFIG.APPS_SCRIPT_URL
      + "?action=getKatalogSurya"
      + "&token=" + encodeURIComponent(MORODUIT_CONFIG.TOKEN);

    fetch(url)
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        loadingIndicator.style.display = "none";

        if (!Array.isArray(data)) {
          katalogGrid.innerHTML = '<div class="empty-state">Gagal memuat data. Response tidak valid.</div>';
          showStatus("❌ Gagal memuat data Katalog Surya.", "error");
          return;
        }

        // Sanitasi: buang baris header-salah-baca & baris tidak valid
        var clean = [];
        for (var i = 0; i < data.length; i++) {
          if (isBarisValid(data[i])) {
            clean.push(data[i]);
          }
        }

        if (clean.length === 0) {
          katalogGrid.innerHTML = '<div class="empty-state">Belum ada data Katalog Surya.</div>';
          return;
        }

        // Sort A-Z by nama produk
        clean.sort(function (a, b) {
          var namaA = (a.namaProduk || "").toLowerCase();
          var namaB = (b.namaProduk || "").toLowerCase();
          return namaA.localeCompare(namaB, "id");
        });

        katalogData = clean;

        populateStatusChips();
        renderKatalogSuryaGrid();
      })
      .catch(function (err) {
        loadingIndicator.style.display = "none";
        katalogGrid.innerHTML = '<div class="empty-state">Gagal menghubungi server. Periksa koneksi internet.</div>';
        showStatus("❌ Gagal menghubungi server.", "error");
        console.error("Fetch error:", err);
      });
  }

  // ── Search input listener ──────────────────────────────────────────
  searchInput.addEventListener("input", function () {
    applyFilters();
  });

  // ── Init ───────────────────────────────────────────────────────────
  loadKatalogSurya();
})();
