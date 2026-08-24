/* ══════════════════════════════════════════════════════════════════════
   MoroDuit Riwayat — Script
   Fetch riwayat transaksi, group per No Nota, render list card
   ══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── DOM refs ───────────────────────────────────────────────────────
  var loadingIndicator = document.getElementById("loadingIndicator");
  var riwayatList = document.getElementById("riwayatList");
  var statusMessage = document.getElementById("statusMessage");

  // ── Constants ──────────────────────────────────────────────────────
  var STORAGE_KEY_SELECTED = "moroduit_riwayat_selected_noNota";

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
          total: row.total
        };
        order.push(key);
      }

      groups[key].items.push({
        produk: row.produk,
        qty: row.qty,
        hargaSatuan: row.hargaSatuan,
        subtotal: row.subtotal
      });
    }

    // Build sorted array (tanggal DESCENDING)
    var result = [];
    for (var j = 0; j < order.length; j++) {
      result.push(groups[order[j]]);
    }

    result.sort(function (a, b) {
      // Parse tanggal string "yyyy-MM-dd HH:mm:ss" to Date
      var dateA = new Date(a.tanggal.replace(" ", "T") + "+07:00");
      var dateB = new Date(b.tanggal.replace(" ", "T") + "+07:00");
      return dateB - dateA; // DESCENDING (newest first)
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

  // ── Render riwayat list ────────────────────────────────────────────
  function renderRiwayat(groups) {
    if (!groups || groups.length === 0) {
      riwayatList.innerHTML = '<div class="empty-state">Belum ada riwayat transaksi</div>';
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
    window.location.href = "../Mode-Edit/index.html";
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
        var groups = groupByNoNota(data);
        renderRiwayat(groups);
      })
      .catch(function (err) {
        loadingIndicator.style.display = "none";
        showStatus("❌ Gagal menghubungi server. Periksa koneksi internet.", "error");
        console.error("Fetch error:", err);
      });
  }

  // ── Init ───────────────────────────────────────────────────────────
  loadRiwayat();
})();
