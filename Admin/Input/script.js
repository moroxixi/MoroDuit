/* ══════════════════════════════════════════════════════════════════════
   MoroDuit Input — Script
   Form管理 + API 调用 (getKatalogFull / updateProduk)
   ══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── State ──────────────────────────────────────────────────────────
  var selectedProdukName = null;
  var produkData = []; // Full unfiltered data from API

  // ── DOM refs ───────────────────────────────────────────────────────
  var form = document.getElementById("produkForm");
  var inputProduk = document.getElementById("produk");
  var inputHargaNormal = document.getElementById("hargaNormal");
  var inputHargaPromo = document.getElementById("hargaPromo");
  var inputKategori = document.getElementById("kategori");
  var inputCatatan = document.getElementById("catatan");
  var checkboxStokHabis = document.getElementById("stokHabis");
  var submitBtn = document.getElementById("submitBtn");
  var newProdukBtn = document.getElementById("newProdukBtn");
  var statusMessage = document.getElementById("statusMessage");
  var produkList = document.getElementById("produkList");
  var loadingIndicator = document.getElementById("loadingIndicator");
  var searchInput = document.getElementById("searchInput");
  var kategoriFilter = document.getElementById("kategoriFilter");

  // DOM refs — Settingan Kategori (sheet Margin)
  var kategoriForm = document.getElementById("kategoriForm");
  var kategoriNamaInput = document.getElementById("kategoriNamaInput");
  var kategoriMarginInput = document.getElementById("kategoriMarginInput");
  var kategoriSimpanBtn = document.getElementById("kategoriSimpanBtn");
  var kategoriBatalBtn = document.getElementById("kategoriBatalBtn");
  var kategoriList = document.getElementById("kategoriList");

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
    selectedProdukName = null;
    submitBtn.textContent = "💾 Simpan Produk";

    // Remove selected class from list items
    var items = produkList.querySelectorAll(".produk-item");
    for (var i = 0; i < items.length; i++) {
      items[i].classList.remove("selected");
    }
  }

  // ── Get filtered data based on search + kategori ──────────────────
  function getFilteredData() {
    var query = searchInput.value.trim().toLowerCase();
    var selectedKategori = kategoriFilter.value;

    return produkData.filter(function (p) {
      // Search filter: substring match on product name
      if (query !== "") {
        var namaProduk = (p.produk || "").toLowerCase();
        if (namaProduk.indexOf(query) === -1) return false;
      }
      // Kategori filter: exact match (empty = show all)
      if (selectedKategori !== "") {
        var kategori = (p.kategori && p.kategori.trim() !== "")
          ? p.kategori.trim() : "Lainnya";
        if (kategori !== selectedKategori) return false;
      }
      return true;
    });
  }

  // ── Populate kategori dropdown from data ──────────────────────────
  function populateKategoriFilter() {
    var kategoriSet = {};
    for (var i = 0; i < produkData.length; i++) {
      var k = (produkData[i].kategori && produkData[i].kategori.trim() !== "")
        ? produkData[i].kategori.trim() : "Lainnya";
      kategoriSet[k] = true;
    }
    var sorted = Object.keys(kategoriSet).sort(function (a, b) {
      if (a === "Lainnya") return 1;
      if (b === "Lainnya") return -1;
      return a.localeCompare(b);
    });
    var html = '<option value="">Semua Kategori</option>';
    for (var j = 0; j < sorted.length; j++) {
      html += '<option value="' + escapeHtml(sorted[j]) + '">'
            + escapeHtml(sorted[j]) + '</option>';
    }
    kategoriFilter.innerHTML = html;
  }

  // ── Populate form kategori select from fetched list ───────────────
  function populateKategoriSelect(kategoriList) {
    var html = '<option value="" disabled selected>Pilih kategori</option>';
    for (var i = 0; i < kategoriList.length; i++) {
      html += '<option value="' + escapeHtml(kategoriList[i]) + '">'
            + escapeHtml(kategoriList[i]) + '</option>';
    }
    inputKategori.innerHTML = html;
  }

  // ── Load daftar kategori dari sheet "Margin" (action=getKategoriList) ──
  // Cache di sessionStorage per halaman (key: moroduit_kategori_list)
  // supaya tidak fetch berkali-kali dalam satu sesi buka halaman yang sama.
  function loadKategoriList() {
    var CACHE_KEY = "moroduit_kategori_list";

    // 1. Coba pakai cache sessionStorage dulu
    try {
      var cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        var parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          populateKategoriSelect(parsed);
          return;
        }
      }
    } catch (err) {
      console.warn("Gagal baca cache kategori dari sessionStorage:", err);
    }

    // 2. Fetch dinamis dari backend
    var url = MORODUIT_CONFIG.APPS_SCRIPT_URL
      + "?action=getKategoriList"
      + "&token=" + encodeURIComponent(MORODUIT_CONFIG.TOKEN);

    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!Array.isArray(data)) {
          throw new Error("Response bukan array");
        }
        // Simpan cache biar tidak fetch ulang di sesi ini
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch (err) {
          console.warn("Gagal simpan cache kategori ke sessionStorage:", err);
        }
        populateKategoriSelect(data);
        if (data.length === 0) {
          showStatus("⚠️ Daftar kategori di sheet Margin kosong.", "error");
        }
      })
      .catch(function (err) {
        console.error("Gagal fetch daftar kategori:", err);
        showStatus("⚠️ Gagal memuat daftar kategori. Coba muat ulang halaman.", "error");
      });
  }

  // ── Apply filters and re-render ──────────────────────────────────
  function applyFilters() {
    var filtered = getFilteredData();
    renderProdukList(filtered);
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
        if (Array.isArray(data)) {
          produkData = data;

          // Sort produk A-Z berdasarkan nama (case-insensitive)
          // Hasil sort berlaku untuk renderProdukList & getFilteredData
          // karena keduanya bergantung pada urutan array produkData.
          produkData.sort(function (a, b) {
            var namaA = (a.produk || "").toLowerCase();
            var namaB = (b.produk || "").toLowerCase();
            return namaA.localeCompare(namaB, "id");
          });

          populateKategoriFilter();
        }
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
      var hargaFormatted = formatRupiah(p.hargaNormal);

      html += '<div class="produk-item" role="listitem" tabindex="0" '
            + 'data-produk="' + escapeHtml(p.produk) + '" '
            + 'data-kategori="' + escapeHtml(p.kategori || "") + '" '
            + 'data-harga-normal="' + p.hargaNormal + '" '
            + 'data-harga-promo="' + (p.hargaPromo || "") + '" '
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
    var status = el.getAttribute("data-status");
    var catatan = el.getAttribute("data-catatan");

    inputProduk.value = capitalizeWords(produk);

    // Pastikan opsi kategori produk ini ada di select — data lama mungkin
    // pakai nama kategori yang sudah tidak ada di daftar sheet Margin.
    if (kategori) {
      var optExists = false;
      var allOpts = inputKategori.options;
      for (var o = 0; o < allOpts.length; o++) {
        if (allOpts[o].value === kategori) { optExists = true; break; }
      }
      if (!optExists) {
        var extraOpt = document.createElement("option");
        extraOpt.value = kategori;
        extraOpt.textContent = kategori;
        inputKategori.appendChild(extraOpt);
      }
    }
    inputKategori.value = kategori;
    inputHargaNormal.value = formatRibuanInput(String(hargaNormal));
    inputHargaPromo.value = hargaPromo ? formatRibuanInput(String(hargaPromo)) : "";
    inputCatatan.value = catatan;
    checkboxStokHabis.checked = (status === "Tidak Ada");

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
    var kategori = inputKategori.value;
    var catatan = inputCatatan.value.trim();
    var status = checkboxStokHabis.checked ? "Tidak Ada" : "Ada";
    var hargaNormalParsed = Number(parseRibuanInput(hargaNormal));
    var hargaPromoParsed = hargaPromo !== "" ? Number(parseRibuanInput(hargaPromo)) : "";

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
      hargaNormal: hargaNormalParsed,
      status: status,
      catatan: catatan
    };

    // Only include hargaPromo if it has a value
    if (hargaPromoParsed !== "") {
      payload.hargaPromo = hargaPromoParsed;
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

  // ── Apply formatRibuanInput + preserve cursor position
  function handleRibuanInput(e) {
    var input = e.target;
    var cursorPos = input.selectionStart;
    var value = input.value;

    // Hitung jumlah digit sebelum cursor
    var digitsBefore = 0;
    for (var i = 0; i < cursorPos; i++) {
      if (value[i] >= "0" && value[i] <= "9") digitsBefore++;
    }

    // Format
    var formatted = formatRibuanInput(value);
    input.value = formatted;

    // Restore cursor: cari posisi di formatted string yang sesuai
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
  }

  // ── Apply capitalizeWords + preserve cursor position
  function handleCapitalizeInput(e) {
    var input = e.target;
    var cursorPos = input.selectionStart;
    input.value = capitalizeWords(input.value);
    // capitalizeWords tidak mengubah panjang string
    input.setSelectionRange(cursorPos, cursorPos);
  }

  // ── Auto-capitalize + auto-format event listeners ───────────────
  inputProduk.addEventListener("input", handleCapitalizeInput);
  inputHargaNormal.addEventListener("input", handleRibuanInput);
  inputHargaPromo.addEventListener("input", handleRibuanInput);

  // ── Filter event listeners ───────────────────────────────────────
  searchInput.addEventListener("input", function () {
    applyFilters();
  });

  kategoriFilter.addEventListener("change", function () {
    applyFilters();
  });

  // ══════════════════════════════════════════════════════════════════
  // Settingan Kategori (sheet Margin) — tambah/edit/hapus kategori & margin
  // ══════════════════════════════════════════════════════════════════

  // ── State ────────────────────────────────────────────────────────
  var kategoriData = [];           // [{kategori, margin}] dari getMarginList
  var editingKategoriNama = null;  // nama lama saat edit, null = mode tambah

  // ── Ambil bagian angka dari teks margin ("4%"/"4,5%" → "4"/"4,5") ──
  function marginAngkaInput(raw) {
    var s = String(raw || "").trim();
    if (s.charAt(s.length - 1) === "%") {
      s = s.substring(0, s.length - 1).trim();
    }
    return s;
  }

  // ── Validasi margin → angka (terima koma desimal), NaN kalau invalid ──
  function marginKeAngka(raw) {
    var s = marginAngkaInput(raw);
    if (s === "") return NaN;
    return Number(s.replace(",", "."));
  }

  // ── Reset form kategori ke mode tambah ───────────────────────────
  function resetKategoriForm() {
    kategoriForm.reset();
    editingKategoriNama = null;
    kategoriSimpanBtn.textContent = "➕ Tambah Kategori";
    kategoriBatalBtn.hidden = true;

    // Hapus highlight row yang sedang diedit
    var rows = kategoriList.querySelectorAll(".kategori-item.selected");
    for (var r = 0; r < rows.length; r++) {
      rows[r].classList.remove("selected");
    }
  }

  // ── Render list kategori (mirror gaya list produk) ───────────────
  function renderKategoriList() {
    if (!kategoriData || kategoriData.length === 0) {
      kategoriList.innerHTML = '<div class="empty-state">Belum ada kategori di sheet Margin. Tambahkan lewat form di atas.</div>';
      return;
    }

    var html = "";
    for (var i = 0; i < kategoriData.length; i++) {
      var k = kategoriData[i];
      var nama = String(k.kategori || "").trim();
      var marginText = String(k.margin || "").trim();
      html += '<div class="kategori-item" role="listitem" data-nama="' + escapeHtml(nama) + '">'
        + '<span class="kategori-name">' + escapeHtml(nama) + '</span>'
        + '<span class="kategori-margin">Margin ' + escapeHtml(marginText || "-") + '</span>'
        + '<span class="kategori-actions">'
        + '<button type="button" class="btn-kategori-edit" data-nama="' + escapeHtml(nama) + '">✏️ Edit</button>'
        + '<button type="button" class="btn-kategori-hapus" data-nama="' + escapeHtml(nama) + '">🗑️ Hapus</button>'
        + '</span>'
        + '</div>';
    }
    kategoriList.innerHTML = html;

    var editBtns = kategoriList.querySelectorAll(".btn-kategori-edit");
    for (var e = 0; e < editBtns.length; e++) {
      editBtns[e].addEventListener("click", handleEditKategori);
    }
    var hapusBtns = kategoriList.querySelectorAll(".btn-kategori-hapus");
    for (var h = 0; h < hapusBtns.length; h++) {
      hapusBtns[h].addEventListener("click", handleHapusKategori);
    }
  }

  // ── Fetch & render daftar kategori + margin (action=getMarginList) ──
  function loadMarginList() {
    var url = MORODUIT_CONFIG.APPS_SCRIPT_URL
      + "?action=getMarginList"
      + "&token=" + encodeURIComponent(MORODUIT_CONFIG.TOKEN);

    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!Array.isArray(data)) {
          throw new Error("Response bukan array");
        }
        kategoriData = data;
        // Sort A-Z case-insensitive, pola sama dengan sort produk
        kategoriData.sort(function (a, b) {
          var namaA = (a.kategori || "").toLowerCase();
          var namaB = (b.kategori || "").toLowerCase();
          return namaA.localeCompare(namaB, "id");
        });
        renderKategoriList();
      })
      .catch(function (err) {
        console.error("Gagal fetch daftar margin kategori:", err);
        kategoriList.innerHTML = '<div class="empty-state">Gagal memuat settingan kategori. Coba muat ulang halaman.</div>';
      });
  }

  // ── Tombol Edit → isi form dengan data kategori itu ──────────────
  function handleEditKategori(e) {
    var btn = e.currentTarget;
    var nama = btn.getAttribute("data-nama");
    var item = null;
    for (var i = 0; i < kategoriData.length; i++) {
      if (String(kategoriData[i].kategori || "").trim() === nama) {
        item = kategoriData[i];
        break;
      }
    }
    if (!item) return;

    editingKategoriNama = nama;
    kategoriNamaInput.value = nama;
    kategoriMarginInput.value = marginAngkaInput(item.margin);
    kategoriSimpanBtn.textContent = "💾 Simpan Kategori";
    kategoriBatalBtn.hidden = false;

    // Highlight row yang sedang diedit
    var rows = kategoriList.querySelectorAll(".kategori-item");
    for (var r = 0; r < rows.length; r++) {
      rows[r].classList.remove("selected");
      if (rows[r].getAttribute("data-nama") === nama) {
        rows[r].classList.add("selected");
      }
    }
    kategoriNamaInput.focus();
    kategoriForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // ── Tombol Hapus → konfirmasi dulu, hasil final dari backend ─────
  function handleHapusKategori(e) {
    var btn = e.currentTarget;
    var nama = btn.getAttribute("data-nama");
    var ok = confirm(
      "Hapus kategori \"" + nama + "\" dari daftar margin?\n\n"
      + "Kalau masih ada produk yang memakai kategori ini, penghapusan dibatalkan otomatis."
    );
    if (!ok) return;

    var payload = {
      action: "deleteKategori",
      token: MORODUIT_CONFIG.TOKEN,
      kategori: nama
    };

    fetch(MORODUIT_CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.success) {
          showStatus("✅ Kategori \"" + nama + "\" berhasil dihapus.", "success");
          resetKategoriForm();
          refreshSetelahUbahKategori();
        } else {
          // BLOCK (masih dipakai produk): tampilkan pesan + jumlah produk
          var pesan = "❌ Gagal: " + (data.error || "Unknown error");
          if (data.produkDipakai) {
            pesan = "❌ Kategori \"" + nama + "\" tidak bisa dihapus: masih dipakai "
                  + data.produkDipakai + " produk di Katalog.";
          }
          showStatus(pesan, "error");
        }
      })
      .catch(function (err) {
        console.error("Gagal hapus kategori:", err);
        showStatus("❌ Gagal menghubungi server. Periksa koneksi.", "error");
      });
  }

  // ── Submit form kategori (tambah / simpan edit) ──────────────────
  kategoriForm.addEventListener("submit", function (e) {
    e.preventDefault();

    var nama = kategoriNamaInput.value.trim();
    var marginInput = kategoriMarginInput.value.trim();
    var marginNum = marginKeAngka(marginInput);

    if (!nama) {
      showStatus("⚠️ Nama kategori wajib diisi!", "error");
      kategoriNamaInput.focus();
      return;
    }
    if (isNaN(marginNum) || marginNum < 0) {
      showStatus("⚠️ Margin harus angka yang valid (mis. 4 untuk 4%).", "error");
      kategoriMarginInput.focus();
      return;
    }

    var isEdit = editingKategoriNama !== null;
    var payload = {
      action: isEdit ? "updateKategori" : "addKategori",
      token: MORODUIT_CONFIG.TOKEN,
      kategori: nama,
      margin: marginInput // backend normalisasi ke teks persen ("4" → "4%")
    };
    if (isEdit) {
      payload.namaLama = editingKategoriNama;
    }

    kategoriSimpanBtn.disabled = true;
    kategoriSimpanBtn.textContent = "⏳ Menyimpan...";

    fetch(MORODUIT_CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        kategoriSimpanBtn.disabled = false;
        if (data.success) {
          if (isEdit) {
            var pesan = "✅ Kategori \"" + nama + "\" berhasil diupdate.";
            if (data.produkUpdated > 0) {
              pesan += " " + data.produkUpdated + " produk ikut di-update namanya.";
            }
            showStatus(pesan, "success");
          } else {
            showStatus("✅ Kategori \"" + nama + "\" berhasil ditambahkan!", "success");
          }
          resetKategoriForm();
          refreshSetelahUbahKategori();
        } else {
          showStatus("❌ Gagal: " + (data.error || "Unknown error"), "error");
          kategoriSimpanBtn.textContent = isEdit ? "💾 Simpan Kategori" : "➕ Tambah Kategori";
        }
      })
      .catch(function (err) {
        kategoriSimpanBtn.disabled = false;
        kategoriSimpanBtn.textContent = isEdit ? "💾 Simpan Kategori" : "➕ Tambah Kategori";
        showStatus("❌ Gagal menghubungi server. Periksa koneksi.", "error");
        console.error("Fetch error:", err);
      });
  });

  // ── Tombol Batal (keluar dari mode edit) ─────────────────────────
  kategoriBatalBtn.addEventListener("click", function () {
    resetKategoriForm();
  });

  // ── Refresh semua data yang bergantung daftar kategori ───────────
  // 1) invalidate cache sessionStorage dropdown produk (moroduit_kategori_list)
  //    supaya fetch ulang, 2) re-populate dropdown form produk,
  // 3) refresh section settingan sendiri, 4) refresh list produk + filter
  //    (produk ikut berubah kalau ada cascade rename dari updateKategori).
  function refreshSetelahUbahKategori() {
    try {
      sessionStorage.removeItem("moroduit_kategori_list");
    } catch (err) {
      console.warn("Gagal invalidate cache kategori:", err);
    }
    loadKategoriList();
    loadMarginList();
    loadProdukList();
  }

  // ── Init ───────────────────────────────────────────────────────────
  loadKategoriList();
  loadMarginList();
  loadProdukList();
})();
