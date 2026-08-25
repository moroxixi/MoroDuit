/* ══════════════════════════════════════════════════════════════════════
   MoroDuit Perkenalan — Script
   Fetch produk favorit (ditandai "Perkenalan" di Katalog) dan render
   ══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── Set WA link from config ──────────────────────────────────────
  var waLink = document.getElementById("waLink");
  if (waLink && MORODUIT_CONFIG && MORODUIT_CONFIG.NOMOR_WA_TOKO) {
    var noWA = MORODUIT_CONFIG.NOMOR_WA_TOKO.replace(/[^0-9]/g, "");
    waLink.href = "https://wa.me/" + noWA + "?text=" + encodeURIComponent("Halo Rofi, saya ingin bertanya tentang Belanja Online MoroDuit. ");
  }

  // ── DOM refs ───────────────────────────────────────────────────────
  var section = document.getElementById("produkFavoritSection");
  var loading = document.getElementById("loadingPerkenalan");
  var container = document.getElementById("produkPerkenalan");

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

  // ── Fetch & render ────────────────────────────────────────────────
  function loadProdukPerkenalan() {
    loading.style.display = "block";

    var url = MORODUIT_CONFIG.APPS_SCRIPT_URL
      + "?action=getKatalogPerkenalan"
      + "&token=" + encodeURIComponent(MORODUIT_CONFIG.TOKEN);

    fetch(url)
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        loading.style.display = "none";

        if (!Array.isArray(data) || data.length === 0) {
          // Belum ada produk ditandai — sembunyikan section
          section.style.display = "none";
          return;
        }

        // Sort A-Z
        data.sort(function (a, b) {
          var namaA = (a.produk || "").toLowerCase();
          var namaB = (b.produk || "").toLowerCase();
          return namaA.localeCompare(namaB, "id");
        });

        var html = "";
        for (var i = 0; i < data.length; i++) {
          var p = data[i];
          var fotoSrc = p.fotoPath ? ('../assets/images/' + p.fotoPath) : '';
          var fotoEl = fotoSrc
            ? '<img class="produk-favorit-foto-img" src="' + fotoSrc + '" alt="' + escapeHtml(p.produk) + '" loading="lazy">'
            : '<svg class="produk-favorit-foto-placeholder" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';

          html += '<div class="produk-favorit-card">'
                + '  <div class="produk-favorit-foto">' + fotoEl + '</div>'
                + '  <div class="produk-favorit-nama">' + escapeHtml(p.produk) + '</div>'
                + '  <div class="produk-favorit-harga">' + formatRupiah(p.hargaJual) + '</div>'
                + '</div>';
        }

        container.innerHTML = html;
        section.style.display = "block";
      })
      .catch(function (err) {
        loading.style.display = "none";
        section.style.display = "none";
        console.error("Fetch error (getKatalogPerkenalan):", err);
      });
  }

  // ── Init ───────────────────────────────────────────────────────────
  loadProdukPerkenalan();
})();
