/* ══════════════════════════════════════════════════════════════════════
   MoroDuit Rekap-Belanja Priview — Script
   Baca moroduit_rekap_belanja dari sessionStorage, tampilkan rekap,
   download PNG via html2canvas.
   ══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── DOM refs ───────────────────────────────────────────────────────
  var errorState = document.getElementById("errorState");
  var errorText = document.getElementById("errorText");
  var rekapContainer = document.getElementById("rekapContainer");
  var tanggalEl = document.getElementById("tanggal");
  var jumlahNotaEl = document.getElementById("jumlahNota");
  var rekapItemsEl = document.getElementById("rekapItems");
  var grandTotalEl = document.getElementById("grandTotal");
  var btnDownload = document.getElementById("btnDownload");
  var btnKembali = document.getElementById("btnKembali");
  var statusMessage = document.getElementById("statusMessage");

  // ── Constants ──────────────────────────────────────────────────────
  var STORAGE_KEY_REKAP = "moroduit_rekap_belanja";

  // ── Read sessionStorage ───────────────────────────────────────────
  var rekapData = null;

  try {
    var raw = sessionStorage.getItem(STORAGE_KEY_REKAP);
    if (raw) {
      rekapData = JSON.parse(raw);
    }
  } catch (err) {
    rekapData = null;
  }

  // Validate data
  if (
    !rekapData ||
    !rekapData.items ||
    !Array.isArray(rekapData.items) ||
    rekapData.items.length === 0
  ) {
    showError("Tidak ada data rekap belanja. Silakan pilih nota terlebih dahulu.");
    return;
  }

  // ── Data valid — render rekap ─────────────────────────────────────
  showRekap();
  renderRekap(rekapData);

  // ── Show error state ──────────────────────────────────────────────
  function showError(msg) {
    errorText.textContent = msg || "Tidak ada data rekap.";
    errorState.classList.remove("hidden");
    rekapContainer.classList.add("hidden");
  }

  // ── Show rekap ─────────────────────────────────────────────────────
  function showRekap() {
    errorState.classList.add("hidden");
    rekapContainer.classList.remove("hidden");
  }

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

  // ── Count unique notas from all items ──────────────────────────────
  function countUniqueNotas(items) {
    var seen = {};
    var count = 0;
    for (var i = 0; i < items.length; i++) {
      var asal = items[i].asalNota || [];
      for (var j = 0; j < asal.length; j++) {
        if (!seen[asal[j]]) {
          seen[asal[j]] = true;
          count++;
        }
      }
    }
    return count;
  }

  // ── Render rekap ──────────────────────────────────────────────────
  function renderRekap(data) {
    // Set tanggal
    var now = new Date();
    var tanggalStr = now.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    tanggalEl.textContent = tanggalStr;

    // Set jumlah nota
    jumlahNotaEl.textContent = countUniqueNotas(data.items) + " nota";

    // Render items
    var html = "";
    for (var i = 0; i < data.items.length; i++) {
      var item = data.items[i];
      var hargaDisplay = item.hargaNormal !== null
        ? formatRupiah(item.hargaNormal)
        : '<span class="badge-na">Tidak diketahui</span>';
      var subtotalDisplay = item.subtotal !== null
        ? formatRupiah(item.subtotal)
        : '<span class="badge-na">—</span>';
      var asalDisplay = (item.asalNota || []).join(", ");

      html += '<tr>'
            + '<td class="col-no">' + (i + 1) + '</td>'
            + '<td class="col-produk">' + escapeHtml(item.namaProduk) + '</td>'
            + '<td class="col-qty">' + item.totalQty + '</td>'
            + '<td class="col-asal">' + escapeHtml(asalDisplay) + '</td>'
            + '<td class="col-harga">' + hargaDisplay + '</td>'
            + '<td class="col-subtotal">' + subtotalDisplay + '</td>'
            + '</tr>';
    }
    rekapItemsEl.innerHTML = html;

    // Set grand total
    grandTotalEl.textContent = formatRupiah(data.grandTotal);
  }

  // ══════════════════════════════════════════════════════════════════
  //  ACTION: Download Gambar Rekap (html2canvas)
  // ══════════════════════════════════════════════════════════════════
  btnDownload.addEventListener("click", function () {
    btnDownload.disabled = true;
    btnDownload.textContent = "⏳ Membuat gambar...";

    var rekapEl = document.getElementById("rekap");
    var savedShadow = rekapEl.style.boxShadow;
    rekapEl.style.boxShadow = "none";

    html2canvas(rekapEl, {
      width: rekapEl.scrollWidth,
      height: rekapEl.scrollHeight,
      windowWidth: rekapEl.scrollWidth,
      onclone: function (clonedDoc) {
        // Remove main max-width so the clone can expand to full table width
        var mainEl = clonedDoc.querySelector("main");
        if (mainEl) {
          mainEl.style.maxWidth = "none";
        }
        // Expand rekap-container and #rekap (green border) to full content width
        var clonedContainer = clonedDoc.getElementById("rekapContainer");
        if (clonedContainer) {
          clonedContainer.style.width = rekapEl.scrollWidth + "px";
        }
        var clonedRekap = clonedDoc.getElementById("rekap");
        if (clonedRekap) {
          clonedRekap.style.overflow = "visible";
          clonedRekap.style.width = rekapEl.scrollWidth + "px";
        }
      }
    }).then(function (canvas) {
      rekapEl.style.boxShadow = savedShadow;

      var dataURL = canvas.toDataURL("image/png");
      var timestamp = Date.now();
      var filename = "rekap-belanja-" + timestamp + ".png";

      var a = document.createElement("a");
      a.href = dataURL;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      statusMessage.textContent = "✅ Gambar rekap berhasil diunduh!";
      statusMessage.className = "status-message success";

      btnDownload.disabled = false;
      btnDownload.textContent = "📥 Download Gambar Rekap";
    }).catch(function (err) {
      rekapEl.style.boxShadow = savedShadow;
      console.error("[Rekap-Belanja-Priview] html2canvas render failed:", err);
      statusMessage.textContent = "❌ Gagal membuat gambar rekap.";
      statusMessage.className = "status-message error";
      btnDownload.disabled = false;
      btnDownload.textContent = "📥 Download Gambar Rekap";
    });
  });

  // ── Kembali button ────────────────────────────────────────────────
  btnKembali.addEventListener("click", function () {
    window.location.href = "../index.html";
  });

  // ── BFCache handling ──────────────────────────────────────────────
  window.addEventListener("pageshow", function (event) {
    if (event.persisted) {
      // Re-read sessionStorage in case data changed
      try {
        var raw = sessionStorage.getItem(STORAGE_KEY_REKAP);
        if (raw) {
          rekapData = JSON.parse(raw);
          if (rekapData && rekapData.items && rekapData.items.length > 0) {
            showRekap();
            renderRekap(rekapData);
          }
        }
      } catch (err) {
        // ignore
      }
    }
  });
})();
