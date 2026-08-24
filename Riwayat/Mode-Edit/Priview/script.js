/* ══════════════════════════════════════════════════════════════════════
   MoroDuit Priview Mode-Edit — Script
   Baca moroduit_riwayat_edit dari sessionStorage, tampilkan nota draft,
   3 aksi: repush ke Sheet, download PNG, kirim WhatsApp.
   Pola replikasi dari Keranjang-Duit/Priview/script.js (bukan import).
   ══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── DOM refs ───────────────────────────────────────────────────────
  var errorState = document.getElementById("errorState");
  var errorText = document.getElementById("errorText");
  var notaContainer = document.getElementById("notaContainer");
  var displayNoNota = document.getElementById("displayNoNota");
  var namaPelangganEl = document.getElementById("namaPelanggan");
  var tanggalEl = document.getElementById("tanggal");
  var notaItemsEl = document.getElementById("notaItems");
  var totalValueEl = document.getElementById("totalValue");
  var btnSimpanSheet = document.getElementById("btnSimpanSheet");
  var btnDownloadNota = document.getElementById("btnDownloadNota");
  var btnKirimWA = document.getElementById("btnKirimWA");
  var batalBtn = document.getElementById("batalBtn");
  var statusMessage = document.getElementById("statusMessage");

  // ── Constants ──────────────────────────────────────────────────────
  var STORAGE_KEY_EDIT = "moroduit_riwayat_edit";

  // ── Read sessionStorage ───────────────────────────────────────────
  var editData = null;

  try {
    var raw = sessionStorage.getItem(STORAGE_KEY_EDIT);
    if (raw) {
      editData = JSON.parse(raw);
    }
  } catch (err) {
    editData = null;
  }

  // Validate data
  if (
    !editData ||
    !editData.noNota ||
    !editData.items ||
    !Array.isArray(editData.items) ||
    editData.items.length === 0
  ) {
    showError("Tidak ada data edit yang valid. Silakan kembali ke halaman Edit.");
    return;
  }

  // ── Data valid — render nota ──────────────────────────────────────
  showNota();
  renderNota(editData);
  initWhatsAppLink();

  // ── Show error state ──────────────────────────────────────────────
  function showError(msg) {
    errorText.textContent = msg || "Tidak ada data edit.";
    errorState.classList.remove("hidden");
    notaContainer.classList.add("hidden");
  }

  // ── Show nota ─────────────────────────────────────────────────────
  function showNota() {
    errorState.classList.add("hidden");
    notaContainer.classList.remove("hidden");
  }

  // ── Initialize WhatsApp link on page load ─────────────────────────
  // Pesan: "No Nota: MD-XXXXX (DIPERBARUI), Total: Rp ... ..."
  function initWhatsAppLink() {
    var noWA = MORODUIT_CONFIG.NOMOR_WA_TOKO.replace(/[^0-9]/g, "");
    var totalFormatted = formatRupiah(editData.total);
    var ringkasan = "No Nota: " + editData.noNota + " (DIPERBARUI)"
      + ", Total: " + totalFormatted
      + ". Mohon lampirkan foto nota yang baru terunduh.";
    btnKirimWA.href = "https://wa.me/" + noWA
      + "?text=" + encodeURIComponent(ringkasan);
  }

  // ── Render nota ───────────────────────────────────────────────────
  function renderNota(data) {
    // No Nota (sudah ada sejak awal)
    displayNoNota.textContent = data.noNota;

    // Nama pelanggan
    var namaPelanggan = data.namaPelanggan || "";
    namaPelangganEl.textContent = namaPelanggan !== "" ? namaPelanggan : "-";

    // Tanggal draft (client-side, sebelum POST)
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

    // Total
    totalValueEl.textContent = formatRupiah(data.total);
  }

  // ══════════════════════════════════════════════════════════════════
  //  ACTION 1: Simpan ke Sheet (repushRiwayat — BUKAN simpanRiwayat)
  // ══════════════════════════════════════════════════════════════════
  btnSimpanSheet.addEventListener("click", function () {
    btnSimpanSheet.disabled = true;
    btnSimpanSheet.textContent = "⏳ Menyimpan...";

    var payload = {
      action: "repushRiwayat",
      token: MORODUIT_CONFIG.TOKEN,
      noNota: editData.noNota,
      items: editData.items,
      total: editData.total,
      namaPelanggan: editData.namaPelanggan || ""
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
        console.log("[Priview-Edit] Server response:", response);

        var serverConfirmed = response.tanggal || response.success;

        if (serverConfirmed) {
          // Update tanggal dari server (tanggal baru = waktu repush)
          tanggalEl.textContent = response.tanggal || new Date().toLocaleDateString("id-ID", {
            weekday: "long", year: "numeric", month: "long", day: "numeric"
          });

          // Update WhatsApp link dengan info repush
          if (response.noNota) {
            var noWA = MORODUIT_CONFIG.NOMOR_WA_TOKO.replace(/[^0-9]/g, "");
            var totalFormatted = formatRupiah(editData.total);
            var ringkasanFinal = "No Nota: " + response.noNota + " (DIPERBARUI)"
              + ", Total: " + totalFormatted
              + ". Mohon lampirkan foto nota yang baru terunduh.";
            btnKirimWA.href = "https://wa.me/" + noWA
              + "?text=" + encodeURIComponent(ringkasanFinal);
          }

          // Hapus dari sessionStorage (prevent double-submit)
          sessionStorage.removeItem(STORAGE_KEY_EDIT);

          // Info jumlah baris yang dihapus/ditulis
          var info = "✅ Berhasil di-repush ke Sheet!";
          if (response.rowsDeleted !== undefined && response.rowsWritten !== undefined) {
            info += " (" + response.rowsDeleted + " baris lama dihapus, "
                  + response.rowsWritten + " baris baru ditulis)";
          }

          statusMessage.textContent = info;
          statusMessage.className = "status-message success";

          btnSimpanSheet.disabled = false;
          btnSimpanSheet.textContent = "📊 Simpan ke Sheet";
        } else {
          console.warn("[Priview-Edit] Response missing success/tanggal:", response);
          statusMessage.textContent = "⚠️ Server merespons tapi data tidak terverifikasi.";
          statusMessage.className = "status-message error";
          btnSimpanSheet.disabled = false;
          btnSimpanSheet.textContent = "📊 Simpan ke Sheet";
        }
      })
      .catch(function (err) {
        console.error("[Priview-Edit] Repush error:", err.message || err);
        statusMessage.textContent = "❌ Gagal menyimpan: " + (err.message || "Periksa koneksi internet.");
        statusMessage.className = "status-message error";
        btnSimpanSheet.disabled = false;
        btnSimpanSheet.textContent = "📊 Simpan ke Sheet";
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
      var safeNoNota = editData.noNota
        ? String(editData.noNota).replace(/[^A-Za-z0-9_-]/g, "-")
        : "unknown";
      var filename = "nota-edit-" + safeNoNota + "-" + timestamp + ".png";

      var a = document.createElement("a");
      a.href = dataURL;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      statusMessage.textContent = "✅ Gambar nota berhasil diunduh!";
      statusMessage.className = "status-message success";

      btnDownloadNota.disabled = false;
      btnDownloadNota.textContent = "📥 Download Gambar Nota";
    }).catch(function (err) {
      notaEl.style.boxShadow = savedShadow;
      console.error("[Priview-Edit] html2canvas render failed:", err);
      statusMessage.textContent = "❌ Gagal membuat gambar nota.";
      statusMessage.className = "status-message error";
      btnDownloadNota.disabled = false;
      btnDownloadNota.textContent = "📥 Download Gambar Nota";
    });
  });

  // ══════════════════════════════════════════════════════════════════
  //  ACTION 3: Kirim ke WhatsApp (direct <a href>)
  // ══════════════════════════════════════════════════════════════════
  // btnKirimWA is an <a> tag with href set in initWhatsAppLink().

  // ── Batal button click handler ───────────────────────────────────
  // Redirect ke Mode-Edit/index.html (../ = Riwayat/Mode-Edit/)
  batalBtn.addEventListener("click", function () {
    sessionStorage.removeItem(STORAGE_KEY_EDIT);
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
