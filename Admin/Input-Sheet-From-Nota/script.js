/* ══════════════════════════════════════════════════════════════════════
   MoroDuit — Input dari Nota Foto
   Upload foto → OCR via Gemini → review items → simpan ke Riwayat
   ══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── State ──────────────────────────────────────────────────────────
  var compressedBase64 = null;
  var compressedMime = "image/jpeg";
  var katalogData = [];     // Full data from getKatalogFull
  var itemList = [];        // {produk, qty, hargaSatuan, subtotal, matched, matchedProduk, selectedProduk}

  // ── DOM refs ───────────────────────────────────────────────────────
  var fileInput = document.getElementById("fileInput");
  var photoPreview = document.getElementById("photoPreview");
  var scanBtn = document.getElementById("scanBtn");
  var scanStatus = document.getElementById("scanStatus");
  var resultArea = document.getElementById("resultArea");
  var namaPelangganInput = document.getElementById("namaPelanggan");
  var itemListEl = document.getElementById("itemList");
  var itemCountEl = document.getElementById("itemCount");
  var grandTotalEl = document.getElementById("grandTotal");
  var addRowBtn = document.getElementById("addRowBtn");
  var saveBtn = document.getElementById("saveBtn");
  var saveStatus = document.getElementById("saveStatus");
  var statusMessage = document.getElementById("statusMessage");
  var successCard = document.getElementById("successCard");
  var successDetail = document.getElementById("successDetail");
  var scanAgainBtn = document.getElementById("scanAgainBtn");

  // ── Helpers ────────────────────────────────────────────────────────
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = "status-message " + type;
    setTimeout(function () {
      statusMessage.className = "status-message hidden";
    }, 5000);
  }

  function formatRupiah(val) {
    var num = Number(val);
    if (isNaN(num)) return "Rp 0";
    return "Rp " + Math.round(num).toLocaleString("id-ID");
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ── Compress image (polari dari Scan-Struk/script.js) ─────────────
  // maxPixels: 1.200.000, quality: 0.82 JPEG
  function compressImage(file, maxPixels) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var reader = new FileReader();
      reader.onload = function () { img.src = reader.result; };
      reader.onerror = reject;
      img.onload = function () {
        var width = img.width;
        var height = img.height;
        var pixels = width * height;
        if (pixels > maxPixels) {
          var scale = Math.sqrt(maxPixels / pixels);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        var dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        resolve({ base64: dataUrl.split(",")[1], mime: "image/jpeg" });
      };
      img.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ── Load katalog (polari dari Input/script.js loadProdukList) ──────
  function loadKatalog() {
    var url = MORODUIT_CONFIG.APPS_SCRIPT_URL
      + "?action=getKatalogFull"
      + "&token=" + encodeURIComponent(MORODUIT_CONFIG.TOKEN);

    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (Array.isArray(data)) {
          katalogData = data;
          // Sort A-Z by name
          katalogData.sort(function (a, b) {
            return (a.produk || "").toLowerCase().localeCompare((b.produk || "").toLowerCase(), "id");
          });
        }
      })
      .catch(function (err) {
        console.error("Gagal memuat katalog:", err);
        showStatus("⚠️ Gagal memuat data produk. Beberapa fitur mungkin terbatas.", "error");
      });
  }

  // ── Build dropdown options HTML ────────────────────────────────────
  function buildDropdownOptions(selectedName) {
    var html = '<option value="">-- pilih produk --</option>';
    for (var i = 0; i < katalogData.length; i++) {
      var p = katalogData[i];
      var sel = (selectedName && p.produk === selectedName) ? " selected" : "";
      html += '<option value="' + escapeHtml(p.produk) + '"' + sel + '>'
            + escapeHtml(p.produk) + '</option>';
    }
    return html;
  }

  // ── Render item list ───────────────────────────────────────────────
  function renderItems() {
    itemListEl.innerHTML = "";
    for (var i = 0; i < itemList.length; i++) {
      var item = itemList[i];
      var row = document.createElement("div");
      row.className = "item-row";
      row.dataset.index = i;

      var dropdownValue = item.selectedProduk || "";
      var isMatched = item.matched && item.matchedProduk;
      var badgeHtml = "";
      if (isMatched) {
        badgeHtml = '<span class="badge badge-ok">✓ Cocok</span>';
      } else {
        badgeHtml = '<span class="badge badge-warn">⚠️ Perlu dicek</span>';
      }

      var subtotal = (Number(item.qty) || 0) * (Number(item.hargaSatuan) || 0);

      row.innerHTML =
        '<div class="item-row-top">' +
          '<select class="item-dropdown" data-index="' + i + '">' +
            buildDropdownOptions(dropdownValue) +
          '</select>' +
          badgeHtml +
          '<button class="btn-hapus-baris" data-index="' + i + '">✕</button>' +
        '</div>' +
        '<div class="item-row-fields">' +
          '<div class="f" style="flex:0 1 80px;">' +
            '<label>Qty</label>' +
            '<div class="qty-wrapper">' +
              '<button type="button" class="qty-btn qty-minus" data-index="' + i + '"' + ((item.qty || 1) <= 1 ? ' disabled' : '') + ' aria-label="Kurangi jumlah">−</button>' +
              '<input type="number" class="qty-value item-qty" data-index="' + i + '" min="1" max="999" value="' + (item.qty || 1) + '" readonly>' +
              '<button type="button" class="qty-btn qty-plus" data-index="' + i + '" aria-label="Tambah jumlah">+</button>' +
            '</div>' +
          '</div>' +
          '<div class="f" style="flex:1 1 120px;">' +
            '<label>Harga Satuan</label>' +
            '<input type="number" step="any" min="0" class="item-harga" data-index="' + i + '" value="' + (item.hargaSatuan || "") + '">' +
          '</div>' +
        '</div>' +
        '<div class="item-subtotal" data-index="' + i + '">' + formatRupiah(subtotal) + '</div>';

      itemListEl.appendChild(row);
    }

    // Attach event listeners
    var dropdowns = itemListEl.querySelectorAll(".item-dropdown");
    for (var d = 0; d < dropdowns.length; d++) {
      dropdowns[d].addEventListener("change", handleDropdownChange);
    }

    var hargaInputs = itemListEl.querySelectorAll(".item-harga");
    for (var h = 0; h < hargaInputs.length; h++) {
      hargaInputs[h].addEventListener("input", handleFieldChange);
    }

    var qtyMinusBtns = itemListEl.querySelectorAll(".qty-minus");
    for (var m = 0; m < qtyMinusBtns.length; m++) {
      qtyMinusBtns[m].addEventListener("click", handleQtyMinus);
    }

    var qtyPlusBtns = itemListEl.querySelectorAll(".qty-plus");
    for (var p = 0; p < qtyPlusBtns.length; p++) {
      qtyPlusBtns[p].addEventListener("click", handleQtyPlus);
    }

    var hapusBtns = itemListEl.querySelectorAll(".btn-hapus-baris");
    for (var b = 0; b < hapusBtns.length; b++) {
      hapusBtns[b].addEventListener("click", handleRemoveRow);
    }

    updateTotals();
    validateSubmit();
  }

  // ── Event: dropdown changed ────────────────────────────────────────
  function handleDropdownChange(e) {
    var idx = Number(e.target.dataset.index);
    itemList[idx].selectedProduk = e.target.value;

    // Update badge
    var row = e.target.closest(".item-row");
    var oldBadge = row.querySelector(".badge");
    if (oldBadge) {
      if (e.target.value) {
        oldBadge.className = "badge badge-ok";
        oldBadge.textContent = "✓ Cocok";
      } else {
        oldBadge.className = "badge badge-warn";
        oldBadge.textContent = "⚠️ Perlu dicek";
      }
    }

    // Auto-isi Harga Satuan dari Katalog (selalu overwrite)
    var hargaInput = row.querySelector(".item-harga");
    if (e.target.value && katalogData.length > 0) {
      for (var k = 0; k < katalogData.length; k++) {
        if (katalogData[k].produk === e.target.value) {
          var hargaJual = Number(katalogData[k].hargaJual) || 0;
          itemList[idx].hargaSatuan = hargaJual;
          if (hargaInput) hargaInput.value = hargaJual;
          break;
        }
      }
    }

    // Hitung ulang subtotal row
    var subtotalEl = row.querySelector(".item-subtotal");
    var qty = Number(itemList[idx].qty) || 0;
    var harga = Number(itemList[idx].hargaSatuan) || 0;
    if (subtotalEl) subtotalEl.textContent = formatRupiah(qty * harga);

    updateTotals();
    validateSubmit();
  }

  // ── Event: harga input changed ─────────────────────────────────────
  function handleFieldChange(e) {
    var idx = Number(e.target.dataset.index);
    itemList[idx].hargaSatuan = Number(e.target.value) || 0;

    // Update subtotal display
    var row = e.target.closest(".item-row");
    var subtotalEl = row.querySelector(".item-subtotal");
    var subtotal = (Number(itemList[idx].qty) || 0) * (Number(itemList[idx].hargaSatuan) || 0);
    subtotalEl.textContent = formatRupiah(subtotal);

    updateTotals();
  }

  // ── Event: qty stepper minus ───────────────────────────────────────
  function handleQtyMinus(e) {
    var idx = Number(e.target.dataset.index);
    var q = parseInt(itemList[idx].qty, 10);
    if (isNaN(q) || q <= 1) return;
    q -= 1;
    itemList[idx].qty = q;

    var row = e.target.closest(".item-row");
    var qtyInput = row.querySelector(".item-qty");
    if (qtyInput) qtyInput.value = q;

    // Disable minus if qty === 1
    if (q <= 1) e.target.disabled = true;
    // Re-enable plus if it was disabled (qty < 999)
    var plusBtn = row.querySelector(".qty-plus");
    if (plusBtn) plusBtn.disabled = false;

    var subtotalEl = row.querySelector(".item-subtotal");
    var subtotal = q * (Number(itemList[idx].hargaSatuan) || 0);
    if (subtotalEl) subtotalEl.textContent = formatRupiah(subtotal);

    updateTotals();
  }

  // ── Event: qty stepper plus ────────────────────────────────────────
  function handleQtyPlus(e) {
    var idx = Number(e.target.dataset.index);
    var q = parseInt(itemList[idx].qty, 10);
    if (isNaN(q)) q = 1;
    if (q >= 999) return;
    q += 1;
    itemList[idx].qty = q;

    var row = e.target.closest(".item-row");
    var qtyInput = row.querySelector(".item-qty");
    if (qtyInput) qtyInput.value = q;

    // Re-enable minus
    var minusBtn = row.querySelector(".qty-minus");
    if (minusBtn) minusBtn.disabled = false;
    // Disable plus if qty === 999
    if (q >= 999) e.target.disabled = true;

    var subtotalEl = row.querySelector(".item-subtotal");
    var subtotal = q * (Number(itemList[idx].hargaSatuan) || 0);
    if (subtotalEl) subtotalEl.textContent = formatRupiah(subtotal);

    updateTotals();
  }

  // ── Event: remove row ──────────────────────────────────────────────
  function handleRemoveRow(e) {
    var idx = Number(e.target.dataset.index);
    itemList.splice(idx, 1);
    renderItems();
  }

  // ── Update totals ──────────────────────────────────────────────────
  function updateTotals() {
    var total = 0;
    var count = itemList.length;
    for (var i = 0; i < itemList.length; i++) {
      total += (Number(itemList[i].qty) || 0) * (Number(itemList[i].hargaSatuan) || 0);
    }
    itemCountEl.textContent = count;
    grandTotalEl.textContent = formatRupiah(total);
  }

  // ── Validate submit button ─────────────────────────────────────────
  // Disabled selama ada baris yang dropdown-nya belum dipilih
  function validateSubmit() {
    var allSelected = true;
    for (var i = 0; i < itemList.length; i++) {
      if (!itemList[i].selectedProduk) {
        allSelected = false;
        break;
      }
    }
    saveBtn.disabled = !allSelected || itemList.length === 0;
  }

  // ── Photo select + compress ────────────────────────────────────────
  fileInput.addEventListener("change", function (e) {
    var file = e.target.files[0];
    if (!file) return;
    scanStatus.textContent = "";
    photoPreview.innerHTML = '<div style="color:#666;font-size:0.9rem;">Memproses foto...</div>';

    compressImage(file, 1200000)
      .then(function (result) {
        compressedBase64 = result.base64;
        compressedMime = result.mime;
        photoPreview.innerHTML = '<img src="data:' + result.mime + ';base64,' + result.base64 + '" alt="preview nota">';
        scanBtn.disabled = false;
        scanStatus.textContent = "";
      })
      .catch(function (err) {
        compressedBase64 = null;
        photoPreview.innerHTML = "";
        scanStatus.textContent = "Gagal proses foto. Coba format JPEG/PNG.";
        scanStatus.style.color = "#c62828";
        scanBtn.disabled = true;
      });
  });

  // ── Scan Nota ──────────────────────────────────────────────────────
  scanBtn.addEventListener("click", function () {
    if (!compressedBase64) return;

    scanBtn.disabled = true;
    scanBtn.textContent = "⏳ Memindai nota...";
    scanStatus.textContent = "Mengirim foto ke OCR... mohon tunggu.";
    scanStatus.style.color = "#666";
    resultArea.style.display = "none";

    fetch(MORODUIT_CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "scanNota",
        token: MORODUIT_CONFIG.TOKEN,
        imageBase64: compressedBase64,
        mimeType: compressedMime
      })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        scanBtn.disabled = false;
        scanBtn.textContent = "Scan Nota";

        if (!data.success) {
          scanStatus.textContent = "Gagal: " + (data.error || "Unknown error");
          scanStatus.style.color = "#c62828";
          return;
        }

        // Prefill nama pelanggan
        namaPelangganInput.value = data.namaPelanggan || "";

        // Build item list from OCR result
        itemList = [];
        var rawItems = data.items || [];
        for (var i = 0; i < rawItems.length; i++) {
          var it = rawItems[i];
          itemList.push({
            produk: it.produk || "",
            qty: it.qty || 0,
            hargaSatuan: it.hargaSatuan || 0,
            subtotal: it.subtotal || 0,
            matched: it.matched || false,
            matchedProduk: it.matchedProduk || null,
            selectedProduk: it.matched && it.matchedProduk ? it.matchedProduk : ""
          });
        }

        renderItems();
        resultArea.style.display = "block";
        scanStatus.textContent = rawItems.length + " barang terbaca. Review di bawah sebelum simpan.";
        scanStatus.style.color = "#2e7d32";
      })
      .catch(function (err) {
        scanBtn.disabled = false;
        scanBtn.textContent = "Scan Nota";
        scanStatus.textContent = "Gagal menghubungi server: " + err.message;
        scanStatus.style.color = "#c62828";
        console.error("Scan error:", err);
      });
  });

  // ── Add manual row ─────────────────────────────────────────────────
  addRowBtn.addEventListener("click", function () {
    itemList.push({
      produk: "",
      qty: 1,
      hargaSatuan: 0,
      subtotal: 0,
      matched: false,
      matchedProduk: null,
      selectedProduk: ""
    });
    renderItems();
    // Focus the new dropdown
    var lastDropdown = itemListEl.querySelector(".item-row:last-child .item-dropdown");
    if (lastDropdown) lastDropdown.focus();
  });

  // ── Save to Riwayat ────────────────────────────────────────────────
  saveBtn.addEventListener("click", function () {
    if (saveBtn.disabled) return;

    // Final validation: all dropdowns must be selected
    for (var i = 0; i < itemList.length; i++) {
      if (!itemList[i].selectedProduk) {
        showStatus("⚠️ Semua baris harus punya produk dipilih dari dropdown!", "error");
        return;
      }
    }

    // Build items for backend — use selectedProduk (from dropdown), NOT raw OCR name
    var backendItems = [];
    var total = 0;
    for (var j = 0; j < itemList.length; j++) {
      var it = itemList[j];
      var qty = Number(it.qty) || 0;
      var harga = Number(it.hargaSatuan) || 0;
      var subtotal = qty * harga;
      total += subtotal;
      backendItems.push({
        produk: it.selectedProduk,
        qty: qty,
        hargaSatuan: harga,
        subtotal: subtotal
      });
    }

    var payload = {
      action: "simpanRiwayat",
      token: MORODUIT_CONFIG.TOKEN,
      items: backendItems,
      total: total,
      namaPelanggan: namaPelangganInput.value.trim(),
      sumber: "Nota"
    };

    saveBtn.disabled = true;
    saveBtn.textContent = "⏳ Menyimpan...";
    saveStatus.textContent = "";
    saveStatus.style.color = "";

    fetch(MORODUIT_CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Simpan ke Riwayat";

        if (data.success) {
          // Show success
          resultArea.style.display = "none";
          successDetail.textContent = "No Nota: " + data.noNota + " — Tanggal: " + data.tanggal;
          successCard.style.display = "block";
        } else {
          saveStatus.textContent = "Gagal: " + (data.error || "Unknown error");
          saveStatus.style.color = "#c62828";
        }
      })
      .catch(function (err) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Simpan ke Riwayat";
        saveStatus.textContent = "Gagal menghubungi server: " + err.message;
        saveStatus.style.color = "#c62828";
        console.error("Save error:", err);
      });
  });

  // ── Scan again (reset for next photo) ──────────────────────────────
  scanAgainBtn.addEventListener("click", function () {
    successCard.style.display = "none";
    resultArea.style.display = "none";
    fileInput.value = "";
    photoPreview.innerHTML = "";
    compressedBase64 = null;
    scanBtn.disabled = true;
    scanBtn.textContent = "Scan Nota";
    scanStatus.textContent = "";
    namaPelangganInput.value = "";
    itemList = [];
    itemListEl.innerHTML = "";
    itemCountEl.textContent = "0";
    grandTotalEl.textContent = "Rp 0";
    saveStatus.textContent = "";
    window.scrollTo(0, 0);
  });

  // ── Init ───────────────────────────────────────────────────────────
  loadKatalog();
})();
