/* ══════════════════════════════════════════════════════════════════════
   MoroDuit Rekap-Belanja — Script
   Fetch riwayat, tampilkan list nota dengan checkbox multi-select,
   agregasi qty per produk lintas nota terpilih, fetch harga normal
   terkini dari katalog, simpan ke sessionStorage, redirect ke Priview.
   ══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── DOM refs ───────────────────────────────────────────────────────
  var loadingIndicator = document.getElementById("loadingIndicator");
  var riwayatList = document.getElementById("riwayatList");
  var statusMessage = document.getElementById("statusMessage");
  var actionBar = document.getElementById("actionBar");
  var selectedInfo = document.getElementById("selectedInfo");
  var btnLanjut = document.getElementById("btnLanjut");

  // ── Constants ──────────────────────────────────────────────────────
  var STORAGE_KEY_REKAP = "moroduit_rekap_belanja";

  // ── State ──────────────────────────────────────────────────────────
  var allGroups = []; // grouped riwayat data
  var selectedNotas = {}; // { noNota: true }

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
    var order = [];

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
      var tA = a.tanggal || "";
      var tB = b.tanggal || "";
      var dateA = tA ? new Date(tA.replace(" ", "T") + "+07:00") : NaN;
      var dateB = tB ? new Date(tB.replace(" ", "T") + "+07:00") : NaN;

      if (!isNaN(dateA) && !isNaN(dateB)) return dateB - dateA;
      if (!isNaN(dateA)) return -1;
      if (!isNaN(dateB)) return 1;

      return b.noNota > a.noNota ? 1 : b.noNota < a.noNota ? -1 : 0;
    });

    return result;
  }

  // ── Format tanggal to Indonesian locale ────────────────────────────
  function formatTanggalIndo(dateStr) {
    var d = new Date(dateStr.replace(" ", "T") + "+07:00");
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  // ── Update action bar ──────────────────────────────────────────────
  function updateActionBar() {
    var count = Object.keys(selectedNotas).length;
    if (count > 0) {
      actionBar.classList.remove("hidden");
      selectedInfo.textContent = count + " nota dipilih";
      btnLanjut.disabled = false;
    } else {
      actionBar.classList.add("hidden");
      btnLanjut.disabled = true;
    }
  }

  // ── Handle checkbox change ─────────────────────────────────────────
  function handleCheckboxChange(e) {
    var checkbox = e.currentTarget;
    var noNota = checkbox.getAttribute("data-no-nota");
    var card = checkbox.closest(".riwayat-card");

    if (checkbox.checked) {
      selectedNotas[noNota] = true;
      card.classList.add("selected");
    } else {
      delete selectedNotas[noNota];
      card.classList.remove("selected");
    }

    updateActionBar();
  }

  // ── Handle card click (toggle checkbox) ────────────────────────────
  function handleCardClick(e) {
    // Don't toggle if user clicked directly on the checkbox
    if (e.target.classList.contains("riwayat-checkbox")) return;

    var card = e.currentTarget;
    var checkbox = card.querySelector(".riwayat-checkbox");
    checkbox.checked = !checkbox.checked;

    // Trigger change event manually
    handleCheckboxChange({ currentTarget: checkbox });
  }

  // ── Render riwayat list with checkboxes ────────────────────────────
  function renderNotaSelector(groups) {
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

      html += '<div class="riwayat-card" data-no-nota="' + escapeHtml(g.noNota) + '">'
            + '  <input type="checkbox" class="riwayat-checkbox" data-no-nota="' + escapeHtml(g.noNota) + '">'
            + '  <div class="riwayat-content">'
            + '    <div class="riwayat-header">'
            + '      <span class="riwayat-no-nota">' + escapeHtml(g.noNota) + '</span>'
            + '      <span class="riwayat-total">' + formatRupiah(g.total) + '</span>'
            + '    </div>'
            + '    <div class="riwayat-meta">'
            + '      <span class="riwayat-pelanggan">' + escapeHtml(g.namaPelanggan || "-") + '</span>'
            + '      <span class="riwayat-tanggal">' + formatTanggalIndo(g.tanggal) + '</span>'
            + '    </div>'
            + '    <div class="riwayat-summary">'
            + '      <span>' + jumlahItem + ' produk (' + jumlahBarang + ' barang)</span>'
            + '    </div>'
            + '  </div>'
            + '</div>';
    }

    riwayatList.innerHTML = html;

    // Attach event handlers
    var cards = riwayatList.querySelectorAll(".riwayat-card");
    var checkboxes = riwayatList.querySelectorAll(".riwayat-checkbox");

    for (var k = 0; k < cards.length; k++) {
      cards[k].addEventListener("click", handleCardClick);
    }
    for (var m = 0; m < checkboxes.length; m++) {
      checkboxes[m].addEventListener("change", handleCheckboxChange);
    }
  }

  // ── Aggregate items from selected notes ────────────────────────────
  function aggregateItems(groups, selectedMap) {
    var aggregated = {}; // key = produk name

    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      if (!selectedMap[g.noNota]) continue;

      for (var j = 0; j < g.items.length; j++) {
        var item = g.items[j];
        var key = item.produk;

        if (!aggregated[key]) {
          aggregated[key] = {
            namaProduk: key,
            totalQty: 0,
            asalNota: []
          };
        }

        aggregated[key].totalQty += Number(item.qty) || 0;

        // Add nota to asalNota if not already present
        if (aggregated[key].asalNota.indexOf(g.noNota) === -1) {
          aggregated[key].asalNota.push(g.noNota);
        }
      }
    }

    return aggregated;
  }

  // ── Fetch katalog full (for hargaNormal) ───────────────────────────
  function fetchKatalogFull() {
    var url = MORODUIT_CONFIG.APPS_SCRIPT_URL
      + "?action=getKatalogFull"
      + "&token=" + encodeURIComponent(MORODUIT_CONFIG.TOKEN);

    return fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!Array.isArray(data)) return {};
        // Build lookup: produk name → hargaNormal
        var lookup = {};
        for (var i = 0; i < data.length; i++) {
          var item = data[i];
          var name = String(item.produk || "").trim();
          if (name) {
            lookup[name] = {
              hargaNormal: item.hargaNormal,
              status: item.status
            };
          }
        }
        return lookup;
      });
  }

  // ── Build rekap result ─────────────────────────────────────────────
  function buildRekapResult(aggregated, katalogLookup) {
    var items = [];
    var grandTotal = 0;
    var hargaTidakDitemukan = 0;
    var keys = Object.keys(aggregated);

    for (var i = 0; i < keys.length; i++) {
      var agg = aggregated[keys[i]];
      var katalog = katalogLookup[agg.namaProduk];
      var hargaNormal = null;
      var subtotal = null;

      if (katalog && katalog.hargaNormal !== undefined && katalog.hargaNormal !== null && katalog.hargaNormal !== "") {
        hargaNormal = Number(katalog.hargaNormal);
        if (!isNaN(hargaNormal)) {
          subtotal = hargaNormal * agg.totalQty;
          grandTotal += subtotal;
        } else {
          hargaNormal = null;
          hargaTidakDitemukan++;
        }
      } else {
        hargaTidakDitemukan++;
      }

      items.push({
        namaProduk: agg.namaProduk,
        totalQty: agg.totalQty,
        asalNota: agg.asalNota,
        hargaNormal: hargaNormal,
        subtotal: subtotal
      });
    }

    // Sort: items with harga first, then items without
    items.sort(function (a, b) {
      if (a.subtotal !== null && b.subtotal === null) return -1;
      if (a.subtotal === null && b.subtotal !== null) return 1;
      return 0;
    });

    return {
      items: items,
      grandTotal: grandTotal,
      hargaTidakDitemukan: hargaTidakDitemukan,
      timestamp: new Date().toISOString()
    };
  }

  // ── Handle Lanjut button click ─────────────────────────────────────
  btnLanjut.addEventListener("click", function () {
    var count = Object.keys(selectedNotas).length;
    if (count === 0) return;

    // Disable button
    btnLanjut.disabled = true;
    btnLanjut.textContent = "⏳ Memproses...";

    // Aggregate items from selected notes
    var aggregated = aggregateItems(allGroups, selectedNotas);

    // Fetch katalog for current prices
    fetchKatalogFull()
      .then(function (katalogLookup) {
        var rekapResult = buildRekapResult(aggregated, katalogLookup);

        // Save to sessionStorage
        try {
          sessionStorage.setItem(STORAGE_KEY_REKAP, JSON.stringify(rekapResult));
        } catch (err) {
          showStatus("❌ Gagal menyimpan data. Penyimpanan penuh.", "error");
          btnLanjut.disabled = false;
          btnLanjut.textContent = "Lanjut →";
          return;
        }

        // Log for debugging
        console.log("[Rekap-Belanja] Rekap result:", rekapResult);
        if (rekapResult.hargaTidakDitemukan > 0) {
          console.log("[Rekap-Belanja] WARNING: " + rekapResult.hargaTidakDitemukan + " produk harga normal tidak ditemukan di katalog.");
        }

        // Redirect to Priview
        window.location.href = "Priview/index.html";
      })
      .catch(function (err) {
        console.error("[Rekap-Belanja] Fetch katalog error:", err);
        showStatus("❌ Gagal mengambil data katalog. Periksa koneksi internet.", "error");
        btnLanjut.disabled = false;
        btnLanjut.textContent = "Lanjut →";
      });
  });

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
        renderNotaSelector(allGroups);
      })
      .catch(function (err) {
        loadingIndicator.style.display = "none";
        showStatus("❌ Gagal menghubungi server. Periksa koneksi internet.", "error");
        console.error("Fetch error:", err);
      });
  }

  // ── BFCache handling ──────────────────────────────────────────────
  window.addEventListener("pageshow", function (event) {
    if (event.persisted) {
      // Page was restored from bfcache — reload data
      selectedNotas = {};
      updateActionBar();
      loadRiwayat();
    }
  });

  // ── Init ───────────────────────────────────────────────────────────
  loadRiwayat();
})();
