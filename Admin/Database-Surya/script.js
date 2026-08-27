/* ══════════════════════════════════════════════════════════════════════
   MoroDuit — Database Surya (Katalog Harga Referensi)
   Upload foto nota Surya Toserba → OCR via Gemini → review items → simpan ke Katalog-Surya
   ══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── State ──────────────────────────────────────────────────────────
  var compressedBase64 = null;
  var compressedMime = "image/jpeg";
  var katalogSuryaData = [];     // Full data from getKatalogSurya
  var itemList = [];             // {namaProduk, hargaSatuan, status, selectedProduk}

  // ── DOM refs ───────────────────────────────────────────────────────
  var fileInput = document.getElementById("fileInput");
  var photoPreview = document.getElementById("photoPreview");
  var scanBtn = document.getElementById("scanBtn");
  var scanStatus = document.getElementById("scanStatus");
  var resultArea = document.getElementById("resultArea");
  var itemListEl = document.getElementById("itemList");
  var itemCountEl = document.getElementById("itemCount");
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

  // ── Auto-capitalize: setiap awal kata jadi huruf besar (Title Case)
  function capitalizeWords(str) {
    return str.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  // ── Format angka dengan titik ribuan (1000 → "1.000")
  function formatRibuanInput(str) {
    var raw = String(str).replace(/[^0-9]/g, "");
    if (!raw) return "";
    return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  // ── Strip semua karakter non-digit ("1.000" → "1000")
  function parseRibuanInput(str) {
    return String(str).replace(/[^0-9]/g, "");
  }

  // ── Post-render: ubah harga inputs dari type=number ke text + format
  function postRenderFormatHarga() {
    var hargaInputs = itemListEl.querySelectorAll(".item-harga");
    for (var i = 0; i < hargaInputs.length; i++) {
      var input = hargaInputs[i];
      input.type = "text";
      input.inputMode = "numeric";
      var raw = input.value;
      if (raw !== "" && raw != null) {
        input.value = formatRibuanInput(String(raw));
      }
    }
  }

  // ── Compress image ─────────────────────────────────────────────────
  // maxPixels: 1.200.000, quality: 0.82 JPEG (polari dari Scan-Struk/script.js)
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

  // ── Load Katalog Surya ─────────────────────────────────────────────
  function loadKatalogSurya() {
    var url = MORODUIT_CONFIG.APPS_SCRIPT_URL
      + "?action=getKatalogSurya"
      + "&token=" + encodeURIComponent(MORODUIT_CONFIG.TOKEN);

    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (Array.isArray(data)) {
          katalogSuryaData = data;
          // Sort A-Z by name for dropdown display
          katalogSuryaData.sort(function (a, b) {
            return (a.namaProduk || "").toLowerCase().localeCompare((b.namaProduk || "").toLowerCase(), "id");
          });
        }
      })
      .catch(function (err) {
        console.error("Gagal memuat Katalog Surya:", err);
        showStatus("⚠️ Gagal memuat data Katalog Surya.", "error");
      });
  }

  // ── Build dropdown options HTML (deduplicated by namaProduk) ──────
  function buildDropdownOptions(selectedName) {
    var html = '<option value="">-- pilih produk --</option>';
    var seen = {};
    for (var i = 0; i < katalogSuryaData.length; i++) {
      var p = katalogSuryaData[i];
      var key = (p.namaProduk || "").toLowerCase();
      if (key && !seen[key]) {
        seen[key] = true;
        var sel = (selectedName && key === selectedName.toLowerCase()) ? " selected" : "";
        html += '<option value="' + escapeHtml(p.namaProduk) + '"' + sel + '>'
              + escapeHtml(p.namaProduk) + '</option>';
      }
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

      var isMatched = item.selectedProduk && item.selectedProduk.length > 0;
      var badgeHtml = isMatched
        ? '<span class="badge badge-ok">✓ Cocok</span>'
        : '<span class="badge badge-warn">⚠️ Perlu dicek</span>';

      row.innerHTML =
        '<div class="item-row-top">' +
          '<input type="text" class="item-name" data-index="' + i + '" value="' + escapeHtml(item.namaProduk || "") + '" placeholder="Nama produk">' +
          badgeHtml +
          '<button class="btn-hapus-baris" data-index="' + i + '">✕</button>' +
        '</div>' +
        '<div class="item-row-fields">' +
          '<div class="f" style="flex:1 1 200px;">' +
            '<label>Cocok dengan Katalog Surya</label>' +
            '<select class="item-dropdown" data-index="' + i + '">' +
              buildDropdownOptions(item.selectedProduk || item.namaProduk) +
            '</select>' +
          '</div>' +
          '<div class="f" style="flex:0 1 120px;">' +
            '<label>Harga Satuan</label>' +
            '<input type="number" step="any" min="0" class="item-harga" data-index="' + i + '" value="' + (item.hargaSatuan || "") + '">' +
          '</div>' +
          '<div class="f" style="flex:0 1 100px;">' +
            '<label>Status</label>' +
            '<select class="item-status" data-index="' + i + '">' +
              '<option value="Normal"' + (item.status === "Normal" ? " selected" : "") + '>Normal</option>' +
              '<option value="Promo"' + (item.status === "Promo" ? " selected" : "") + '>Promo</option>' +
            '</select>' +
          '</div>' +
        '</div>';

      itemListEl.appendChild(row);
    }

    // Attach event listeners
    var dropdowns = itemListEl.querySelectorAll(".item-dropdown");
    for (var d = 0; d < dropdowns.length; d++) {
      dropdowns[d].addEventListener("change", handleDropdownChange);
    }

    var nameInputs = itemListEl.querySelectorAll(".item-name");
    for (var n = 0; n < nameInputs.length; n++) {
      nameInputs[n].addEventListener("input", handleNameChange);
    }

    var hargaInputs = itemListEl.querySelectorAll(".item-harga");
    for (var h = 0; h < hargaInputs.length; h++) {
      hargaInputs[h].addEventListener("input", handleFieldChange);
    }

    var statusSelects = itemListEl.querySelectorAll(".item-status");
    for (var s = 0; s < statusSelects.length; s++) {
      statusSelects[s].addEventListener("change", handleStatusChange);
    }

    var hapusBtns = itemListEl.querySelectorAll(".btn-hapus-baris");
    for (var b = 0; b < hapusBtns.length; b++) {
      hapusBtns[b].addEventListener("click", handleRemoveRow);
    }

    updateTotals();
    validateSubmit();
  }

  // ── Event: dropdown "cocok" changed ────────────────────────────────
  function handleDropdownChange(e) {
    var idx = Number(e.target.dataset.index);
    var selectedName = e.target.value;
    itemList[idx].selectedProduk = selectedName;

    // Update text input to match
    var row = e.target.closest(".item-row");
    var nameInput = row.querySelector(".item-name");
    if (selectedName) {
      itemList[idx].namaProduk = selectedName;
      if (nameInput) nameInput.value = selectedName;
    }

    // Update badge
    var oldBadge = row.querySelector(".badge");
    if (oldBadge) {
      if (selectedName) {
        oldBadge.className = "badge badge-ok";
        oldBadge.textContent = "✓ Cocok";
      } else {
        oldBadge.className = "badge badge-warn";
        oldBadge.textContent = "⚠️ Perlu dicek";
      }
    }

    // Auto-isi Harga Satuan dari Katalog Surya (latest entry by tanggalScan)
    if (selectedName && katalogSuryaData.length > 0) {
      var latestHarga = 0;
      var latestDate = "";
      for (var k = 0; k < katalogSuryaData.length; k++) {
        if (katalogSuryaData[k].namaProduk === selectedName) {
          var dateStr = katalogSuryaData[k].tanggalScan || "";
          if (dateStr >= latestDate) {
            latestDate = dateStr;
            latestHarga = Number(katalogSuryaData[k].hargaSatuan) || 0;
          }
        }
      }
      itemList[idx].hargaSatuan = latestHarga;
      var hargaInput = row.querySelector(".item-harga");
      if (hargaInput) hargaInput.value = formatRibuanInput(String(latestHarga));
    }

    validateSubmit();
  }

  // ── Event: nama produk text input changed ───────────────────────────
  function handleNameChange(e) {
    var input = e.target;
    var cursorPos = input.selectionStart;

    // Auto-capitalize
    var capitalized = capitalizeWords(input.value);
    input.value = capitalized;
    input.setSelectionRange(cursorPos, cursorPos);

    var idx = Number(input.dataset.index);
    itemList[idx].namaProduk = capitalized;
    itemList[idx].selectedProduk = ""; // reset dropdown match

    // Update badge
    var row = input.closest(".item-row");
    var oldBadge = row.querySelector(".badge");
    if (oldBadge) {
      oldBadge.className = "badge badge-warn";
      oldBadge.textContent = "⚠️ Perlu dicek";
    }

    // Reset dropdown selection
    var dropdown = row.querySelector(".item-dropdown");
    if (dropdown) dropdown.value = "";

    validateSubmit();
  }

  // ── Event: harga input changed ─────────────────────────────────────
  function handleFieldChange(e) {
    var input = e.target;
    var cursorPos = input.selectionStart;
    var value = input.value;

    // Hitung jumlah digit sebelum cursor
    var digitsBefore = 0;
    for (var i = 0; i < cursorPos; i++) {
      if (value[i] >= "0" && value[i] <= "9") digitsBefore++;
    }

    // Format tampilan
    var formatted = formatRibuanInput(value);
    input.value = formatted;

    // Restore cursor
    var newPos = 0;
    var digitCount = 0;
    for (var j = 0; j < formatted.length; j++) {
      if (formatted[j] !== ".") digitCount++;
      if (digitCount >= digitsBefore) {
        newPos = j + 1;
        break;
      }
    }
    if (digitCount < digitsBefore) newPos = formatted.length;
    input.setSelectionRange(newPos, newPos);

    // Update state (strip titik dulu)
    var idx = Number(input.dataset.index);
    itemList[idx].hargaSatuan = Number(parseRibuanInput(value)) || 0;
  }

  // ── Event: status select changed ───────────────────────────────────
  function handleStatusChange(e) {
    var idx = Number(e.target.dataset.index);
    itemList[idx].status = e.target.value;
  }

  // ── Event: remove row ──────────────────────────────────────────────
  function handleRemoveRow(e) {
    var idx = Number(e.target.dataset.index);
    itemList.splice(idx, 1);
    renderItems();
    postRenderFormatHarga();
  }

  // ── Update totals ──────────────────────────────────────────────────
  function updateTotals() {
    itemCountEl.textContent = itemList.length;
  }

  // ── Validate submit button ─────────────────────────────────────────
  // Disabled selama ada baris yang nama produk kosong
  function validateSubmit() {
    var allHaveName = true;
    for (var i = 0; i < itemList.length; i++) {
      if (!itemList[i].namaProduk || !itemList[i].namaProduk.trim()) {
        allHaveName = false;
        break;
      }
    }
    saveBtn.disabled = !allHaveName || itemList.length === 0;
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
        photoPreview.innerHTML = '<img src="data:' + result.mime + ';base64,' + result.base64 + '" alt="preview nota Surya">';
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

  // ── Scan Nota Surya ────────────────────────────────────────────────
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
        action: "scanNotaSurya",
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

        // Build item list from OCR result
        itemList = [];
        var rawItems = data.items || [];
        for (var i = 0; i < rawItems.length; i++) {
          var it = rawItems[i];
          itemList.push({
            namaProduk: it.namaProduk || "",
            hargaSatuan: it.hargaSatuan || 0,
            status: it.status || "Normal",
            selectedProduk: "" // belum dipilih dari dropdown
          });
        }

        renderItems();
        postRenderFormatHarga();
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
      namaProduk: "",
      hargaSatuan: 0,
      status: "Normal",
      selectedProduk: ""
    });
    renderItems();
    postRenderFormatHarga();
    // Focus the new name input
    var lastInput = itemListEl.querySelector(".item-row:last-child .item-name");
    if (lastInput) lastInput.focus();
  });

  // ── Save to Katalog-Surya ──────────────────────────────────────────
  saveBtn.addEventListener("click", function () {
    if (saveBtn.disabled) return;

    // Final validation: all items must have a name
    for (var i = 0; i < itemList.length; i++) {
      if (!itemList[i].namaProduk || !itemList[i].namaProduk.trim()) {
        showStatus("⚠️ Semua baris harus punya nama produk!", "error");
        return;
      }
    }

    // Build items for backend
    var backendItems = [];
    var now = new Date();
    var tanggal = now.getFullYear() + "-" +
      String(now.getMonth() + 1).padStart(2, "0") + "-" +
      String(now.getDate()).padStart(2, "0") + " " +
      String(now.getHours()).padStart(2, "0") + ":" +
      String(now.getMinutes()).padStart(2, "0") + ":" +
      String(now.getSeconds()).padStart(2, "0");

    for (var j = 0; j < itemList.length; j++) {
      var it = itemList[j];
      backendItems.push({
        namaProduk: it.namaProduk.trim(),
        hargaSatuan: Number(it.hargaSatuan) || 0,
        status: it.status || "Normal",
        tanggalScan: tanggal
      });
    }

    var payload = {
      action: "simpanKatalogSurya",
      token: MORODUIT_CONFIG.TOKEN,
      items: backendItems
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
        saveBtn.textContent = "Simpan ke Katalog-Surya";

        if (data.success) {
          resultArea.style.display = "none";
          var detail = data.saved + " item disimpan";
          if (data.skipped > 0) {
            detail += ", " + data.skipped + " item dilewati (harga & status sama)";
          }
          successDetail.textContent = detail;
          successCard.style.display = "block";
        } else {
          saveStatus.textContent = "Gagal: " + (data.error || "Unknown error");
          saveStatus.style.color = "#c62828";
        }
      })
      .catch(function (err) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Simpan ke Katalog-Surya";
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
    itemList = [];
    itemListEl.innerHTML = "";
    itemCountEl.textContent = "0";
    saveStatus.textContent = "";
    window.scrollTo(0, 0);
  });

  // ── Init ───────────────────────────────────────────────────────────
  loadKatalogSurya();
})();
