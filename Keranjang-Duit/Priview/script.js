/* ══════════════════════════════════════════════════════════════════════
   MoroDuit Priview — Script
   Baca sessionStorage, tampilkan nota draft, POST simpanRiwayat saat Print
   ══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── DOM refs ───────────────────────────────────────────────────────
  var errorState = document.getElementById("errorState");
  var notaContainer = document.getElementById("notaContainer");
  var namaPelangganEl = document.getElementById("namaPelanggan");
  var tanggalEl = document.getElementById("tanggal");
  var notaItemsEl = document.getElementById("notaItems");
  var totalValueEl = document.getElementById("totalValue");
  var printBtn = document.getElementById("printBtn");
  var batalBtn = document.getElementById("batalBtn");
  var statusMessage = document.getElementById("statusMessage");

  // ── Read sessionStorage ───────────────────────────────────────────
  var keranjangData = null;

  try {
    var raw = sessionStorage.getItem("moroduit_keranjang");
    if (raw) {
      keranjangData = JSON.parse(raw);
    }
  } catch (err) {
    keranjangData = null;
  }

  // Validate data
  if (
    !keranjangData ||
    !keranjangData.items ||
    !Array.isArray(keranjangData.items) ||
    keranjangData.items.length === 0
  ) {
    showError();
    return;
  }

  // ── Data valid — render nota ──────────────────────────────────────
  showNota();
  renderNota(keranjangData);

  // ── Show error state ──────────────────────────────────────────────
  function showError() {
    errorState.classList.remove("hidden");
    notaContainer.classList.add("hidden");
  }

  // ── Show nota ─────────────────────────────────────────────────────
  function showNota() {
    errorState.classList.add("hidden");
    notaContainer.classList.remove("hidden");
  }

  // ── Render nota ───────────────────────────────────────────────────
  function renderNota(data) {
    // Set nama pelanggan
    var namaPelanggan = data.namaPelanggan || "";
    namaPelangganEl.textContent = namaPelanggan !== "" ? namaPelanggan : "-";

    // Set tanggal draft (client-side)
    var now = new Date();
    var tanggalStr = now.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    tanggalEl.textContent = tanggalStr;

    // Render items
    var html = "";
    for (var i = 0; i < data.items.length; i++) {
      var item = data.items[i];
      html += '<tr>'
            + '<td class="col-no">' + (i + 1) + '</td>'
            + '<td class="col-produk">' + escapeHtml(item.produk) + '</td>'
            + '<td class="col-qty">' + item.qty + '</td>'
            + '<td class="col-harga">' + formatRupiah(item.hargaSatuan) + '</td>'
            + '<td class="col-subtotal">' + formatRupiah(item.subtotal) + '</td>'
            + '</tr>';
    }
    notaItemsEl.innerHTML = html;

    // Set total
    totalValueEl.textContent = formatRupiah(data.total);
  }

  // ── Print button click handler ───────────────────────────────────
  printBtn.addEventListener("click", function () {
    // Disable button (prevent double-click)
    printBtn.disabled = true;
    printBtn.textContent = "⏳ Menyimpan & Mencetak...";

    var payload = {
      action: "simpanRiwayat",
      token: MORODUIT_CONFIG.TOKEN,
      items: keranjangData.items,
      total: keranjangData.total,
      namaPelanggan: keranjangData.namaPelanggan || ""
    };

    fetch(MORODUIT_CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json(); })
      .then(function (response) {
        if (response.success && response.tanggal) {
          // Update display with real Tanggal
          tanggalEl.textContent = response.tanggal;

          // Remove from sessionStorage (prevent double-submit)
          sessionStorage.removeItem("moroduit_keranjang");

          // Screenshot & download (before print, avoids @media print CSS)
          captureAndDownloadNota(response.noNota);

          // Print
          window.print();
        } else {
          // Server returned failure
          handlePrintError(response.error || "Gagal menyimpan nota");
        }
      })
      .catch(function (err) {
        handlePrintError("Gagal menghubungi server. Periksa koneksi internet.");
        console.error("Print fetch error:", err);
      });
  });

  function handlePrintError(message) {
    printBtn.disabled = false;
    printBtn.textContent = "🖨️ Print & Simpan Nota";

    statusMessage.textContent = "❌ " + message;
    statusMessage.className = "status-message error";

    // DO NOT remove sessionStorage — user can retry
  }

  // ── Screenshot & auto-download nota ──────────────────────────────
  function captureAndDownloadNota(noNota) {
    try {
      if (typeof html2canvas === "undefined") {
        console.warn("html2canvas not loaded, skipping screenshot");
        return;
      }

      var notaEl = document.getElementById("nota");
      if (!notaEl) {
        console.warn("Nota element not found, skipping screenshot");
        return;
      }

      // Sanitize noNota for filename
      var safeNoNota = noNota ? String(noNota).replace(/[^A-Za-z0-9_-]/g, "-") : null;
      var timestamp = Date.now();
      var filename = safeNoNota
        ? "Nota-" + safeNoNota + "-" + timestamp + ".png"
        : "Nota-" + timestamp + ".png";

      html2canvas(notaEl).then(function (canvas) {
        canvas.toBlob(function (blob) {
          if (!blob) {
            console.warn("Failed to create blob for screenshot");
            return;
          }
          var url = URL.createObjectURL(blob);
          var a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, "image/png");
      }).catch(function (err) {
        console.error("html2canvas render failed:", err);
      });
    } catch (err) {
      console.error("Screenshot capture failed:", err);
    }
  }

  // ── Batal button click handler ───────────────────────────────────
  batalBtn.addEventListener("click", function () {
    sessionStorage.removeItem("moroduit_keranjang");
    window.location.href = "../index.html";
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
})();
