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

  // ── Render product list ───────────────────────────────────────────
  function renderProdukList(data) {
    var html = "";

    for (var i = 0; i < data.length; i++) {
      var p = data[i];
      var catatanHtml = "";
      if (p.catatan && p.catatan.trim() !== "") {
        catatanHtml = '<div class="produk-catatan">' + escapeHtml(p.catatan) + '</div>';
      }

      html += '<div class="produk-card" data-index="' + i + '">'
            + '  <div class="checkbox-wrapper">'
            + '    <input type="checkbox" id="chk_' + i + '" '
            + '           data-index="' + i + '">'
            + '    <label class="checkbox-custom" for="chk_' + i + '"></label>'
            + '  </div>'
            + '  <div class="produk-info">'
            + '    <div class="produk-name">' + escapeHtml(p.produk) + '</div>'
            + catatanHtml
            + '  </div>'
            + '  <div class="produk-harga">' + formatRupiah(p.hargaJual) + '</div>'
            + '  <div class="qty-wrapper">'
            + '    <input type="number" id="qty_' + i + '" '
            + '           data-index="' + i + '" '
            + '           min="1" max="999" value="1" disabled>'
            + '    <span class="qty-label">pcs</span>'
            + '  </div>'
            + '</div>';
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
    var keranjangData = {
      items: items,
      total: total
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
