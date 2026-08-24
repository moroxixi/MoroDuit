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

  // ── State ──────────────────────────────────────────────────────────
  var produkData = []; // Full unfiltered data from API
  var produkState = {}; // {index: {checked: bool, qty: number}} — survives re-render

  // ── Show status message ───────────────────────────────────────────
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = "status-message " + type;
  }

  function hideStatus() {
    statusMessage.className = "status-message hidden";
  }

  // ── Save current DOM state to produkState ─────────────────────────
  function saveState() {
    for (var i = 0; i < produkData.length; i++) {
      var checkbox = document.getElementById("chk_" + i);
      var qtyInput = document.getElementById("qty_" + i);
      if (checkbox) {
        if (!produkState[i]) produkState[i] = { checked: false, qty: 1 };
        produkState[i].checked = checkbox.checked;
        if (qtyInput) {
          var q = parseInt(qtyInput.value, 10);
          produkState[i].qty = (isNaN(q) || q < 1) ? 1 : q;
        }
      }
    }
  }

  // ── Get filtered data based on search + kategori ──────────────────
  function getFilteredData() {
    var query = searchInput.value.trim().toLowerCase();
    var selectedKategori = kategoriFilter.value;

    return produkData.filter(function (p, i) {
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
        renderProdukList(data);
      })
      .catch(function (err) {
        loadingIndicator.style.display = "none";
        showStatus("❌ Gagal menghubungi server. Periksa koneksi internet.", "error");
        console.error("Fetch error:", err);
      });
  }

  // ── Render product list (grouped by kategori, sorted A-Z) ────────
  function renderProdukList(data) {
    // 1. Group by kategori, preserving original order within each group
    var groups = {};
    var allIndices = []; // flat list of original indices, in render order
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
        allIndices.push(idx);
        var p = data[idx];
        html += '<div class="produk-card" data-index="' + idx + '">'
              + '  <div class="checkbox-wrapper">'
              + '    <input type="checkbox" id="chk_' + idx + '" '
              + '           data-index="' + idx + '">'
              + '    <label class="checkbox-custom" for="chk_' + idx + '"></label>'
              + '  </div>'
              + '  <div class="produk-info">'
              + '    <div class="produk-name">' + escapeHtml(p.produk) + '</div>'
              + '  </div>'
              + '  <div class="produk-harga">' + formatRupiah(p.hargaJual) + '</div>'
              + '  <div class="qty-wrapper">'
              + '    <input type="number" id="qty_' + idx + '" '
              + '           data-index="' + idx + '" '
              + '           min="1" max="999" value="1" disabled>'
              + '    <span class="qty-label">pcs</span>'
              + '  </div>'
              + '</div>';
      }

      html += '</div>';
    }

    produkList.innerHTML = html;

    // Apply saved state + attach event listeners for rendered items
    for (var j = 0; j < allIndices.length; j++) {
      var origIdx = allIndices[j];
      var state = produkState[origIdx];
      var chk = document.getElementById("chk_" + origIdx);
      var qty = document.getElementById("qty_" + origIdx);
      if (chk && state && state.checked) {
        chk.checked = true;
        qty.disabled = false;
        qty.value = state.qty;
        chk.closest(".produk-card").classList.add("checked");
      }
      attachListeners(origIdx);
    }
  }

  // ── Attach listeners for one product row ──────────────────────────
  function attachListeners(index) {
    var checkbox = document.getElementById("chk_" + index);
    var qtyInput = document.getElementById("qty_" + index);

    if (!produkState[index]) produkState[index] = { checked: false, qty: 1 };

    checkbox.addEventListener("change", function () {
      var isChecked = checkbox.checked;
      var card = checkbox.closest(".produk-card");

      qtyInput.disabled = !isChecked;

      if (isChecked) {
        card.classList.add("checked");
        qtyInput.focus();
        qtyInput.select();
      } else {
        card.classList.remove("checked");
        qtyInput.value = 1;
      }

      // Sync to state
      produkState[index].checked = isChecked;
      if (!isChecked) produkState[index].qty = 1;

      updateTotal();
    });

    qtyInput.addEventListener("input", function () {
      var q = parseInt(qtyInput.value, 10);
      produkState[index].qty = (isNaN(q) || q < 1) ? 1 : q;
      updateTotal();
    });
  }

  // ── Update total (live) — reads from produkState for filtered-out items
  function updateTotal() {
    var total = 0;

    for (var i = 0; i < produkData.length; i++) {
      var st = produkState[i];
      if (st && st.checked) {
        var harga = Number(produkData[i].hargaJual);
        var qty = st.qty;
        if (isNaN(qty) || qty < 1) qty = 1;
        total += harga * qty;
      }
    }

    totalValue.textContent = formatRupiah(total);
    checkoutBtn.disabled = (total === 0);
  }

  // ── Checkout ──────────────────────────────────────────────────────
  checkoutBtn.addEventListener("click", function () {
    saveState(); // ensure latest DOM state is captured
    var items = [];

    for (var i = 0; i < produkData.length; i++) {
      var st = produkState[i];
      if (st && st.checked) {
        var hargaJual = Number(produkData[i].hargaJual);
        var qty = st.qty;
        if (isNaN(qty) || qty < 1) qty = 1;

        items.push({
          produk: produkData[i].produk,
          qty: qty,
          hargaSatuan: Math.ceil(hargaJual),
          subtotal: Math.ceil(hargaJual * qty)
        });
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
      sessionStorage.setItem("moroduit_keranjang", JSON.stringify(keranjangData));
    } catch (err) {
      showStatus("❌ Gagal menyimpan keranjang. Penyimpanan penuh atau tidak tersedia.", "error");
      console.error("sessionStorage error:", err);
      return;
    }

    // Redirect to preview page
    window.location.href = "../Keranjang-Duit/Priview/index.html";
  });

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

  // ── Filter event listeners ───────────────────────────────────────
  searchInput.addEventListener("input", function () {
    applyFilters();
  });

  kategoriFilter.addEventListener("change", function () {
    applyFilters();
  });

  // ── Init ───────────────────────────────────────────────────────────
  loadKatalog();
})();
