/* ══════════════════════════════════════════════════════════════════════
   MoroDuit Priview — Script
   Baca sessionStorage, tampilkan nota draft, POST simpanRiwayat saat Print
   ══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── DOM refs ───────────────────────────────────────────────────────
  var errorState = document.getElementById("errorState");
  var notaContainer = document.getElementById("notaContainer");
  var noNotaEl = document.getElementById("noNota");
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
      total: keranjangData.total
    };

    fetch(MORODUIT_CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json(); })
      .then(function (response) {
        if (response.success && response.noNota && response.tanggal) {
          // Update display with real No Nota & Tanggal
          noNotaEl.textContent = response.noNota;
          tanggalEl.textContent = response.tanggal;

          // Remove from sessionStorage (prevent double-submit)
          sessionStorage.removeItem("moroduit_keranjang");

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
