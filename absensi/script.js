const TOTAL_PERTEMUAN = 12;
const SUPABASE_URL = "https://mjfwgmhuengvfdagbcsk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZndnbWh1ZW5ndmZkYWdiY3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMDczMTMsImV4cCI6MjA5Njg4MzMxM30.NxZY9zHP9zQmHRsgpcGZyk3t7_xaGFFuTa3bYIAD384";
const TABLE_NAME = "absensinsc";
const STORAGE_BUCKET = "laporan-pdf";
const EDGE_FUNCTION_KIRIM_WA = "dynamic-endpoint";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let dataRekap = [];
let selectNamaControl = null;
let selectCatatanControl = null;

const namaHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const CACHE_KEY = "nsc_absensi_cache";
const CATATAN_HISTORY_PREFIX = "NSC_CATATAN_HISTORY_V1:";
let realtimeChannel = null;
let realtimeReloadTimer = null;

function $(id) {
    return document.getElementById(id);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', '&quot;')
        .replaceAll("'", "&#39;");
}

function normalizeNama(value) {
    return String(value ?? "").trim().toUpperCase();
}

function normalizePhone(value) {
    let digits = String(value ?? "").replace(/\D/g, "");
    if (digits.startsWith("0")) {
        digits = "62" + digits.slice(1);
    }
    return digits;
}

function formatTanggalIndonesia(timestamp) {
    if (!timestamp) return "Belum Ada Tanggal";
    const dateObj = new Date(timestamp);
    if (Number.isNaN(dateObj.getTime())) return String(timestamp);

    const hari = namaHari[dateObj.getDay()];
    const tanggal = dateObj.getDate();
    const bulan = namaBulan[dateObj.getMonth()];
    const tahun = dateObj.getFullYear();

    return `${hari}, ${tanggal} ${bulan} ${tahun}`;
}

function formatTanggalTtdIndonesia(timestamp = new Date()) {
    const dateObj = new Date(timestamp);
    if (Number.isNaN(dateObj.getTime())) return "";

    const tanggal = dateObj.getDate();
    const bulan = namaBulan[dateObj.getMonth()];
    const tahun = dateObj.getFullYear();

    return `${tanggal} ${bulan} ${tahun}`;
}

function formatWaktuIndonesia(timestamp) {
    if (!timestamp) return "-";
    const dateObj = new Date(timestamp);
    if (Number.isNaN(dateObj.getTime())) return "-";

    const jam = String(dateObj.getHours()).padStart(2, "0");
    const menit = String(dateObj.getMinutes()).padStart(2, "0");
    return `${jam}.${menit} WIB`;
}

function normalizeRiwayatCatatan(list, fallbackTanggal = new Date().toISOString()) {
    if (!Array.isArray(list)) return [];

    return list
        .map((entry) => {
            if (typeof entry === "string") {
                const teks = entry.trim();
                if (!teks) return null;
                return {
                    tanggal: fallbackTanggal,
                    waktu: formatWaktuIndonesia(fallbackTanggal),
                    status: "",
                    catatan: teks
                };
            }

            const tanggal = entry?.tanggal || entry?.date || entry?.created_at || fallbackTanggal;
            const catatan = String(entry?.catatan ?? entry?.note ?? entry?.keterangan ?? "").trim();
            if (!catatan) return null;

            return {
                tanggal,
                waktu: entry?.waktu || formatWaktuIndonesia(tanggal),
                status: String(entry?.status ?? "").trim(),
                catatan
            };
        })
        .filter(Boolean)
        .slice(-TOTAL_PERTEMUAN);
}

function parseCatatanHistory(rawCatatan, fallbackTanggal = new Date().toISOString()) {
    const teks = String(rawCatatan ?? "").trim();
    if (!teks) return [];

    if (teks.startsWith(CATATAN_HISTORY_PREFIX)) {
        try {
            const parsed = JSON.parse(teks.slice(CATATAN_HISTORY_PREFIX.length));
            return normalizeRiwayatCatatan(parsed, fallbackTanggal);
        } catch (error) {
            console.warn("Riwayat catatan gagal dibaca:", error);
        }
    }

    try {
        const parsed = JSON.parse(teks);
        if (Array.isArray(parsed)) {
            return normalizeRiwayatCatatan(parsed, fallbackTanggal);
        }
        if (parsed && Array.isArray(parsed.riwayat)) {
            return normalizeRiwayatCatatan(parsed.riwayat, fallbackTanggal);
        }
    } catch (_) {
        // Catatan lama masih berbentuk teks biasa.
    }

    return normalizeRiwayatCatatan([{ tanggal: fallbackTanggal, catatan: teks }], fallbackTanggal);
}

function serializeCatatanHistory(history) {
    const cleanHistory = normalizeRiwayatCatatan(history);
    if (cleanHistory.length === 0) return "";
    return CATATAN_HISTORY_PREFIX + JSON.stringify(cleanHistory);
}

function tambahRiwayatCatatan(history, catatan, tanggal, status = "") {
    const cleanHistory = normalizeRiwayatCatatan(history, tanggal);
    const teks = String(catatan ?? "").trim();
    if (!teks) return cleanHistory;

    cleanHistory.push({
        tanggal,
        waktu: formatWaktuIndonesia(tanggal),
        status,
        catatan: teks
    });

    return cleanHistory.slice(-TOTAL_PERTEMUAN);
}

function getCatatanTerakhir(history, fallback = "") {
    const cleanHistory = normalizeRiwayatCatatan(history);
    if (cleanHistory.length === 0) return String(fallback ?? "").trim();
    return cleanHistory[cleanHistory.length - 1].catatan || "";
}

function getTanggalTerakhirRiwayat(history, fallbackTanggal) {
    const cleanHistory = normalizeRiwayatCatatan(history, fallbackTanggal);
    if (cleanHistory.length === 0) return fallbackTanggal;
    return cleanHistory[cleanHistory.length - 1].tanggal || fallbackTanggal;
}

// Menghapus entri riwayat terakhir yang statusnya sesuai (Hadir/Tidak Hadir) secara permanen.
// Dipakai saat counter dikurangi (-), supaya data benar-benar hilang, bukan menyisakan riwayat "koreksi".
function hapusRiwayatTerakhirByStatus(history, statusTarget) {
    const cleanHistory = normalizeRiwayatCatatan(history);

    for (let i = cleanHistory.length - 1; i >= 0; i--) {
        if (cleanHistory[i].status === statusTarget) {
            cleanHistory.splice(i, 1);
            return cleanHistory;
        }
    }

    // Fallback: kalau tidak ada entri dengan status yang cocok, hapus entri paling akhir
    // supaya jumlah riwayat tetap sinkron dengan angka counter (tetap benar-benar terhapus, tanpa jejak).
    if (cleanHistory.length > 0) {
        cleanHistory.splice(cleanHistory.length - 1, 1);
    }

    return cleanHistory;
}

function toInt(value) {
    const hasil = parseInt(value, 10);
    return Number.isFinite(hasil) ? hasil : 0;
}

function saveCache() {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(dataRekap));
    } catch (error) {
        console.warn("Cache gagal disimpan:", error);
    }
}

function loadCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn("Cache gagal dibaca:", error);
        return [];
    }
}

function showLogin() {
    const loginSection = $("loginSection");
    const mainAppSection = $("mainAppSection");
    if (loginSection) loginSection.classList.remove("hidden");
    if (mainAppSection) mainAppSection.classList.add("hidden");
}

function showApp() {
    const loginSection = $("loginSection");
    const mainAppSection = $("mainAppSection");
    if (loginSection) loginSection.classList.add("hidden");
    if (mainAppSection) mainAppSection.classList.remove("hidden");
}

function togglePasswordVisibility() {
    const passwordInput = $("loginPassword");
    const eyeIcon = $("eyeIcon");
    if (!passwordInput || !eyeIcon) return;

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        eyeIcon.classList.replace("fa-eye", "fa-eye-slash");
    } else {
        passwordInput.type = "password";
        eyeIcon.classList.replace("fa-eye-slash", "fa-eye");
    }
}

function updateJamRealtime() {
    const sekarang = new Date();
    const jam = String(sekarang.getHours()).padStart(2, "0");
    const menit = String(sekarang.getMinutes()).padStart(2, "0");
    const detik = String(sekarang.getSeconds()).padStart(2, "0");

    const jamEl = $("jamRealtime");
    const tanggalEl = $("tanggalRealtime");
    if (jamEl) jamEl.innerText = `${jam}.${menit}.${detik}`;
    if (tanggalEl) tanggalEl.innerText = formatTanggalIndonesia(sekarang);
}

function setButtonLoading(buttonEl, loading, loadingHtml, normalHtml) {
    if (!buttonEl) return;
    buttonEl.disabled = loading;
    buttonEl.innerHTML = loading ? loadingHtml : normalHtml;
}

function getActiveSession() {
    return supabaseClient.auth.getSession().then(({ data: { session } }) => session);
}

async function requireSessionOrAlert() {
    const session = await getActiveSession();
    if (!session) {
        alert("Silakan login terlebih dahulu.");
        showLogin();
        return null;
    }
    return session;
}

function normalizeDbRow(row) {
    const nama = normalizeNama(row?.nama ?? row?.absensi ?? row?.name);
    const hadir = toInt(row?.hadir ?? row?.Hadir ?? row?.hadir_total);
    const tidakHadir = toInt(row?.tidak_hadir ?? row?.["Tidak Hadir"] ?? row?.tidakHadir);
    const rawDate = row?.tanggal ?? row?.["Tanggal Terbaru"] ?? row?.created_at ?? row?.updated_at ?? new Date().toISOString();
    const riwayatDariCache = normalizeRiwayatCatatan(row?.riwayatCatatan, rawDate);
    const riwayatCatatan = riwayatDariCache.length > 0
        ? riwayatDariCache
        : parseCatatanHistory(row?.catatan ?? row?.Catatan ?? "", rawDate);
    const tanggalTerakhir = getTanggalTerakhirRiwayat(riwayatCatatan, rawDate);
    const catatan = getCatatanTerakhir(riwayatCatatan, row?.catatan ?? row?.Catatan ?? "");
    const noHp = String(row?.no_hp ?? row?.noHp ?? "").trim();
    const pdfPath = String(row?.pdf_path ?? row?.pdfPath ?? "").trim();

    return {
        id: row?.id ?? null,
        nama,
        absensi: normalizeNama(row?.absensi ?? nama),
        hadir,
        tidakHadir,
        catatan,
        riwayatCatatan,
        no_hp: noHp,
        pdf_path: pdfPath,
        tanggal: tanggalTerakhir,
        tanggalRealtime: formatTanggalIndonesia(tanggalTerakhir),
        rawDate: tanggalTerakhir
    };
}

function getDbPayloadFromItem(item, overrides = {}) {
    const tanggalPayload = overrides.tanggal ?? item.rawDate ?? new Date().toISOString();
    const riwayatPayload = overrides.riwayatCatatan ?? item.riwayatCatatan ?? [];

    return {
        absensi: overrides.absensi ?? item.nama,
        nama: overrides.nama ?? item.nama,
        hadir: String(overrides.hadir ?? item.hadir ?? 0),
        tidak_hadir: String(overrides.tidak_hadir ?? item.tidakHadir ?? 0),
        catatan: serializeCatatanHistory(riwayatPayload),
        tanggal: tanggalPayload,
        no_hp: overrides.no_hp ?? item.no_hp ?? "",
        pdf_path: overrides.pdf_path ?? item.pdf_path ?? ""
    };
}

function buildWhatsAppText(item) {
    const statusTarget = item.hadir >= TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir}/${TOTAL_PERTEMUAN}`;
    return `Halo Bapak/Ibu, berikut laporan absensi Ananda *${item.nama}* di *Nona Swimming Course*.

Total Hadir: *${item.hadir}* Pertemuan
Tidak Hadir: *${item.tidakHadir}* Pertemuan
Status Target: *${statusTarget}*
Catatan: _${item.catatan || "-"}_

Terima kasih.`;
}

function buildWhatsAppLink(item) {
    const nomorWA = normalizePhone(item.no_hp);
    if (!nomorWA) return "#";
    return `https://api.whatsapp.com/send?phone=${nomorWA}&text=${encodeURIComponent(buildWhatsAppText(item))}`;
}

function slugifyFileName(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s_-]/g, "")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");
}

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function getLogoDataUrl() {
    try {
        const response = await fetch("Logo percobaan.png");
        if (!response.ok) return null;
        const blob = await response.blob();
        return await blobToDataUrl(blob);
    } catch (error) {
        console.warn("Logo PDF tidak dapat dimuat:", error);
        return null;
    }
}

async function addPdfHeader(doc, title, subtitle) {
    const logoDataUrl = await getLogoDataUrl().catch(() => null);
    if (logoDataUrl) {
        try {
            // Logo dan header dipadatkan agar laporan 12 catatan tetap muat 1 halaman.
            doc.addImage(logoDataUrl, "PNG", 14, 7, 14, 19);
        } catch (error) {
            console.warn("Gagal menambahkan logo ke PDF:", error);
        }
    }

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(35, 74, 132);
    doc.text(title, logoDataUrl ? 33 : 14, 16);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text(subtitle, logoDataUrl ? 33 : 14, 22);

    doc.setDrawColor(241, 245, 249);
    doc.line(14, 29, 196, 29);
}

function addPdfSignature(doc, options = {}) {
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginRight = 196;
    const finalY = doc.lastAutoTable?.finalY || 34;
    const gap = Number(options.gap ?? 7);
    const maxY = pageHeight - 31;
    let y = finalY + gap;

    // Untuk laporan individu 12 pertemuan, tanda tangan jangan langsung pindah halaman.
    // Jika tabel hampir menyentuh bawah halaman, posisi tanda tangan dikunci dekat bawah.
    if (options.keepOnPage && y > maxY) {
        y = maxY;
    } else if (!options.keepOnPage && y > pageHeight - 42) {
        doc.addPage();
        y = 32;
    }

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 47, 87);
    doc.text(`Brebes, ${formatTanggalTtdIndonesia(new Date())}`, marginRight, y, { align: "right" });
    doc.text("Pelatih NSC,", marginRight, y + 6, { align: "right" });

    doc.setFont("Helvetica", "bold");
    doc.text("Wahyu Riski Maulana", marginRight, y + 24, { align: "right" });
}

async function buildSiswaPdfBlob(item) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    await addPdfHeader(doc, "LAPORAN ABSENSI INDIVIDU SISWA", "Nona Swimming Course (NSC)");

    const rows = [
        ["Nama Siswa", item.nama],
        ["No. HP Orang Tua", item.no_hp || "-"],
        ["Total Kehadiran (Hadir)", `${item.hadir} Pertemuan`],
        ["Total Tidak Hadir", `${item.tidakHadir} Pertemuan`],
        ["Status Pertemuan", item.hadir >= TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir}/${TOTAL_PERTEMUAN}`],
        ["Tanggal Terakhir Diinput", item.tanggalRealtime || formatTanggalIndonesia(item.rawDate)],
        ["Catatan Khusus", item.catatan || "-"]
    ];

    doc.autoTable({
        startY: 33,
        head: [["Komponen Data", "Detail Keterangan"]],
        body: rows,
        theme: "striped",
        headStyles: { fillColor: [35, 74, 132], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5, cellPadding: 2 },
        styles: { textColor: [71, 85, 105], fontSize: 8.2, cellPadding: 1.8, valign: "middle", lineWidth: 0.1 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 0: { cellWidth: 52 }, 1: { cellWidth: "auto" } },
        margin: { left: 14, right: 14 }
    });

    const riwayatRows = normalizeRiwayatCatatan(item.riwayatCatatan, item.rawDate).map((entry, idx) => [
        idx + 1,
        formatTanggalIndonesia(entry.tanggal),
        entry.waktu || formatWaktuIndonesia(entry.tanggal),
        entry.status || "-",
        entry.catatan || "-"
    ]);

    let startRiwayatY = (doc.lastAutoTable?.finalY || 33) + 6;
    const pageHeight = doc.internal.pageSize.getHeight();
    if (startRiwayatY > pageHeight - 55) {
        doc.addPage();
        startRiwayatY = 24;
    }

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(35, 74, 132);
    doc.text("Riwayat Catatan Pertemuan", 14, startRiwayatY - 2);

    doc.autoTable({
        startY: startRiwayatY,
        head: [["Ke-", "Tanggal", "Waktu", "Status", "Catatan"]],
        body: riwayatRows.length ? riwayatRows : [["-", "-", "-", "-", "Belum ada riwayat catatan"]],
        theme: "grid",
        headStyles: { fillColor: [15, 47, 87], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.4, cellPadding: 1.4 },
        styles: { textColor: [51, 65, 85], fontSize: 7.1, cellPadding: 1.3, valign: "top", lineWidth: 0.1, overflow: "linebreak" },
        bodyStyles: { minCellHeight: 4.8 },
        columnStyles: {
            0: { cellWidth: 9, halign: "center" },
            1: { cellWidth: 34 },
            2: { cellWidth: 18 },
            3: { cellWidth: 22 },
            4: { cellWidth: "auto" }
        },
        margin: { left: 14, right: 14 },
        rowPageBreak: "avoid"
    });

    addPdfSignature(doc, { keepOnPage: true, gap: 6 });

    return doc.output("blob");
}

async function buildTotalPdfBlob() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    await addPdfHeader(doc, "LAPORAN REKAP TOTAL KEHADIRAN", `Nona Swimming Course - Total Target: ${TOTAL_PERTEMUAN} Pertemuan`);

    const rows = dataRekap.map((item) => [
        item.nama,
        item.hadir,
        item.tidakHadir,
        item.hadir >= TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir}/${TOTAL_PERTEMUAN}`,
        item.tanggalRealtime || formatTanggalIndonesia(item.rawDate),
        item.catatan || "-"
    ]);

    doc.autoTable({
        startY: 33,
        head: [["Nama Siswa", "Hadir", "Absen", "Rasio", "Tanggal Terbaru", "Catatan Terakhir"]],
        body: rows,
        theme: "striped",
        headStyles: { fillColor: [35, 74, 132], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 10 },
        styles: { textColor: [71, 85, 105], fontSize: 9, cellPadding: 4, valign: "middle" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 0: { fontStyle: "bold" }, 3: { halign: "center" } }
    });

    addPdfSignature(doc);

    return doc.output("blob");
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 250);
}

function prosesUnduhFile(blob, namaFile) {
    try {
        downloadBlob(blob, namaFile);
    } catch (error) {
        console.error(error);
        alert("Gagal mengunduh file.");
    }
}

function renderTable(emptyMessage = "Belum ada data rekap.") {
    const tbody = $("tbody");
    if (!tbody) return;

    if (!Array.isArray(dataRekap) || dataRekap.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty">${escapeHtml(emptyMessage)}</td></tr>`;
        const totalTextEl = $("totalPertemuanText");
        if (totalTextEl) totalTextEl.innerText = `Total ${TOTAL_PERTEMUAN} Pertemuan Les Renang`;
        return;
    }

    let html = "";
    dataRekap.forEach((item, index) => {
        const totalBadge = item.hadir >= TOTAL_PERTEMUAN
            ? `<span class="total-lengkap">LENGKAP</span>`
            : `<span class="total-fraction">${item.hadir}/${TOTAL_PERTEMUAN}</span>`;

        const nomorWA = normalizePhone(item.no_hp);
        const waLink = nomorWA ? buildWhatsAppLink(item) : "#";
        const waTitle = nomorWA ? "Kirim Laporan Teks via WhatsApp" : "Nomor HP belum valid";
        const waAria = nomorWA ? "" : 'aria-disabled="true" onclick="return false;"';

        const namaEsc = escapeHtml(item.nama);
        const tanggalDisplay = escapeHtml(item.tanggalRealtime || formatTanggalIndonesia(item.rawDate));

        html += `
            <tr>
                <td>${namaEsc}</td>
                <td>
                    <div class="counter-box">
                        <button class="counter-btn" onclick="updateCounter(${index}, 'hadir', -1)" aria-label="Kurangi hadir">-</button>
                        <span class="counter-val hadir-val">${item.hadir}</span>
                        <button class="counter-btn" onclick="updateCounter(${index}, 'hadir', 1)" aria-label="Tambah hadir">+</button>
                    </div>
                </td>
                <td>
                    <div class="counter-box">
                        <button class="counter-btn" onclick="updateCounter(${index}, 'tidakHadir', -1)" aria-label="Kurangi tidak hadir">-</button>
                        <span class="counter-val tidak-val">${item.tidakHadir}</span>
                        <button class="counter-btn" onclick="updateCounter(${index}, 'tidakHadir', 1)" aria-label="Tambah tidak hadir">+</button>
                    </div>
                </td>
                <td>${totalBadge}</td>
                <td>${tanggalDisplay}</td>
                <td>
                    <div class="actions-cell">
                        <a href="${escapeHtml(waLink)}" target="_blank" rel="noopener noreferrer" class="btn-action btn-wa" title="${waTitle}" ${waAria}>
                            <i class="fab fa-whatsapp"></i>
                        </a>
                        <button class="btn-action btn-pdf" title="Download PDF Harian Siswa" onclick="exportSiswaPDF(${index})">
                            <i class="fa fa-file-pdf"></i>
                        </button>
                        <button class="btn-action btn-wa-pdf" title="Kirim Dokumen PDF ke WA Orang Tua" id="btnWaPdf-${index}" onclick="uploadDanKirimPdfWA(${index})">
                            <i class="fa fa-share-nodes"></i> Kirim PDF ke WA
                        </button>
                        <button class="btn-action btn-excel" title="Download Excel Harian Siswa" onclick="exportSiswaExcel(${index})">
                            <i class="fa fa-file-excel"></i>
                        </button>
                        <button class="btn-action btn-delete" title="Hapus Data Siswa" id="btnDelete-${index}" onclick="deleteRow(${index})">
                            <i class="fa fa-trash"></i>
                        </button>
                        <button class="btn-action btn-kick" title="Keluarkan Siswa" onclick="keluarkanSiswa('${escapeHtml(item.nama).replaceAll("'", "&#39;")}')">
                            <i class="fa fa-user-minus"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    });

    tbody.innerHTML = html;
    const totalTextEl = $("totalPertemuanText");
    if (totalTextEl) totalTextEl.innerText = `Total ${TOTAL_PERTEMUAN} Pertemuan Les Renang`;
}

function showTab(tab, btn) {
    const inputTab = $("input");
    const rekapTab = $("rekap");
    if (inputTab) inputTab.classList.add("hidden");
    if (rekapTab) rekapTab.classList.add("hidden");

    const target = $(tab);
    if (target) target.classList.remove("hidden");

    document.querySelectorAll(".tab-btn").forEach((el) => el.classList.remove("active"));
    if (btn) btn.classList.add("active");
}

async function checkLoginSession() {
    const session = await getActiveSession();

    if (session) {
        showApp();
        await muatDataDariCloud();
        aktifkanRealtimeAbsensi();
    } else {
        showLogin();
    }
}

async function handleLogin(event) {
    if (event) event.preventDefault();

    const emailEl = $("loginEmail");
    const passwordEl = $("loginPassword");
    const btnLogin = event?.target?.querySelector(".login-btn") || document.querySelector(".login-btn");

    if (!emailEl || !passwordEl) return;

    const email = emailEl.value.trim().toLowerCase();
    const password = passwordEl.value;

    if (!email || !password) {
        alert("Lengkapi email dan password terlebih dahulu.");
        return;
    }

    setButtonLoading(btnLogin, true, '<i class="fa fa-spinner fa-spin"></i> Memverifikasi...', '<i class="fa fa-right-to-bracket"></i> Masuk Aplikasi');

    try {
        const { error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            throw error;
        }

        showApp();
        await muatDataDariCloud();
        aktifkanRealtimeAbsensi();
        if (passwordEl) passwordEl.value = "";
    } catch (error) {
        console.error("Login gagal:", error);
        alert(error?.message || "Login gagal.");
    } finally {
        setButtonLoading(btnLogin, false, "", '<i class="fa fa-right-to-bracket"></i> Masuk Aplikasi');
    }
}

async function handleLogout() {
    if (!confirm("Apakah Anda yakin ingin keluar?")) return;

    try {
        await supabaseClient.auth.signOut();
    } catch (error) {
        console.error("Logout gagal:", error);
    } finally {
        await hentikanRealtimeAbsensi();
        dataRekap = [];
        saveCache();
        renderTable("Silakan login untuk melihat data.");
        showLogin();
    }
}

async function muatDataDariCloud(tampilkanLoading = true) {
    const session = await getActiveSession();
    if (!session) {
        showLogin();
        return;
    }

    const tbody = $("tbody");
    if (tbody && tampilkanLoading) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty"><i class="fa fa-spinner fa-spin"></i> Menyinkronkan data terbaru dari Cloud Supabase...</td></tr>`;
    }

    try {
        const { data, error } = await supabaseClient
            .from(TABLE_NAME)
            .select("*")
            .order("nama", { ascending: true });

        if (error) throw error;

        dataRekap = (data || []).map(normalizeDbRow).sort((a, b) => a.nama.localeCompare(b.nama, "id"));
        saveCache();
        renderTable();
    } catch (error) {
        console.error("Gagal memuat dari Cloud Supabase:", error);
        const cached = loadCache().map(normalizeDbRow);
        if (cached.length > 0) {
            dataRekap = cached.sort((a, b) => a.nama.localeCompare(b.nama, "id"));
            renderTable("Menampilkan data cache karena sinkronisasi cloud gagal.");
        } else {
            dataRekap = [];
            renderTable("Gagal memuat data. Silakan cek koneksi atau session Supabase.");
        }
    }
}

function jadwalkanReloadRealtime() {
    if (realtimeReloadTimer) clearTimeout(realtimeReloadTimer);

    realtimeReloadTimer = setTimeout(async () => {
        realtimeReloadTimer = null;
        const session = await getActiveSession();
        if (!session) return;
        await muatDataDariCloud(false);
    }, 600);
}

function aktifkanRealtimeAbsensi() {
    if (realtimeChannel) return;

    realtimeChannel = supabaseClient
        .channel("absensinsc-realtime")
        .on(
            "postgres_changes",
            { event: "*", schema: "public", table: TABLE_NAME },
            function () {
                jadwalkanReloadRealtime();
            }
        )
        .subscribe(function (status) {
            console.log("Realtime absensi:", status);
        });
}

async function hentikanRealtimeAbsensi() {
    if (!realtimeChannel) return;

    try {
        await supabaseClient.removeChannel(realtimeChannel);
    } catch (error) {
        console.warn("Realtime channel gagal dihentikan:", error);
    } finally {
        realtimeChannel = null;
    }
}

async function updateCounter(index, tipe, value) {
    const session = await requireSessionOrAlert();
    if (!session) return;

    const targetSiswa = dataRekap[index];
    if (!targetSiswa) return;

    const namaSiswa = targetSiswa.nama;
    let baruHadir = targetSiswa.hadir;
    let baruTidakHadir = targetSiswa.tidakHadir;
    const waktuSekarangISO = new Date().toISOString();
    let riwayatBaru;
    let tanggalPayload;

    if (value > 0) {
        const inputCatatan = prompt(`Masukkan catatan baru untuk ${namaSiswa}:`, "Update manual via counter");
        if (inputCatatan === null) return;
        const catatanKetik = inputCatatan.trim() === "" ? "Update manual via counter" : inputCatatan.trim();

        const statusCatatan = tipe === "hadir" ? "Hadir" : "Tidak Hadir";
        if (tipe === "hadir") {
            baruHadir += 1;
        } else {
            baruTidakHadir += 1;
        }

        riwayatBaru = tambahRiwayatCatatan(targetSiswa.riwayatCatatan, catatanKetik, waktuSekarangISO, statusCatatan);
        tanggalPayload = waktuSekarangISO;
    } else {
        if (tipe === "hadir") {
            if (baruHadir === 0) return;
            baruHadir -= 1;
        } else {
            if (baruTidakHadir === 0) return;
            baruTidakHadir -= 1;
        }

        // Kurangi = hapus permanen entri riwayat terakhir yang sesuai, bukan menambah catatan "koreksi".
        // Jadi setelah dikurangi, tidak ada bekas/riwayat data yang tersimpan.
        const statusTarget = tipe === "hadir" ? "Hadir" : "Tidak Hadir";
        riwayatBaru = hapusRiwayatTerakhirByStatus(targetSiswa.riwayatCatatan, statusTarget);
        tanggalPayload = getTanggalTerakhirRiwayat(riwayatBaru, waktuSekarangISO);
    }

    if (baruHadir === 0 && baruTidakHadir === 0) {
        alert(`Rekap data ${namaSiswa} bernilai 0. Siswa akan otomatis dihapus dari sistem.`);
        await deleteRow(index);
        return;
    }

    const payload = getDbPayloadFromItem(targetSiswa, {
        hadir: baruHadir,
        tidak_hadir: baruTidakHadir,
        riwayatCatatan: riwayatBaru,
        tanggal: tanggalPayload
    });

    try {
        const { error } = await supabaseClient
            .from(TABLE_NAME)
            .upsert(payload, { onConflict: "absensi" });

        if (error) throw error;

        dataRekap[index] = {
            ...targetSiswa,
            hadir: baruHadir,
            tidakHadir: baruTidakHadir,
            catatan: getCatatanTerakhir(riwayatBaru, ""),
            riwayatCatatan: riwayatBaru,
            rawDate: tanggalPayload,
            tanggal: tanggalPayload,
            tanggalRealtime: formatTanggalIndonesia(tanggalPayload)
        };

        saveCache();
        renderTable();
    } catch (error) {
        console.error(error);
        alert("Gagal memperbarui data ke Supabase: " + (error?.message || "Terjadi kesalahan."));
    }
}

async function deleteSiswaByName(namaSiswa, index = null, confirmText = `Hapus data rekap ${namaSiswa} dari sistem Supabase?`) {
    const session = await requireSessionOrAlert();
    if (!session) return;

    if (!confirm(confirmText)) return;

    const btnDelete = index !== null ? $(`btnDelete-${index}`) : null;
    const originalHtml = btnDelete ? btnDelete.innerHTML : "";

    try {
        if (btnDelete) {
            btnDelete.disabled = true;
            btnDelete.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
        }

        const { error } = await supabaseClient
            .from(TABLE_NAME)
            .delete()
            .eq("absensi", normalizeNama(namaSiswa));

        if (error) throw error;

        if (index !== null) {
            dataRekap.splice(index, 1);
        } else {
            dataRekap = dataRekap.filter((item) => item.nama !== normalizeNama(namaSiswa));
        }

        saveCache();
        renderTable();
    } catch (error) {
        console.error(error);
        alert("Gagal menghapus data dari Supabase: " + (error?.message || "Terjadi kesalahan."));
        if (btnDelete) {
            btnDelete.disabled = false;
            btnDelete.innerHTML = originalHtml || '<i class="fa fa-trash"></i>';
        }
    }
}

async function deleteRow(index) {
    const item = dataRekap[index];
    if (!item) return;
    await deleteSiswaByName(item.nama, index, `Hapus data rekap ${item.nama} dari sistem Supabase?`);
}

async function keluarkanSiswa(namaSiswa) {
    await deleteSiswaByName(namaSiswa, null, `Keluarkan siswa ${namaSiswa} dari les renang?\n\nData absensi akan dihapus dari rekap cloud.`);
}

async function simpan() {
    const session = await requireSessionOrAlert();
    if (!session) return;

    let nama = "";
    if (selectNamaControl) {
        nama = selectNamaControl.getValue();
    }
    if (!nama) {
        nama = $("nama")?.value || "";
    }

    nama = normalizeNama(nama);
    if (!nama) {
        alert("Silakan pilih nama siswa terlebih dahulu!");
        return;
    }

    const status = $("status")?.value || "Hadir";
    const catatan = getCatatanInputValue();
    const nomorHpInput = $("no_hp")?.value.trim() || "";
    const btnSimpan = $("btnSimpan");

    setButtonLoading(btnSimpan, true, '<i class="fa fa-spinner fa-spin"></i> Menyimpan...', '<i class="fa fa-plus-circle"></i> Simpan Data');

    try {
        const catatanTeks = catatan.trim() !== "" ? catatan.trim() : "Absensi tercatat";
        if (!Array.isArray(dataRekap)) dataRekap = [];

        const existingIndex = dataRekap.findIndex((item) => item && item.nama === nama);
        const existing = existingIndex >= 0 ? dataRekap[existingIndex] : null;

        const nHadir = (existing?.hadir || 0) + (status === "Hadir" ? 1 : 0);
        const nTidakHadir = (existing?.tidakHadir || 0) + (status === "Tidak Hadir" ? 1 : 0);
        const noHpFinal = nomorHpInput !== "" ? nomorHpInput : (existing?.no_hp || "");

        const waktuSekarangISO = new Date().toISOString();
        const riwayatBaru = tambahRiwayatCatatan(existing?.riwayatCatatan, catatanTeks, waktuSekarangISO, status);
        const payload = {
            absensi: nama,
            nama,
            hadir: String(nHadir),
            tidak_hadir: String(nTidakHadir),
            catatan: serializeCatatanHistory(riwayatBaru),
            tanggal: waktuSekarangISO,
            no_hp: noHpFinal,
            pdf_path: existing?.pdf_path || ""
        };

        const { error } = await supabaseClient
            .from(TABLE_NAME)
            .upsert(payload, { onConflict: "absensi" });

        if (error) throw error;

        const savedItem = {
            ...(existing || {}),
            nama,
            absensi: nama,
            hadir: nHadir,
            tidakHadir: nTidakHadir,
            catatan: getCatatanTerakhir(riwayatBaru),
            riwayatCatatan: riwayatBaru,
            no_hp: noHpFinal,
            pdf_path: existing?.pdf_path || "",
            tanggal: waktuSekarangISO,
            rawDate: waktuSekarangISO,
            tanggalRealtime: formatTanggalIndonesia(waktuSekarangISO)
        };

        if (existingIndex >= 0) {
            dataRekap[existingIndex] = savedItem;
        } else {
            dataRekap.push(savedItem);
        }

        dataRekap.sort((a, b) => a.nama.localeCompare(b.nama, "id"));
        saveCache();
        renderTable();

        if (selectNamaControl) {
            selectNamaControl.clear(true);
        } else if ($("nama")) {
            $("nama").value = "";
        }

        resetCatatanInput();
        if ($("no_hp")) $("no_hp").value = "";

        alert("Data berhasil disimpan ke Supabase!");
    } catch (error) {
        console.error(error);
        alert("Gagal menyimpan ke Supabase: " + (error?.message || "Terjadi kesalahan."));
    } finally {
        setButtonLoading(btnSimpan, false, "", '<i class="fa fa-plus-circle"></i> Simpan Data');
    }
}

async function exportSiswaExcel(index) {
    const item = dataRekap[index];
    if (!item) return;

    const worksheetData = [
        ["LAPORAN ABSENSI INDIVIDU SISWA"],
        ["Nona Swimming Course (NSC)"],
        [],
        ["Komponen", "Keterangan"],
        ["Nama Siswa", item.nama],
        ["No. HP Orang Tua", item.no_hp || "-"],
        ["Jumlah Kehadiran", `${item.hadir} Pertemuan`],
        ["Tidak Hadir", `${item.tidakHadir} Pertemuan`],
        ["Status Target", item.hadir >= TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir}/${TOTAL_PERTEMUAN}`],
        ["Tanggal Terakhir Update", item.tanggalRealtime || formatTanggalIndonesia(item.rawDate)],
        ["Catatan Terakhir", item.catatan || "-"],
        [],
        ["Riwayat Catatan Pertemuan"],
        ["Ke", "Tanggal", "Waktu", "Status", "Catatan"]
    ];

    normalizeRiwayatCatatan(item.riwayatCatatan, item.rawDate).forEach((entry, idx) => {
        worksheetData.push([
            idx + 1,
            formatTanggalIndonesia(entry.tanggal),
            entry.waktu || formatWaktuIndonesia(entry.tanggal),
            entry.status || "-",
            entry.catatan || "-"
        ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Absensi Siswa");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    prosesUnduhFile(blob, `Absensi_${slugifyFileName(item.nama)}.xlsx`);
}

async function exportTotalExcel() {
    if (dataRekap.length === 0) {
        alert("Tidak ada data untuk diekspor!");
        return;
    }

    const worksheetData = [
        ["LAPORAN REKAP TOTAL KEHADIRAN SISWA"],
        ["Nona Swimming Course (NSC)"],
        [],
        ["Nama Siswa", "Hadir", "Tidak Hadir", "Rasio", "Tanggal Terbaru", "Catatan Terakhir", "No. HP"]
    ];

    dataRekap.forEach((item) => {
        worksheetData.push([
            item.nama,
            item.hadir,
            item.tidakHadir,
            item.hadir >= TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir}/${TOTAL_PERTEMUAN}`,
            item.tanggalRealtime || formatTanggalIndonesia(item.rawDate),
            item.catatan || "-",
            item.no_hp || "-"
        ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Total Absensi");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    prosesUnduhFile(blob, "Rekap_Total_Absensi_NSC.xlsx");
}

async function exportSiswaPDF(index) {
    const item = dataRekap[index];
    if (!item) return;

    try {
        const blob = await buildSiswaPdfBlob(item);
        downloadBlob(blob, `Absensi_${slugifyFileName(item.nama)}.pdf`);
    } catch (error) {
        console.error("Gagal export PDF individu:", error);
        alert("Terjadi kesalahan saat menyusun layout PDF.");
    }
}

async function exportTotalPDF() {
    if (dataRekap.length === 0) {
        alert("Tidak ada data untuk diekspor!");
        return;
    }

    try {
        const blob = await buildTotalPdfBlob();
        downloadBlob(blob, "Rekap_Total_Absensi_NSC.pdf");
    } catch (error) {
        console.error("Gagal export PDF total:", error);
        alert("Terjadi kesalahan saat menyusun layout PDF Total.");
    }
}

async function uploadDanKirimPdfWA(index) {
    const session = await requireSessionOrAlert();
    if (!session) return;

    const item = dataRekap[index];
    if (!item) return;

    const tombol = $(`btnWaPdf-${index}`);
    const teksAsli = tombol ? tombol.innerHTML : "";

    try {
        const nomorWA = normalizePhone(item.no_hp);

        if (!nomorWA) {
            throw new Error("Nomor HP kosong atau tidak valid.");
        }

        if (tombol) {
            tombol.disabled = true;
            tombol.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Memproses...';
        }

        // 1. Buat file PDF dari data siswa.
        const pdfBlob = await buildSiswaPdfBlob(item);

        if (!pdfBlob || pdfBlob.size === 0) {
            throw new Error("PDF gagal dibuat atau ukuran file 0 byte.");
        }

        const namaFileClean = slugifyFileName(item.nama) || "siswa";
        const namaBerkasPDF = `Absensi_${namaFileClean}.pdf`;
        const storagePath = `laporan/${Date.now()}-${namaBerkasPDF}`;

        // 2. Upload PDF ke Supabase Storage public bucket.
        const { data: uploadData, error: uploadError } = await supabaseClient
            .storage
            .from(STORAGE_BUCKET)
            .upload(storagePath, pdfBlob, {
                contentType: "application/pdf",
                cacheControl: "3600",
                upsert: false
            });

        if (uploadError) {
            throw new Error(`[Supabase Storage Error]: ${uploadError.message}. Cek bucket '${STORAGE_BUCKET}', policy Storage, dan koneksi internet.`);
        }

        if (!uploadData?.path) {
            throw new Error("Upload PDF berhasil, tetapi path file tidak dikembalikan oleh Supabase.");
        }

        // 3. Ambil public URL berdasarkan path hasil upload.
        const { data: urlData } = supabaseClient
            .storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(uploadData.path);

        const publicUrl = urlData?.publicUrl;

if (!publicUrl) {
    throw new Error("Gagal mendapatkan public URL PDF dari Supabase.");
}

const publicUrlDownload = `${publicUrl}?download=${encodeURIComponent(namaBerkasPDF)}`;

const pesanWAPDF = `Halo Bapak/Ibu, berikut laporan absensi Ananda *${item.nama}* di *Nona Swimming Course*.

Status Kehadiran: *${item.hadir >= TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir}/${TOTAL_PERTEMUAN}`}*
Catatan Evaluasi Terakhir: _${item.catatan || "-"}_
Riwayat catatan lengkap tersedia di dalam PDF.

Silakan buka PDF laporan melalui link berikut:
${publicUrlDownload}

Terima kasih.`;

const { data: hasilFunction, error: functionError } = await supabaseClient.functions.invoke(EDGE_FUNCTION_KIRIM_WA, {
    body: {
        target: nomorWA,
        message: pesanWAPDF,
        url: publicUrlDownload,
        filename: namaBerkasPDF,
        countryCode: "62"
    }
});

        if (functionError) {
            throw new Error(functionError.message || "Gagal memanggil Supabase Edge Function.");
        }

        console.log("Response Edge Function:", hasilFunction);

        if (hasilFunction?.success === true) {
            alert(`✅ Sukses! PDF laporan absensi ${item.nama} telah dikirim ke WhatsApp.`);
        } else {
            throw new Error(
                hasilFunction?.reason ||
                hasilFunction?.message ||
                hasilFunction?.detail ||
                "Gagal mengirim PDF melalui Edge Function. Cek secret FONNTE_TOKEN, device Fonnte, nomor tujuan, dan URL PDF."
            );
        }
    } catch (error) {
        console.error("LOG UTAMA SISTEM:", error);
        alert("Sistem Menolak Aktivitas:\n" + (error?.message || "Terjadi kesalahan."));
    } finally {
        if (tombol) {
            tombol.disabled = false;
            tombol.innerHTML = teksAsli;
        }
    }
}

async function resetSemuaData() {
    const session = await requireSessionOrAlert();
    if (!session) return;

    if (!confirm("Apakah Anda yakin ingin menghapus total semua data dari database cloud Supabase?")) return;
    if (!confirm("Konfirmasi terakhir: Data yang dihapus tidak bisa dikembalikan!")) return;

    const btnReset = $("btnResetAll");
    const originalHtml = btnReset ? btnReset.innerHTML : "";

    try {
        if (btnReset) {
            btnReset.disabled = true;
            btnReset.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Mereset...';
        }

        const { data: listSiswa, error: fetchError } = await supabaseClient
            .from(TABLE_NAME)
            .select("absensi");

        if (fetchError) throw fetchError;

        if (listSiswa && listSiswa.length > 0) {
            const listNama = listSiswa.map((s) => s.absensi).filter(Boolean);
            const { error: errorDeleteRekap } = await supabaseClient
                .from(TABLE_NAME)
                .delete()
                .in("absensi", listNama);

            if (errorDeleteRekap) throw errorDeleteRekap;
        }

        dataRekap = [];
        saveCache();
        renderTable("Database telah dikosongkan.");
        alert("Database Absensi Berhasil Dikosongkan!");
    } catch (error) {
        console.error(error);
        alert("Gagal mereset: " + (error?.message || "Terjadi kesalahan."));
    } finally {
        if (btnReset) {
            btnReset.disabled = false;
            btnReset.innerHTML = originalHtml || '<i class="fa fa-trash-can"></i> Reset';
        }
    }
}

function initNamaSelect() {
    const selectEl = $("nama");
    if (!selectEl || selectNamaControl) return;

    selectNamaControl = new TomSelect("#nama", {
        create: true,
        sortField: { field: "text", direction: "asc" },
        placeholder: "Ketik / Pilih Nama Siswa...",
        allowEmptyOption: true,
        persist: false,
        onChange: function (value) {
            if (value) {
                if (selectNamaControl) selectNamaControl.blur();
                document.activeElement?.blur?.();
            }
        }
    });
}

function initCatatanSelect() {
    const selectEl = $("catatan");
    if (!selectEl || selectCatatanControl) return;

    // create: true -> boleh pilih dari dropdown ATAU ketik catatan manual bebas
    selectCatatanControl = new TomSelect("#catatan", {
        create: true,
        createOnBlur: true,
        allowEmptyOption: true,
        persist: false,
        placeholder: "Pilih catatan cepat atau ketik catatan manual...",
        onChange: function (value) {
            if (value) {
                if (selectCatatanControl) selectCatatanControl.blur();
                document.activeElement?.blur?.();
            }
        }
    });
}

function getCatatanInputValue() {
    if (selectCatatanControl) return selectCatatanControl.getValue() || "";
    return $("catatan")?.value || "";
}

function resetCatatanInput() {
    if (selectCatatanControl) {
        selectCatatanControl.clear(true);
    } else if ($("catatan")) {
        $("catatan").value = "";
    }
}

document.addEventListener("DOMContentLoaded", async function () {
    initNamaSelect();
    initCatatanSelect();
    updateJamRealtime();
    setInterval(updateJamRealtime, 1000);
    await checkLoginSession();
});
