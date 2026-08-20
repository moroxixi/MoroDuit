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

  // ── State ──────────────────────────────────────────────────────────
  var produkData = []; // Array of {produk, hargaJual, catatan}

  // ── Show status message ───────────────────────────────────────────
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = "status-message " + type;
  }

  function hideStatus() {
    statusMessage.className = "status-message hidden";
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
    for (var i = 0; i < data.length; i++) {
      var kategori = (data[i].kategori && data[i].kategori.trim() !== "")
        ? data[i].kategori.trim() : "Lainnya";
      if (!groups[kategori]) groups[kategori] = [];
      groups[kategori].push(i); // store original index
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

    // Attach event listeners
    for (var j = 0; j < data.length; j++) {
      attachListeners(j);
    }
  }

  // ── Attach listeners for one product row ──────────────────────────
  function attachListeners(index) {
    var checkbox = document.getElementById("chk_" + index);
    var qtyInput = document.getElementById("qty_" + index);

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

      updateTotal();
    });

    qtyInput.addEventListener("input", function () {
      updateTotal();
    });
  }

  // ── Update total (live) ──────────────────────────────────────────
  function updateTotal() {
    var total = 0;

    for (var i = 0; i < produkData.length; i++) {
      var checkbox = document.getElementById("chk_" + i);
      var qtyInput = document.getElementById("qty_" + i);

      if (checkbox && checkbox.checked) {
        var harga = Number(produkData[i].hargaJual);
        var qty = parseInt(qtyInput.value, 10);
        if (isNaN(qty) || qty < 1) qty = 1;
        total += harga * qty;
      }
    }

    totalValue.textContent = formatRupiah(total);
    checkoutBtn.disabled = (total === 0);
  }

  // ── Checkout ──────────────────────────────────────────────────────
  checkoutBtn.addEventListener("click", function () {
    var items = [];

    for (var i = 0; i < produkData.length; i++) {
      var checkbox = document.getElementById("chk_" + i);
      var qtyInput = document.getElementById("qty_" + i);

      if (checkbox && checkbox.checked) {
        var hargaJual = Number(produkData[i].hargaJual);
        var qty = parseInt(qtyInput.value, 10);
        if (isNaN(qty) || qty < 1) qty = 1;

        items.push({
          produk: produkData[i].produk,
          qty: qty,
          hargaSatuan: hargaJual,
          subtotal: hargaJual * qty
        });
      }
    }

    // Calculate total from items
    var total = 0;
    for (var j = 0; j < items.length; j++) {
      total += items[j].subtotal;
    }

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
    return "Rp " + num.toLocaleString("id-ID");
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ── Init ───────────────────────────────────────────────────────────
  loadKatalog();
})();
