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
  var btnKirimWA = document.getElementById("btnKirimWA");
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
    printBtn.textContent = "⏳ Menyimpan & Mengirim...";

    var notaEl = document.getElementById("nota");
    var savedShadow = notaEl.style.boxShadow;
    notaEl.style.boxShadow = "none";

    // Step 1: Capture PNG SYNCHRONOUSLY in user-gesture context
    // (avoids popup-blocker for downstream download + wa.me redirect)
    html2canvas(notaEl).then(function (canvas) {
      notaEl.style.boxShadow = savedShadow;

      // Generate data URL while still in user-gesture context
      var dataURL = canvas.toDataURL("image/png");

      // ── Step 1: Auto-download PNG IMMEDIATELY (1-level nesting) ──
      // This must happen in the SAME .then() as toDataURL, BEFORE fetch(),
      // so iOS Safari/Chrome retains the "trusted user gesture" for
      // programmatic download. (Same pattern as Tempura/Wonton proven on iPhone.)
      var timestamp = Date.now();
      var filename = "nota-" + timestamp + ".png";

      var a = document.createElement("a");
      a.href = dataURL;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // ── Show WhatsApp button IMMEDIATELY (direct user action) ──
      // This happens right after download, BEFORE fetch completes,
      // so user can proceed to WhatsApp without waiting for server.
      var noWA = MORODUIT_CONFIG.NOMOR_WA_TOKO.replace(/[^0-9]/g, "");
      var totalFormatted = formatRupiah(keranjangData.total);
      var ringkasanPending = "Total: " + totalFormatted
        + ". Mohon lampirkan foto nota yang baru terunduh.";
      btnKirimWA.href = "https://wa.me/" + noWA
        + "?text=" + encodeURIComponent(ringkasanPending);

      // Hide printBtn, show WhatsApp button
      printBtn.classList.add("hidden");
      btnKirimWA.classList.remove("hidden");

      // Show success status
      statusMessage.textContent = "\u2705 Nota berhasil diunduh! Klik tombol di bawah untuk kirim ke WhatsApp.";
      statusMessage.className = "status-message success";

      // Remove from sessionStorage (prevent double-submit)
      sessionStorage.removeItem("moroduit_keranjang");

      // ── Background fetch: POST simpanRiwayat (non-blocking) ──
      // If fetch fails, just log warning — don't block user from WhatsApp.
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

          // Update WA link with real noNota if server returned it
          var serverConfirmed = response.tanggal || response.success;
          if (serverConfirmed && response.noNota) {
            var safeNoNota = String(response.noNota).replace(/[^A-Za-z0-9_-]/g, "-");
            var ringkasanFinal = "No Nota: " + response.noNota
              + ", Total: " + totalFormatted
              + ". Mohon lampirkan foto nota yang baru terunduh.";
            btnKirimWA.href = "https://wa.me/" + noWA
              + "?text=" + encodeURIComponent(ringkasanFinal);

            // Re-download with server-assigned noNota filename
            var ts = Date.now();
            var finalFilename = "nota-" + safeNoNota + "-" + ts + ".png";
            var a2 = document.createElement("a");
            a2.href = dataURL;
            a2.download = finalFilename;
            document.body.appendChild(a2);
            a2.click();
            document.body.removeChild(a2);

            // Update display with real Tanggal
            tanggalEl.textContent = response.tanggal || new Date().toLocaleDateString("id-ID", {
              weekday: "long", year: "numeric", month: "long", day: "numeric"
            });
          }
        })
        .catch(function (err) {
          // Fetch failed but user can still proceed to WhatsApp.
          // Just log warning — don't show error or block UX.
          console.warn("[Priview] Background fetch failed (data may not be saved to server):", err.message || err);
        });

    }).catch(function (err) {
      notaEl.style.boxShadow = savedShadow;
      console.error("html2canvas render failed:", err);
      handlePrintError("Gagal membuat screenshot nota.");
    });
  });

  function handlePrintError(message) {
    resetPrintBtn();

    statusMessage.textContent = "❌ " + message;
    statusMessage.className = "status-message error";

    // DO NOT remove sessionStorage — user can retry
  }

  function resetPrintBtn() {
    printBtn.disabled = false;
    printBtn.textContent = "🛒 Kirim Pesanan";
    printBtn.classList.remove("hidden");
    btnKirimWA.classList.add("hidden");
    btnKirimWA.href = "#";
  }

  // ── Screenshot & auto-download nota ──────────────────────────────
  function captureAndDownloadNota(noNota) {
    var notaEl = document.getElementById("nota");
    if (!notaEl || typeof html2canvas === "undefined") {
      console.warn("html2canvas not loaded or nota element not found, skipping screenshot");
      return Promise.resolve();
    }

    // Sanitize noNota for filename
    var safeNoNota = noNota ? String(noNota).replace(/[^A-Za-z0-9_-]/g, "-") : null;
    var timestamp = Date.now();
    var filename = safeNoNota
      ? "Nota-" + safeNoNota + "-" + timestamp + ".png"
      : "Nota-" + timestamp + ".png";

    // Bug #1 fix: temporarily remove box-shadow to prevent html2canvas
    // rendering artifacts (belang/faded gradient)
    var savedShadow = notaEl.style.boxShadow;
    notaEl.style.boxShadow = "none";

    return html2canvas(notaEl)
      .then(function (canvas) {
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
      })
      .catch(function (err) {
        console.error("html2canvas render failed:", err);
      })
      .finally(function () {
        // Restore box-shadow after capture
        notaEl.style.boxShadow = savedShadow;
      });
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
    return "Rp " + Math.ceil(num).toLocaleString("id-ID");
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }
})();
