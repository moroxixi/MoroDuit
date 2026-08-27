/* ══════════════════════════════════════════════════════════════════════
   MoroDuit Riwayat — Script
   Fetch riwayat transaksi, group per No Nota, render list card
   Fitur: profit per nota, navigasi harian/bulanan, total profit periode
   ══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── DOM refs ───────────────────────────────────────────────────────
  var loadingIndicator = document.getElementById("loadingIndicator");
  var riwayatList = document.getElementById("riwayatList");
  var statusMessage = document.getElementById("statusMessage");

  // Navigation DOM refs
  var btnModeToggle = document.getElementById("btnModeToggle");
  var btnPrev = document.getElementById("btnPrev");
  var btnNext = document.getElementById("btnNext");
  var btnGoToToday = document.getElementById("btnGoToToday");
  var periodeLabel = document.getElementById("periodeLabel");
  var profitSummary = document.getElementById("profitSummary");
  var profitSummaryValue = document.getElementById("profitSummaryValue");

  // ── Constants ──────────────────────────────────────────────────────
  var STORAGE_KEY_SELECTED = "moroduit_riwayat_selected_noNota";

  // ── Navigation state ───────────────────────────────────────────────
  // "day" = mode harian, "month" = mode bulanan
  var currentViewMode = "day";
  // Date object representing the active period (hari aktif atau bulan aktif)
  var currentPeriodeDate = new Date();
  // All groups after groupByNoNota (unfiltered)
  var allGroups = [];

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

  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = "status-message " + type;
  }

  function hideStatus() {
    statusMessage.className = "status-message hidden";
  }

  // ── Format profit label (panggil formatRupiah, lalu strip "Rp " + tambah sign) ──
  function formatProfitLabel(val) {
    var num = Number(val) || 0;
    var isNeg = num < 0;
    var absStr = Math.abs(Math.ceil(num)).toLocaleString("id-ID");
    if (num === 0) return "0";
    return (isNeg ? "-" : "+") + absStr;
  }

  // ── Group rows by noNota ───────────────────────────────────────────
  function groupByNoNota(rows) {
    var groups = {};
    var order = []; // preserve insertion order

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var key = row.noNota;
      if (!key) continue;

      if (!groups[key]) {
        groups[key] = {
          noNota: key,
          namaPelanggan: row.namaPelanggan,
          tanggal: row.tanggal,
          items: [],
          total: row.total,
          profitNota: 0
        };
        order.push(key);
      }

      groups[key].items.push({
        produk: row.produk,
        qty: row.qty,
        hargaSatuan: row.hargaSatuan,
        subtotal: row.subtotal,
        profitBaris: Number(row.profitBaris) || 0
      });

      groups[key].profitNota += Number(row.profitBaris) || 0;
    }

    // Build sorted array (tanggal DESCENDING)
    var result = [];
    for (var j = 0; j < order.length; j++) {
      result.push(groups[order[j]]);
    }

    result.sort(function (a, b) {
      // Primary: sort by tanggal DESCENDING
      var tA = a.tanggal || "";
      var tB = b.tanggal || "";
      var dateA = tA ? new Date(tA.replace(" ", "T") + "+07:00") : NaN;
      var dateB = tB ? new Date(tB.replace(" ", "T") + "+07:00") : NaN;

      if (!isNaN(dateA) && !isNaN(dateB)) return dateB - dateA;
      if (!isNaN(dateA)) return -1;
      if (!isNaN(dateB)) return 1;

      // Fallback: noNota descending (MD-YYYYMMDD-XXX sorts chronologically)
      return b.noNota > a.noNota ? 1 : b.noNota < a.noNota ? -1 : 0;
    });

    return result;
  }

  // ── Format tanggal to Indonesian locale ────────────────────────────
  function formatTanggalIndo(dateStr) {
    // dateStr = "yyyy-MM-dd HH:mm:ss" (WIB)
    var d = new Date(dateStr.replace(" ", "T") + "+07:00");
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  // ── Date key helpers (substring-based, no Date parsing) ────────────
  // Extract "yyyy-MM-dd" from "yyyy-MM-dd HH:mm:ss"
  function dateKeyOf(tanggal) {
    return (tanggal || "").substring(0, 10);
  }

  // Extract "yyyy-MM" from "yyyy-MM-dd HH:mm:ss"
  function monthKeyOf(tanggal) {
    return (tanggal || "").substring(0, 7);
  }

  // ── Format period label ────────────────────────────────────────────
  function formatDateLabel(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var dd = String(d.getDate()).padStart(2, "0");
    var dateStr = y + "-" + m + "-" + dd + " 00:00:00";
    return formatTanggalIndo(dateStr);
  }

  function formatMonthLabel(d) {
    var y = d.getFullYear();
    var m = d.getMonth();
    var monthNames = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return monthNames[m] + " " + y;
  }

  // ── Filter groups by active period ─────────────────────────────────
  function filterByPeriode(groups) {
    if (currentViewMode === "day") {
      var targetKey = dateKeyOf(
        currentPeriodeDate.getFullYear() + "-" +
        String(currentPeriodeDate.getMonth() + 1).padStart(2, "0") + "-" +
        String(currentPeriodeDate.getDate()).padStart(2, "0") + " 00:00:00"
      );
      return groups.filter(function (g) {
        return dateKeyOf(g.tanggal) === targetKey;
      });
    } else {
      // month mode
      var targetMonth = currentPeriodeDate.getFullYear() + "-" +
        String(currentPeriodeDate.getMonth() + 1).padStart(2, "0");
      return groups.filter(function (g) {
        return monthKeyOf(g.tanggal) === targetMonth;
      });
    }
  }

  // ── Navigation: prev / next ────────────────────────────────────────
  function prevPeriode() {
    if (currentViewMode === "day") {
      currentPeriodeDate.setDate(currentPeriodeDate.getDate() - 1);
    } else {
      currentPeriodeDate.setMonth(currentPeriodeDate.getMonth() - 1);
    }
    renderFiltered();
  }

  function nextPeriode() {
    if (currentViewMode === "day") {
      currentPeriodeDate.setDate(currentPeriodeDate.getDate() + 1);
    } else {
      currentPeriodeDate.setMonth(currentPeriodeDate.getMonth() + 1);
    }
    renderFiltered();
  }

  function goToToday() {
    currentPeriodeDate = new Date();
    currentViewMode = "day";
    btnModeToggle.textContent = "📅 Bulanan";
    renderFiltered();
  }

  function toggleMode() {
    if (currentViewMode === "day") {
      currentViewMode = "month";
      // Keep currentPeriodeDate, just switch to month view
      btnModeToggle.textContent = "📅 Harian";
    } else {
      currentViewMode = "day";
      // Keep currentPeriodeDate, switch back to day view
      btnModeToggle.textContent = "📅 Bulanan";
    }
    renderFiltered();
  }

  // ── Render filtered view ───────────────────────────────────────────
  function renderFiltered() {
    var filtered = filterByPeriode(allGroups);
    renderRiwayat(filtered);
    updateNavigationUI();
    updateProfitSummary(filtered);
  }

  // ── Update navigation UI elements ──────────────────────────────────
  function updateNavigationUI() {
    if (currentViewMode === "day") {
      periodeLabel.textContent = formatDateLabel(currentPeriodeDate);
    } else {
      periodeLabel.textContent = formatMonthLabel(currentPeriodeDate);
    }
  }

  // ── Update profit summary for active period ────────────────────────
  function updateProfitSummary(groups) {
    var totalProfit = 0;
    for (var i = 0; i < groups.length; i++) {
      totalProfit += groups[i].profitNota || 0;
    }

    if (groups.length === 0) {
      profitSummary.classList.add("hidden");
    } else {
      profitSummary.classList.remove("hidden");
      var label = formatProfitLabel(totalProfit);
      var colorClass = totalProfit > 0 ? "profit-positive" :
                       totalProfit < 0 ? "profit-negative" : "profit-zero";
      profitSummaryValue.textContent = label;
      profitSummaryValue.className = "profit-value " + colorClass;
    }
  }

  // ── Render riwayat list ────────────────────────────────────────────
  function renderRiwayat(groups) {
    if (!groups || groups.length === 0) {
      riwayatList.innerHTML = '<div class="empty-state">Belum ada riwayat transaksi di periode ini</div>';
      return;
    }

    var html = "";
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      var jumlahItem = g.items.length;
      var jumlahBarang = 0;
      for (var j = 0; j < g.items.length; j++) {
        jumlahBarang += Number(g.items[j].qty) || 0;
      }

      // Profit per nota — color-coded
      var profitVal = g.profitNota || 0;
      var profitLabel = formatProfitLabel(profitVal);
      var profitColorClass = profitVal > 0 ? "profit-positive" :
                             profitVal < 0 ? "profit-negative" : "profit-zero";

      html += '<div class="riwayat-card" data-no-nota="' + escapeHtml(g.noNota) + '" '
            + 'role="button" tabindex="0">'
            + '  <div class="riwayat-header">'
            + '    <span class="riwayat-no-nota">' + escapeHtml(g.noNota) + '</span>'
            + '    <span class="riwayat-total">' + formatRupiah(g.total) + '</span>'
            + '  </div>'
            + '  <div class="riwayat-meta">'
            + '    <span class="riwayat-pelanggan">' + escapeHtml(g.namaPelanggan || "-") + '</span>'
            + '    <span class="riwayat-tanggal">' + formatTanggalIndo(g.tanggal) + '</span>'
            + '  </div>'
            + '  <div class="riwayat-profit-row">'
            + '    <span class="riwayat-profit-label">Profit</span>'
            + '    <span class="riwayat-profit-value ' + profitColorClass + '">' + profitLabel + '</span>'
            + '  </div>'
            + '  <div class="riwayat-summary">'
            + '    <span>' + jumlahItem + ' produk (' + jumlahBarang + ' barang)</span>'
            + '  </div>'
            + '</div>';
    }

    riwayatList.innerHTML = html;

    // Attach click handlers
    var cards = riwayatList.querySelectorAll(".riwayat-card");
    for (var k = 0; k < cards.length; k++) {
      cards[k].addEventListener("click", handleCardClick);
      cards[k].addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick.call(this, e);
        }
      });
    }
  }

  // ── Handle card click → save noNota to sessionStorage → redirect ──
  function handleCardClick(e) {
    var card = e.currentTarget;
    var noNota = card.getAttribute("data-no-nota");
    if (!noNota) return;

    try {
      sessionStorage.setItem(STORAGE_KEY_SELECTED, noNota);
    } catch (err) {
      showStatus("❌ Gagal menyimpan pilihan. Penyimpanan penuh.", "error");
      return;
    }

    // Redirect ke Mode-Edit (belum ada — Fase 2 yang bikin)
    window.location.href = "Mode-Edit/index.html";
  }

  // ── Fetch riwayat ──────────────────────────────────────────────────
  function loadRiwayat() {
    loadingIndicator.style.display = "block";
    riwayatList.innerHTML = "";

    var url = MORODUIT_CONFIG.APPS_SCRIPT_URL
      + "?action=getRiwayat"
      + "&token=" + encodeURIComponent(MORODUIT_CONFIG.TOKEN);

    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        loadingIndicator.style.display = "none";

        if (!Array.isArray(data)) {
          showStatus("❌ Gagal memuat riwayat. Data tidak valid.", "error");
          return;
        }

        hideStatus();
        allGroups = groupByNoNota(data);
        renderFiltered();
      })
      .catch(function (err) {
        loadingIndicator.style.display = "none";
        showStatus("❌ Gagal menghubungi server. Periksa koneksi internet.", "error");
        console.error("Fetch error:", err);
      });
  }

  // ── Navigation event listeners ─────────────────────────────────────
  btnModeToggle.addEventListener("click", toggleMode);
  btnPrev.addEventListener("click", prevPeriode);
  btnNext.addEventListener("click", nextPeriode);
  btnGoToToday.addEventListener("click", goToToday);

  // ── Init ───────────────────────────────────────────────────────────
  loadRiwayat();
})();
