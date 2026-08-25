/* ══════════════════════════════════════════════════════════════════════
   MoroDuit Keranjang-Duit — Script
   Fetch katalog, pilih item, hitung total, checkout ke sessionStorage
   ══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── DOM refs ───────────────────────────────────────────────────────
  var loadingIndicator = document.getElementById("loadingIndicator");
  var produkList = document.getElementById("produkList");
  var statusMessage = document.getElementById("statusMessage");
  var totalValue = document.getElementById("totalValue");
  var checkoutBtn = document.getElementById("checkoutBtn");
  var namaPelangganInput = document.getElementById("namaPelanggan");
  var searchInput = document.getElementById("searchInput");
  var kategoriFilter = document.getElementById("kategoriFilter");
  var kosongkanBtn = document.getElementById("kosongkanBtn");

  // ── Constants ──────────────────────────────────────────────────────
  var STORAGE_KEY_SELECTION = "moroduit_selection";
  var STORAGE_KEY_KERANJANG = "moroduit_keranjang";
  var STORAGE_KEY_NAMA = "moroduit_nama_pelanggan";

  // ── State ──────────────────────────────────────────────────────────
  var produkData = []; // Full unfiltered data from API
  var produkState = {}; // {namaProduk: {checked: bool, qty: number}} — keyed by product name

  // ── Helpers ────────────────────────────────────────────────────────

  /**
   * Convert a product name into a safe HTML element ID.
   * Normalizes unicode, lowercases, replaces non-alphanumerics with underscore.
   */
  function toSafeId(nama) {
    return "p_"
      + nama
        .normalize("NFKD")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
  }

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

  // ── Show/hide status message ───────────────────────────────────────
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = "status-message " + type;
  }

  function hideStatus() {
    statusMessage.className = "status-message hidden";
  }

  // ── Save current DOM state to produkState (keyed by Nama Produk) ──
  function saveState() {
    for (var i = 0; i < produkData.length; i++) {
      var nama = produkData[i].produk;
      var safeId = toSafeId(nama);
      var checkbox = document.getElementById("chk_" + safeId);
      var qtyInput = document.getElementById("qty_" + safeId);
      if (checkbox) {
        if (!produkState[nama]) produkState[nama] = { checked: false, qty: 1 };
        produkState[nama].checked = checkbox.checked;
        if (qtyInput) {
          var q = parseInt(qtyInput.value, 10);
          produkState[nama].qty = (isNaN(q) || q < 1) ? 1 : q;
        }
      }
    }
  }

  // ── Get filtered data based on search + kategori ──────────────────
  function getFilteredData() {
    var query = searchInput.value.trim().toLowerCase();
    var selectedKategori = kategoriFilter.value;

    return produkData.filter(function (p) {
      // Search filter: substring match on product name
      if (query !== "") {
        var namaProduk = (p.produk || "").toLowerCase();
        if (namaProduk.indexOf(query) === -1) return false;
      }
      // Kategori filter: exact match (empty = show all)
      if (selectedKategori !== "") {
        var kategori = (p.kategori && p.kategori.trim() !== "")
          ? p.kategori.trim() : "Lainnya";
        if (kategori !== selectedKategori) return false;
      }
      return true;
    });
  }

  // ── Populate kategori dropdown from data ──────────────────────────
  function populateKategoriFilter() {
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
    var html = '<option value="">Semua Kategori</option>';
    for (var j = 0; j < sorted.length; j++) {
      html += '<option value="' + escapeHtml(sorted[j]) + '">'
            + escapeHtml(sorted[j]) + '</option>';
    }
    kategoriFilter.innerHTML = html;
  }

  // ── Apply filters and re-render ──────────────────────────────────
  function applyFilters() {
    saveState();
    var filtered = getFilteredData();
    renderProdukList(filtered);
  }

  // ── Fetch katalog ─────────────────────────────────────────────────
  function loadKatalog() {
    loadingIndicator.style.display = "block";
    produkList.innerHTML = "";

    var url = MORODUIT_CONFIG.APPS_SCRIPT_URL
      + "?action=getKatalog"
      + "&token=" + encodeURIComponent(MORODUIT_CONFIG.TOKEN);

    fetch(url)
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        loadingIndicator.style.display = "none";

        if (!Array.isArray(data)) {
          showStatus("❌ Gagal memuat produk. Data tidak valid.", "error");
          return;
        }

        if (data.length === 0) {
          produkList.innerHTML = '<div class="empty-state">Belum ada produk tersedia.</div>';
          return;
        }

        hideStatus();
        produkData = data;

        // Sort produk A-Z berdasarkan nama (case-insensitive)
        // Hasil sort berlaku untuk renderProdukList & getFilteredData
        // karena keduanya bergantung pada urutan array produkData.
        produkData.sort(function (a, b) {
          var namaA = (a.produk || "").toLowerCase();
          var namaB = (b.produk || "").toLowerCase();
          return namaA.localeCompare(namaB, "id");
        });

        populateKategoriFilter();

        // Restore selection state from sessionStorage FIRST,
        // then render once with state applied (avoids flash of unchecked state)
        restoreSelectionFromStorage();
        renderProdukList(produkData);

        // Explicitly calculate total — renderProdukList applies checked state
        // via direct DOM property (chk.checked = true) which does NOT fire
        // change events, so updateTotal() is never triggered implicitly.
        updateTotal();

        // Restore Nama Pelanggan from sessionStorage
        restoreNamaPelanggan();
      })
      .catch(function (err) {
        loadingIndicator.style.display = "none";
        showStatus("❌ Gagal menghubungi server. Periksa koneksi internet.", "error");
        console.error("Fetch error:", err);
      });
  }

  // ── Render product list (grouped by kategori, sorted A-Z) ────────
  // State is keyed by Nama Produk (not index), so filter changes
  // do NOT affect which products appear checked.
  function renderProdukList(data) {
    // 1. Group by kategori, preserving original order within each group
    var groups = {};
    var allNames = []; // flat list of product names, in render order
    for (var i = 0; i < data.length; i++) {
      var kategori = (data[i].kategori && data[i].kategori.trim() !== "")
        ? data[i].kategori.trim() : "Lainnya";
      if (!groups[kategori]) groups[kategori] = [];
      groups[kategori].push(i);
    }

    // 2. Sort kategori names A-Z; "Lainnya" always last
    var sortedKategori = Object.keys(groups).sort(function (a, b) {
      if (a === "Lainnya") return 1;
      if (b === "Lainnya") return -1;
      return a.localeCompare(b);
    });

    // 3. Render per group
    var html = "";
    for (var g = 0; g < sortedKategori.length; g++) {
      var namaKategori = sortedKategori[g];
      var indices = groups[namaKategori];

      html += '<div class="kategori-group">'
            + '  <h3 class="kategori-heading">' + escapeHtml(namaKategori) + '</h3>';

      for (var k = 0; k < indices.length; k++) {
        var idx = indices[k];
        var p = data[idx];
        var nama = p.produk;
        var safeId = toSafeId(nama);
        allNames.push(nama);

        var fotoSrc = p.fotoPath ? ('../assets/images/' + p.fotoPath) : '';
        var fotoEl = fotoSrc
          ? '<img class="produk-foto-img" src="' + fotoSrc + '" alt="' + escapeHtml(nama) + '" loading="lazy">'
          : '<svg class="produk-foto-placeholder" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';

        html += '<div class="produk-card" data-nama="' + escapeHtml(nama) + '">'
              + '  <div class="checkbox-wrapper">'
              + '    <input type="checkbox" id="chk_' + safeId + '" '
              + '           data-nama="' + escapeHtml(nama) + '">'
              + '    <label class="checkbox-custom" for="chk_' + safeId + '"></label>'
              + '  </div>'
              + '  <div class="produk-foto">' + fotoEl + '</div>'
              + '  <div class="produk-info">'
              + '    <div class="produk-name">' + escapeHtml(nama) + '</div>'
              + '  </div>'
              + '  <div class="produk-harga">' + formatRupiah(p.hargaJual) + '</div>'
              + '  <div class="qty-wrapper">'
              + '    <button type="button" class="qty-btn qty-minus" id="qtyMinus_' + safeId + '" data-nama="' + escapeHtml(nama) + '" disabled aria-label="Kurangi jumlah">−</button>'
              + '    <input type="number" id="qty_' + safeId + '" class="qty-value" data-nama="' + escapeHtml(nama) + '" min="1" max="999" value="1" disabled readonly>'
              + '    <button type="button" class="qty-btn qty-plus" id="qtyPlus_' + safeId + '" data-nama="' + escapeHtml(nama) + '" disabled aria-label="Tambah jumlah">+</button>'
              + '    <span class="qty-label">pcs</span>'
              + '  </div>'
              + '</div>';
      }

      html += '</div>';
    }

    produkList.innerHTML = html;

    // Apply saved state + attach event listeners for rendered items
    for (var j = 0; j < allNames.length; j++) {
      var namaProduk = allNames[j];
      var safeId2 = toSafeId(namaProduk);
      var state = produkState[namaProduk];
      var chk = document.getElementById("chk_" + safeId2);
      var qty = document.getElementById("qty_" + safeId2);
      if (chk && state && state.checked) {
        chk.checked = true;
        qty.disabled = false;
        qty.value = state.qty;
        var minusBtn = document.getElementById("qtyMinus_" + safeId2);
        var plusBtn = document.getElementById("qtyPlus_" + safeId2);
        if (minusBtn) minusBtn.disabled = false;
        if (plusBtn) plusBtn.disabled = false;
        chk.closest(".produk-card").classList.add("checked");
      }
      attachListeners(namaProduk, safeId2);
    }
  }

  // ── Attach listeners for one product row ──────────────────────────
  function attachListeners(nama, safeId) {
    var checkbox = document.getElementById("chk_" + safeId);
    var qtyInput = document.getElementById("qty_" + safeId);
    var minusBtn = document.getElementById("qtyMinus_" + safeId);
    var plusBtn = document.getElementById("qtyPlus_" + safeId);

    if (!produkState[nama]) produkState[nama] = { checked: false, qty: 1 };

    checkbox.addEventListener("change", function () {
      var isChecked = checkbox.checked;
      var card = checkbox.closest(".produk-card");

      qtyInput.disabled = !isChecked;
      minusBtn.disabled = !isChecked;
      plusBtn.disabled = !isChecked;

      if (isChecked) {
        card.classList.add("checked");
      } else {
        card.classList.remove("checked");
        qtyInput.value = 1;
      }

      // Sync to state (keyed by Nama Produk)
      produkState[nama].checked = isChecked;
      if (!isChecked) produkState[nama].qty = 1;

      updateTotal();
    });

    minusBtn.addEventListener("click", function () {
      var q = parseInt(qtyInput.value, 10);
      if (isNaN(q) || q <= 1) return;
      q -= 1;
      qtyInput.value = q;
      produkState[nama].qty = q;
      updateTotal();
    });

    plusBtn.addEventListener("click", function () {
      var q = parseInt(qtyInput.value, 10);
      if (isNaN(q)) q = 1;
      if (q >= 999) return;
      q += 1;
      qtyInput.value = q;
      produkState[nama].qty = q;
      updateTotal();
    });
  }

  // ── Update total (live) — reads ALL checked items in produkState
  //    (not just currently rendered ones), so total stays correct
  //    even when items are filtered out. ──────────────────────────────
  function updateTotal() {
    var total = 0;
    var hasChecked = false;

    // Iterate all keys in produkState (includes items filtered out of view)
    for (var nama in produkState) {
      if (!Object.prototype.hasOwnProperty.call(produkState, nama)) continue;
      var st = produkState[nama];
      if (st && st.checked) {
        hasChecked = true;
        // Find product in produkData by name
        for (var i = 0; i < produkData.length; i++) {
          if (produkData[i].produk === nama) {
            var harga = Number(produkData[i].hargaJual);
            var qty = st.qty;
            if (isNaN(qty) || qty < 1) qty = 1;
            total += harga * qty;
            break;
          }
        }
      }
    }

    totalValue.textContent = formatRupiah(total);
    checkoutBtn.disabled = !hasChecked;
  }

  // ── Restore selection state from sessionStorage ───────────────────
  //    Called after loadKatalog to survive checkout round-trip
  //    (checkout navigates to Priview/ page, then user may return).
  function restoreSelectionFromStorage() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY_SELECTION);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object") return;
      for (var nama in saved) {
        if (!Object.prototype.hasOwnProperty.call(saved, nama)) continue;
        var entry = saved[nama];
        if (entry && typeof entry.checked === "boolean") {
          produkState[nama] = {
            checked: entry.checked,
            qty: (typeof entry.qty === "number" && entry.qty >= 1) ? entry.qty : 1
          };
        }
      }
    } catch (err) {
      console.warn("Gagal restore selection dari sessionStorage:", err);
    }
  }

  // ── Persist Nama Pelanggan to sessionStorage ─────────────────────
  function persistNamaPelanggan() {
    try {
      var val = namaPelangganInput ? namaPelangganInput.value.trim() : "";
      sessionStorage.setItem(STORAGE_KEY_NAMA, val);
    } catch (err) {
      console.error("Gagal simpan nama pelanggan ke sessionStorage:", err);
    }
  }

  // ── Restore Nama Pelanggan from sessionStorage ───────────────────
  function restoreNamaPelanggan() {
    try {
      var val = sessionStorage.getItem(STORAGE_KEY_NAMA);
      if (val !== null && namaPelangganInput) {
        namaPelangganInput.value = val;
      }
    } catch (err) {
      console.warn("Gagal restore nama pelanggan dari sessionStorage:", err);
    }
  }

  // ── Persist selection state to sessionStorage ─────────────────────
  //    Called on checkout and on clear-cart, so selections survive
  //    navigation to Priview/ and back.
  function persistSelectionToStorage() {
    try {
      // Build a clean snapshot of only checked items
      var snapshot = {};
      for (var nama in produkState) {
        if (!Object.prototype.hasOwnProperty.call(produkState, nama)) continue;
        var st = produkState[nama];
        if (st && st.checked) {
          snapshot[nama] = { checked: true, qty: st.qty };
        }
      }
      sessionStorage.setItem(STORAGE_KEY_SELECTION, JSON.stringify(snapshot));
    } catch (err) {
      console.error("Gagal simpan selection ke sessionStorage:", err);
    }
  }

  // ── Checkout ──────────────────────────────────────────────────────
  checkoutBtn.addEventListener("click", function () {
    saveState(); // ensure latest DOM state is captured
    var items = [];

    // Build items array from produkState (keyed by Nama Produk)
    for (var nama in produkState) {
      if (!Object.prototype.hasOwnProperty.call(produkState, nama)) continue;
      var st = produkState[nama];
      if (st && st.checked) {
        // Find product in produkData by name
        for (var i = 0; i < produkData.length; i++) {
          if (produkData[i].produk === nama) {
            var hargaJual = Number(produkData[i].hargaJual);
            var qty = st.qty;
            if (isNaN(qty) || qty < 1) qty = 1;

            items.push({
              produk: nama,
              qty: qty,
              hargaSatuan: Math.ceil(hargaJual),
              subtotal: Math.ceil(hargaJual * qty)
            });
            break;
          }
        }
      }
    }

    // Calculate total from items (already ceil'd per-item)
    var total = 0;
    for (var j = 0; j < items.length; j++) {
      total += items[j].subtotal;
    }
    total = Math.ceil(total);

    // Save to sessionStorage
    var namaPelanggan = namaPelangganInput ? namaPelangganInput.value.trim() : "";
    var keranjangData = {
      items: items,
      total: total,
      namaPelanggan: namaPelanggan
    };

    try {
      sessionStorage.setItem(STORAGE_KEY_KERANJANG, JSON.stringify(keranjangData));
    } catch (err) {
      showStatus("❌ Gagal menyimpan keranjang. Penyimpanan penuh atau tidak tersedia.", "error");
      console.error("sessionStorage error:", err);
      return;
    }

    // Persist selection state so it survives the round-trip to Priview/ and back
    persistSelectionToStorage();
    persistNamaPelanggan();

    // Redirect to preview page
    window.location.href = "../Keranjang-Duit/Priview/index.html";
  });

  // ── Kosongkan Keranjang button ────────────────────────────────────
  //    Resets ALL checkboxes + qty across ALL categories,
  //    clears sessionStorage selection, with confirmation dialog.
  kosongkanBtn.addEventListener("click", function () {
    if (!confirm("Yakin ingin mengosongkan keranjang? Semua pilihan akan dihapus.")) {
      return;
    }

    // 1. Clear all state in produkState (all products, all categories)
    for (var nama in produkState) {
      if (!Object.prototype.hasOwnProperty.call(produkState, nama)) continue;
      produkState[nama] = { checked: false, qty: 1 };
    }

    // 2. Clear sessionStorage selection (persists across page loads)
    try {
      sessionStorage.removeItem(STORAGE_KEY_SELECTION);
    } catch (err) {
      console.warn("Gagal clear selection dari sessionStorage:", err);
    }

    // 3. Reset all DOM checkboxes and qty inputs currently rendered
    var checkboxes = produkList.querySelectorAll('input[type="checkbox"]');
    for (var c = 0; c < checkboxes.length; c++) {
      checkboxes[c].checked = false;
      var card = checkboxes[c].closest(".produk-card");
      if (card) card.classList.remove("checked");
    }

    var qtyInputs = produkList.querySelectorAll(".qty-value");
    for (var q = 0; q < qtyInputs.length; q++) {
      qtyInputs[q].value = 1;
      qtyInputs[q].disabled = true;
    }

    var minusBtns = produkList.querySelectorAll(".qty-minus");
    for (var m = 0; m < minusBtns.length; m++) {
      minusBtns[m].disabled = true;
    }

    var plusBtns = produkList.querySelectorAll(".qty-plus");
    for (var p = 0; p < plusBtns.length; p++) {
      plusBtns[p].disabled = true;
    }

    // 4. Update total to 0
    updateTotal();
  });

  // ── Nama Pelanggan auto-persist on input ─────────────────────────
  if (namaPelangganInput) {
    namaPelangganInput.addEventListener("input", function () {
      persistNamaPelanggan();
    });
  }

  // ── Filter event listeners ───────────────────────────────────────
  searchInput.addEventListener("input", function () {
    applyFilters();
  });

  kategoriFilter.addEventListener("change", function () {
    applyFilters();
  });

  // ── Init ───────────────────────────────────────────────────────────
  loadKatalog();

  // ── BFCache handler ───────────────────────────────────────────────
  // When user navigates back (e.g. browser back button from Priview/),
  // the browser may restore this page from bfcache WITHOUT re-running
  // the script. In that case loadKatalog() never fires, so we re-run
  // the restore + re-render here to bring back checked selections.
  window.addEventListener("pageshow", function (event) {
    if (event.persisted && produkData.length > 0) {
      restoreSelectionFromStorage();
      renderProdukList(produkData);
      updateTotal();
      restoreNamaPelanggan();
    }
  });
})();
