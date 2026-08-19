/* ══════════════════════════════════════════════════════════════════════
   MoroDuit Input — Script
   Form管理 + API 调用 (getKatalogFull / updateProduk)
   ══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── State ──────────────────────────────────────────────────────────
  var hargaJualTouched = false;
  var selectedProdukName = null;

  // ── DOM refs ───────────────────────────────────────────────────────
  var form = document.getElementById("produkForm");
  var inputProduk = document.getElementById("produk");
  var inputHargaNormal = document.getElementById("hargaNormal");
  var inputHargaPromo = document.getElementById("hargaPromo");
  var inputHargaJual = document.getElementById("hargaJual");
  var inputKategori = document.getElementById("kategori");
  var inputCatatan = document.getElementById("catatan");
  var checkboxStokHabis = document.getElementById("stokHabis");
  var submitBtn = document.getElementById("submitBtn");
  var newProdukBtn = document.getElementById("newProdukBtn");
  var statusMessage = document.getElementById("statusMessage");
  var produkList = document.getElementById("produkList");
  var loadingIndicator = document.getElementById("loadingIndicator");

  // ── Harga Jual: linked-until-touched ──────────────────────────────
  inputHargaNormal.addEventListener("input", function () {
    if (!hargaJualTouched) {
      inputHargaJual.value = inputHargaNormal.value;
    }
  });

  inputHargaJual.addEventListener("input", function () {
    hargaJualTouched = true;
  });

  // ── Show status message ───────────────────────────────────────────
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = "status-message " + type;
    // Auto-hide after 5 seconds
    setTimeout(function () {
      statusMessage.className = "status-message hidden";
    }, 5000);
  }

  // ── Clear form ────────────────────────────────────────────────────
  function clearForm() {
    form.reset();
    hargaJualTouched = false;
    selectedProdukName = null;
    submitBtn.textContent = "💾 Simpan Produk";

    // Remove selected class from list items
    var items = produkList.querySelectorAll(".produk-item");
    for (var i = 0; i < items.length; i++) {
      items[i].classList.remove("selected");
    }
  }

  // ── Fetch & render product list ───────────────────────────────────
  function loadProdukList() {
    loadingIndicator.style.display = "block";

    var url = MORODUIT_CONFIG.APPS_SCRIPT_URL
      + "?action=getKatalogFull"
      + "&token=" + encodeURIComponent(MORODUIT_CONFIG.TOKEN);

    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        loadingIndicator.style.display = "none";
        renderProdukList(data);
      })
      .catch(function (err) {
        loadingIndicator.style.display = "none";
        produkList.innerHTML = '<div class="empty-state">Gagal memuat data. Coba muat ulang halaman.</div>';
        console.error("Gagal fetch katalog:", err);
      });
  }

  function renderProdukList(produkArray) {
    if (!produkArray || produkArray.length === 0) {
      produkList.innerHTML = '<div class="empty-state">Belum ada produk. Silakan tambah produk baru!</div>';
      return;
    }

    var html = "";
    for (var i = 0; i < produkArray.length; i++) {
      var p = produkArray[i];
      var statusClass = p.status === "Ada" ? "ada" : "tidak-ada";
      var statusLabel = p.status === "Ada" ? "Stok Ada" : "Stok Habis";
      var hargaFormatted = formatRupiah(p.hargaJual);

      html += '<div class="produk-item" role="listitem" tabindex="0" '
            + 'data-produk="' + escapeHtml(p.produk) + '" '
            + 'data-kategori="' + escapeHtml(p.kategori || "") + '" '
            + 'data-harga-normal="' + p.hargaNormal + '" '
            + 'data-harga-promo="' + (p.hargaPromo || "") + '" '
            + 'data-harga-jual="' + p.hargaJual + '" '
            + 'data-status="' + escapeHtml(p.status) + '" '
            + 'data-catatan="' + escapeHtml(p.catatan) + '">'
            + '<span class="produk-name">' + escapeHtml(p.produk) + '</span>'
            + '<span class="produk-kategori">' + escapeHtml(p.kategori || "-") + '</span>'
            + '<span class="produk-status ' + statusClass + '">' + statusLabel + '</span>'
            + '<span class="produk-price">' + hargaFormatted + '</span>'
            + '</div>';
    }

    produkList.innerHTML = html;

    // Attach click handlers
    var items = produkList.querySelectorAll(".produk-item");
    for (var j = 0; j < items.length; j++) {
      items[j].addEventListener("click", handleProdukClick);
      items[j].addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleProdukClick.call(this, e);
        }
      });
    }
  }

  // ── Click handler: prefill form ───────────────────────────────────
  function handleProdukClick(e) {
    var el = e.currentTarget;
    var produk = el.getAttribute("data-produk");
    var kategori = el.getAttribute("data-kategori");
    var hargaNormal = el.getAttribute("data-harga-normal");
    var hargaPromo = el.getAttribute("data-harga-promo");
    var hargaJual = el.getAttribute("data-harga-jual");
    var status = el.getAttribute("data-status");
    var catatan = el.getAttribute("data-catatan");

    inputProduk.value = produk;
    inputKategori.value = kategori;
    inputHargaNormal.value = hargaNormal;
    inputHargaPromo.value = hargaPromo;
    inputHargaJual.value = hargaJual;
    inputCatatan.value = catatan;
    checkboxStokHabis.checked = (status === "Tidak Ada");

    // Reset auto-sync when selecting existing product
    hargaJualTouched = false;
    inputHargaJual.value = hargaJual;

    selectedProdukName = produk;
    submitBtn.textContent = "💾 Update Produk";

    // Highlight selected
    var items = produkList.querySelectorAll(".produk-item");
    for (var i = 0; i < items.length; i++) {
      items[i].classList.remove("selected");
    }
    el.classList.add("selected");

    // Scroll form into view on mobile
    document.querySelector(".form-section").scrollIntoView({ behavior: "smooth" });
  }

  // ── Form submit ───────────────────────────────────────────────────
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var produk = inputProduk.value.trim();
    var hargaNormal = inputHargaNormal.value;
    var hargaPromo = inputHargaPromo.value;
    var hargaJual = inputHargaJual.value;
    var kategori = inputKategori.value;
    var catatan = inputCatatan.value.trim();
    var status = checkboxStokHabis.checked ? "Tidak Ada" : "Ada";

    if (!produk) {
      showStatus("⚠️ Nama produk wajib diisi!", "error");
      inputProduk.focus();
      return;
    }

    if (!hargaNormal) {
      showStatus("⚠️ Harga Normal wajib diisi!", "error");
      inputHargaNormal.focus();
      return;
    }

    if (!kategori) {
      showStatus("⚠️ Kategori wajib dipilih!", "error");
      inputKategori.focus();
      return;
    }

    var payload = {
      action: "updateProduk",
      token: MORODUIT_CONFIG.TOKEN,
      produk: produk,
      kategori: kategori,
      hargaNormal: Number(hargaNormal),
      hargaJual: Number(hargaJual || hargaNormal),
      status: status,
      catatan: catatan
    };

    // Only include hargaPromo if it has a value
    if (hargaPromo !== "") {
      payload.hargaPromo = Number(hargaPromo);
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "⏳ Menyimpan...";

    fetch(MORODUIT_CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        submitBtn.disabled = false;
        if (data.success) {
          showStatus("✅ Produk berhasil disimpan!", "success");
          clearForm();
          loadProdukList();
        } else {
          showStatus("❌ Gagal: " + (data.error || "Unknown error"), "error");
          submitBtn.textContent = "💾 Simpan Produk";
        }
      })
      .catch(function (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = "💾 Simpan Produk";
        showStatus("❌ Gagal menghubungi server. Periksa koneksi.", "error");
        console.error("Fetch error:", err);
      });
  });

  // ── New product button ────────────────────────────────────────────
  newProdukBtn.addEventListener("click", function () {
    clearForm();
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
  loadProdukList();
})();
