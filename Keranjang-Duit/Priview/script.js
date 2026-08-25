/* ══════════════════════════════════════════════════════════════════════
   MoroDuit Priview — Script
   Baca sessionStorage, tampilkan nota draft, 3 aksi independen:
   1. Simpan ke Sheet (fetch POST)
   2. Download Gambar Nota (html2canvas)
   3. Kirim ke WhatsApp (direct link)
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
  var btnSimpanSheet = document.getElementById("btnSimpanSheet");
  var btnDownloadNota = document.getElementById("btnDownloadNota");
  var btnKirimWA = document.getElementById("btnKirimWA");
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
  initWhatsAppLink();

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

  // ── Initialize WhatsApp link on page load ─────────────────────────
  function initWhatsAppLink() {
    var noWA = MORODUIT_CONFIG.NOMOR_WA_TOKO.replace(/[^0-9]/g, "");
    var totalFormatted = formatRupiah(keranjangData.total);
    var ringkasan = "Total: " + totalFormatted
      + ". Mohon lampirkan foto nota yang baru terunduh.";
    btnKirimWA.href = "https://wa.me/" + noWA
      + "?text=" + encodeURIComponent(ringkasan);
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

  // ══════════════════════════════════════════════════════════════════
  //  ACTION 1: Simpan ke Sheet (fetch POST)
  // ══════════════════════════════════════════════════════════════════
  btnSimpanSheet.addEventListener("click", function () {
    // Disable button (prevent double-click)
    btnSimpanSheet.disabled = true;
    btnSimpanSheet.textContent = "⏳ Menyimpan...";

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
      .then(function (res) {
        if (!res.ok) {
          throw new Error("HTTP " + res.status + " " + res.statusText);
        }
        return res.json();
      })
      .then(function (response) {
        console.log("[Priview] Server response:", response);

        var serverConfirmed = response.tanggal || response.success;

        if (serverConfirmed) {
          // Update display with real Tanggal
          tanggalEl.textContent = response.tanggal || new Date().toLocaleDateString("id-ID", {
            weekday: "long", year: "numeric", month: "long", day: "numeric"
          });

          // Remove from sessionStorage (prevent double-submit)
          sessionStorage.removeItem("moroduit_keranjang");
          sessionStorage.removeItem("moroduit_selection");
          sessionStorage.removeItem("moroduit_nama_pelanggan");

          // Show success
          statusMessage.textContent = "\u2705 Berhasil disimpan ke Sheet!";
          statusMessage.className = "status-message success";

          btnSimpanSheet.disabled = false;
          btnSimpanSheet.textContent = "\uD83D\uDCCA Simpan ke Sheet";
        } else {
          console.warn("[Priview] Response missing success/tanggal:", response);
          statusMessage.textContent = "\u26A0\uFE0F Server merespons tapi data tidak terverifikasi.";
          statusMessage.className = "status-message error";
          btnSimpanSheet.disabled = false;
          btnSimpanSheet.textContent = "\uD83D\uDCCA Simpan ke Sheet";
        }
      })
      .catch(function (err) {
        console.error("[Priview] Simpan sheet error:", err.message || err);
        statusMessage.textContent = "\u274C Gagal menyimpan: " + (err.message || "Periksa koneksi internet.");
        statusMessage.className = "status-message error";
        btnSimpanSheet.disabled = false;
        btnSimpanSheet.textContent = "\uD83D\uDCCA Simpan ke Sheet";
      });
  });

  // ══════════════════════════════════════════════════════════════════
  //  ACTION 2: Download Gambar Nota (html2canvas)
  // ══════════════════════════════════════════════════════════════════
  btnDownloadNota.addEventListener("click", function () {
    btnDownloadNota.disabled = true;
    btnDownloadNota.textContent = "⏳ Membuat gambar...";

    var notaEl = document.getElementById("nota");
    var savedShadow = notaEl.style.boxShadow;
    notaEl.style.boxShadow = "none";

    html2canvas(notaEl).then(function (canvas) {
      notaEl.style.boxShadow = savedShadow;

      var dataURL = canvas.toDataURL("image/png");
      var timestamp = Date.now();

      // Build WA message with Indonesian date (no weekday)
      var tanggalWA = new Date().toLocaleDateString("id-ID", {
        day: "numeric", month: "long", year: "numeric"
      });
      var pesanWA = "Nota tanggal " + tanggalWA + ", Total: "
        + formatRupiah(keranjangData.total)
        + ". Mohon lampirkan foto nota yang tadi diunduh.";
      var noWA = MORODUIT_CONFIG.NOMOR_WA_TOKO.replace(/[^0-9]/g, "");
      btnKirimWA.href = "https://wa.me/" + noWA
        + "?text=" + encodeURIComponent(pesanWA);
      btnKirimWA.dataset.ready = "true";

      var filename = "nota-" + timestamp + ".png";

      var a = document.createElement("a");
      a.href = dataURL;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      statusMessage.textContent = "\u2705 Gambar nota berhasil diunduh!";
      statusMessage.className = "status-message success";

      btnDownloadNota.disabled = false;
      btnDownloadNota.textContent = "\uD83D\uDCE5 Download Gambar Nota";
    }).catch(function (err) {
      notaEl.style.boxShadow = savedShadow;
      console.error("[Priview] html2canvas render failed:", err);
      statusMessage.textContent = "\u274C Gagal membuat gambar nota.";
      statusMessage.className = "status-message error";
      btnDownloadNota.disabled = false;
      btnDownloadNota.textContent = "\uD83D\uDCE5 Download Gambar Nota";
    });
  });

  // ══════════════════════════════════════════════════════════════════
  //  ACTION 3: Kirim ke WhatsApp (gated by dataset.ready)
  // ══════════════════════════════════════════════════════════════════
  btnKirimWA.addEventListener("click", function (e) {
    if (btnKirimWA.dataset.ready !== "true") {
      e.preventDefault();
      alert("Download nota dulu, ya!");
    }
  });

  // ── Batal button click handler ───────────────────────────────────
  batalBtn.addEventListener("click", function () {
    sessionStorage.removeItem("moroduit_keranjang");
    window.location.href = "../index.html";
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
})();
