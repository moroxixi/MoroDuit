/* ══════════════════════════════════════════════════════════════════════
   MoroDuit Riwayat/Mode-Edit — Script
   Baca noNota dari sessionStorage, fetch riwayat, render item editable
   (qty +/-, hapus, tambah produk baru) — murni client-side state.
   ══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── DOM refs ───────────────────────────────────────────────────────
  var loadingIndicator = document.getElementById("loadingIndicator");
  var errorState = document.getElementById("errorState");
  var errorText = document.getElementById("errorText");
  var statusMessage = document.getElementById("statusMessage");
  var notaInfo = document.getElementById("notaInfo");
  var displayNoNota = document.getElementById("displayNoNota");
  var displayPelanggan = document.getElementById("displayPelanggan");
  var headerSubtitle = document.getElementById("headerSubtitle");
  var itemsList = document.getElementById("itemsList");
  var addProductSection = document.getElementById("addProductSection");
  var addProductPanel = document.getElementById("addProductPanel");
  var btnAddProduct = document.getElementById("btnAddProduct");
  var addSearchInput = document.getElementById("addSearchInput");
  var addSearchResults = document.getElementById("addSearchResults");
  var totalBar = document.getElementById("totalBar");
  var totalValue = document.getElementById("totalValue");
  var actionBar = document.getElementById("actionBar");
  var batalBtn = document.getElementById("batalBtn");
  var lanjutBtn = document.getElementById("lanjutBtn");

  // ── Constants ──────────────────────────────────────────────────────
  var STORAGE_KEY_SELECTED = "moroduit_riwayat_selected_noNota";
  var STORAGE_KEY_EDIT = "moroduit_riwayat_edit";

  // ── State ──────────────────────────────────────────────────────────
  var editState = null;  // { noNota, namaPelanggan, items: [{produk, qty, hargaSatuan, subtotal}] }
  var katalogData = [];  // cached from getKatalog

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

  function showError(msg) {
    loadingIndicator.style.display = "none";
    notaInfo.style.display = "none";
    itemsList.innerHTML = "";
    addProductSection.style.display = "none";
    totalBar.style.display = "none";
    actionBar.style.display = "none";
    errorText.textContent = msg || "Data riwayat tidak ditemukan.";
    errorState.style.display = "block";
  }

  function showEditor() {
    loadingIndicator.style.display = "none";
    errorState.style.display = "none";
    notaInfo.style.display = "block";
    addProductSection.style.display = "block";
    totalBar.style.display = "flex";
    actionBar.style.display = "flex";
  }

  // ── Recalculate totals & re-render ─────────────────────────────────
  function recalcAndRender() {
    var total = 0;
    for (var i = 0; i < editState.items.length; i++) {
      var item = editState.items[i];
      item.subtotal = Math.ceil(item.hargaSatuan * item.qty);
      total += item.subtotal;
    }
    editState.total = Math.ceil(total);

    renderItems();
    totalValue.textContent = formatRupiah(editState.total);
    lanjutBtn.disabled = (editState.items.length === 0);
  }

  // ── Render items list ──────────────────────────────────────────────
  function renderItems() {
    if (editState.items.length === 0) {
      itemsList.innerHTML = '<div class="empty-state">Semua produk dihapus. Tambah produk baru untuk melanjutkan.</div>';
      return;
    }

    var html = "";
    for (var i = 0; i < editState.items.length; i++) {
      var item = editState.items[i];
      var minDisabled = (item.qty <= 1) ? " disabled" : "";

      html += '<div class="item-card" data-index="' + i + '">'
            + '  <div class="item-info">'
            + '    <div class="item-produk">' + escapeHtml(item.produk) + '</div>'
            + '    <div class="item-harga">' + formatRupiah(item.hargaSatuan) + ' / pcs</div>'
            + '  </div>'
            + '  <div class="item-subtotal">' + formatRupiah(item.subtotal) + '</div>'
            + '  <div class="qty-stepper">'
            + '    <button type="button" class="qty-btn qty-minus" data-index="' + i + '"' + minDisabled + ' aria-label="Kurangi jumlah">−</button>'
            + '    <span class="qty-display">' + item.qty + '</span>'
            + '    <button type="button" class="qty-btn qty-plus" data-index="' + i + '" aria-label="Tambah jumlah">+</button>'
            + '  </div>'
            + '  <button type="button" class="btn-delete" data-index="' + i + '" aria-label="Hapus produk">🗑️</button>'
            + '</div>';
    }

    itemsList.innerHTML = html;
    attachItemListeners();
  }

  // ── Attach event listeners to item cards ───────────────────────────
  function attachItemListeners() {
    // Qty minus buttons
    var minusBtns = itemsList.querySelectorAll(".qty-minus");
    for (var m = 0; m < minusBtns.length; m++) {
      minusBtns[m].addEventListener("click", function () {
        var idx = parseInt(this.getAttribute("data-index"), 10);
        if (isNaN(idx)) return;

        if (editState.items[idx].qty <= 1) {
          // Qty 1 → kurang = hapus dengan konfirmasi
          if (!confirm("Hapus \"" + editState.items[idx].produk + "\" dari daftar?")) return;
          editState.items.splice(idx, 1);
        } else {
          editState.items[idx].qty -= 1;
        }
        recalcAndRender();
      });
    }

    // Qty plus buttons
    var plusBtns = itemsList.querySelectorAll(".qty-plus");
    for (var p = 0; p < plusBtns.length; p++) {
      plusBtns[p].addEventListener("click", function () {
        var idx = parseInt(this.getAttribute("data-index"), 10);
        if (isNaN(idx)) return;
        editState.items[idx].qty += 1;
        recalcAndRender();
      });
    }

    // Delete buttons
    var deleteBtns = itemsList.querySelectorAll(".btn-delete");
    for (var d = 0; d < deleteBtns.length; d++) {
      deleteBtns[d].addEventListener("click", function () {
        var idx = parseInt(this.getAttribute("data-index"), 10);
        if (isNaN(idx)) return;
        if (!confirm("Hapus \"" + editState.items[idx].produk + "\" dari daftar?")) return;
        editState.items.splice(idx, 1);
        recalcAndRender();
      });
    }
  }

  // ── Add Product: fetch katalog (cached) ────────────────────────────
  function loadKatalog() {
    var url = MORODUIT_CONFIG.APPS_SCRIPT_URL
      + "?action=getKatalog"
      + "&token=" + encodeURIComponent(MORODUIT_CONFIG.TOKEN);

    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (Array.isArray(data)) {
          katalogData = data;
        }
      })
      .catch(function (err) {
        console.warn("Gagal memuat katalog untuk Tambah Produk:", err);
      });
  }

  // ── Add Product: search & render results ───────────────────────────
  function renderAddResults(query) {
    if (!query || query.length < 1) {
      addSearchResults.innerHTML = '<div class="add-search-empty">Ketik nama produk untuk mencari</div>';
      return;
    }

    var q = query.toLowerCase();
    var matches = [];
    for (var i = 0; i < katalogData.length; i++) {
      var p = katalogData[i];
      if ((p.produk || "").toLowerCase().indexOf(q) !== -1) {
        matches.push(p);
      }
    }

    if (matches.length === 0) {
      addSearchResults.innerHTML = '<div class="add-search-empty">Produk tidak ditemukan</div>';
      return;
    }

    var html = "";
    for (var j = 0; j < matches.length; j++) {
      var item = matches[j];
      // Cek apakah sudah ada di list (tandai)
      var alreadyExists = false;
      for (var k = 0; k < editState.items.length; k++) {
        if (editState.items[k].produk === item.produk) {
          alreadyExists = true;
          break;
        }
      }
      var existsLabel = alreadyExists
        ? ' <span style="color:#ff9800;font-size:0.75rem;">(sudah ada, +qty)</span>'
        : '';

      html += '<div class="add-search-item" data-produk="' + escapeHtml(item.produk) + '" '
            + 'data-harga="' + item.hargaJual + '">'
            + '  <span class="add-search-name">' + escapeHtml(item.produk) + existsLabel + '</span>'
            + '  <span class="add-search-price">' + formatRupiah(item.hargaJual) + '</span>'
            + '</div>';
    }

    addSearchResults.innerHTML = html;

    // Attach click handlers
    var resultItems = addSearchResults.querySelectorAll(".add-search-item");
    for (var r = 0; r < resultItems.length; r++) {
      resultItems[r].addEventListener("click", handleAddProduct);
    }
  }

  // ── Add Product: handle selection ──────────────────────────────────
  function handleAddProduct(e) {
    var el = e.currentTarget;
    var produk = el.getAttribute("data-produk");
    var hargaJual = Number(el.getAttribute("data-harga"));
    if (!produk || isNaN(hargaJual)) return;

    // Cek apakah sudah ada di list
    var found = false;
    for (var i = 0; i < editState.items.length; i++) {
      if (editState.items[i].produk === produk) {
        // Sudah ada → tambah qty
        editState.items[i].qty += 1;

        // Cek apakah harga berubah
        if (editState.items[i].hargaSatuan !== hargaJual) {
          editState.items[i].hargaSatuan = hargaJual;
          editState.items[i]._priceChanged = true;
        }

        found = true;
        break;
      }
    }

    if (!found) {
      editState.items.push({
        produk: produk,
        qty: 1,
        hargaSatuan: hargaJual,
        subtotal: hargaJual,
        _priceChanged: false
      });
    }

    // Reset search
    addSearchInput.value = "";
    addSearchResults.innerHTML = '<div class="add-search-empty">Ketik nama produk untuk mencari</div>';

    recalcAndRender();
  }

  // ── Toggle add product panel ───────────────────────────────────────
  function toggleAddPanel() {
    var isOpen = addProductPanel.classList.contains("open");
    if (isOpen) {
      addProductPanel.classList.remove("open");
      btnAddProduct.textContent = "+ Tambah Produk";
    } else {
      addProductPanel.classList.add("open");
      btnAddProduct.textContent = "✕ Tutup";
      addSearchInput.focus();
      if (addSearchResults.innerHTML === "") {
        addSearchResults.innerHTML = '<div class="add-search-empty">Ketik nama produk untuk mencari</div>';
      }
    }
  }

  // ── Batal/Kembali ──────────────────────────────────────────────────
  function handleBatal() {
    try {
      sessionStorage.removeItem(STORAGE_KEY_SELECTED);
      sessionStorage.removeItem(STORAGE_KEY_EDIT);
    } catch (err) { /* ignore */ }
    window.location.href = "../index.html";
  }

  // ── Lanjut ke Priview ──────────────────────────────────────────────
  function handleLanjut() {
    if (editState.items.length === 0) {
      showStatus("⚠️ Minimal 1 produk harus ada di daftar.", "error");
      return;
    }

    // Build payload untuk Priview
    var payload = {
      noNota: editState.noNota,
      namaPelanggan: editState.namaPelanggan,
      items: [],
      total: editState.total
    };

    for (var i = 0; i < editState.items.length; i++) {
      var item = editState.items[i];
      payload.items.push({
        produk: item.produk,
        qty: item.qty,
        hargaSatuan: item.hargaSatuan,
        subtotal: item.subtotal
      });
    }

    try {
      sessionStorage.setItem(STORAGE_KEY_EDIT, JSON.stringify(payload));
    } catch (err) {
      showStatus("❌ Gagal menyimpan data. Penyimpanan penuh.", "error");
      return;
    }

    // Redirect ke Priview (belum ada — Fase 3 yang bikin)
    window.location.href = "Priview/index.html";
  }

  // ── Init: read noNota, fetch data ──────────────────────────────────
  function init() {
    var noNota = null;
    try {
      noNota = sessionStorage.getItem(STORAGE_KEY_SELECTED);
    } catch (err) { /* ignore */ }

    if (!noNota || noNota.trim() === "") {
      showError("Tidak ada transaksi yang dipilih. Silakan pilih dari halaman Riwayat.");
      return;
    }

    noNota = noNota.trim();
    loadingIndicator.style.display = "block";

    // Fetch getRiwayat
    var url = MORODUIT_CONFIG.APPS_SCRIPT_URL
      + "?action=getRiwayat"
      + "&token=" + encodeURIComponent(MORODUIT_CONFIG.TOKEN);

    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!Array.isArray(data)) {
          showError("Gagal memuat data. Respons server tidak valid.");
          return;
        }

        // Filter by noNota
        var matchedRows = [];
        for (var i = 0; i < data.length; i++) {
          if (String(data[i].noNota) === noNota) {
            matchedRows.push(data[i]);
          }
        }

        if (matchedRows.length === 0) {
          showError("No Nota \"" + noNota + "\" tidak ditemukan di riwayat.");
          return;
        }

        // Build edit state
        var namaPelanggan = matchedRows[0].namaPelanggan || "";
        var items = [];
        for (var j = 0; j < matchedRows.length; j++) {
          var row = matchedRows[j];
          items.push({
            produk: row.produk,
            qty: Number(row.qty) || 1,
            hargaSatuan: Number(row.hargaSatuan) || 0,
            subtotal: Number(row.subtotal) || 0,
            _priceChanged: false
          });
        }

        editState = {
          noNota: noNota,
          namaPelanggan: namaPelanggan,
          items: items,
          total: 0
        };

        // Render header info
        displayNoNota.textContent = noNota;
        displayPelanggan.textContent = namaPelanggan || "-";
        headerSubtitle.textContent = "Nota " + noNota;

        recalcAndRender();
        showEditor();

        // Fetch katalog untuk "Tambah Produk"
        loadKatalog();
      })
      .catch(function (err) {
        showError("Gagal menghubungi server. Periksa koneksi internet.");
        console.error("Fetch error:", err);
      });
  }

  // ── Event listeners ────────────────────────────────────────────────
  batalBtn.addEventListener("click", handleBatal);
  lanjutBtn.addEventListener("click", handleLanjut);
  btnAddProduct.addEventListener("click", toggleAddPanel);

  addSearchInput.addEventListener("input", function () {
    renderAddResults(addSearchInput.value.trim());
  });

  // ── Init ───────────────────────────────────────────────────────────
  init();
})();
