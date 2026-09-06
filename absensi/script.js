const TOTAL_PERTEMUAN = 12;

// ==========================================================
// Kelas / Kategori Siswa
// ==========================================================
// Setiap siswa (kontak) punya satu "kelas" aktif. Siswa baru selalu
// masuk ke "Prestasi" dulu (kelas evaluasi/percobaan) sampai proses
// evaluasi selesai, baru kemudian dikeluarkan & dipindah ke kelas
// yang sesuai (Menengah, Pemula A, atau Pemula B) lewat dropdown
// "Kelas" di baris tabel rekap.
const KELAS_LIST = ["Prestasi", "Menengah", "Pemula A", "Pemula B"];
const KELAS_DEFAULT = "Prestasi";

// Target jumlah pertemuan berbeda untuk kelas Pemula (A & B): 15x pertemuan.
// Kelas Prestasi & Menengah tetap memakai TOTAL_PERTEMUAN (12x).
const KELAS_TARGET_PERTEMUAN = {
    "Prestasi": TOTAL_PERTEMUAN,
    "Menengah": TOTAL_PERTEMUAN,
    "Pemula A": 15,
    "Pemula B": 15
};

function normalizeKelas(value) {
    const bersih = String(value ?? "").trim();
    return KELAS_LIST.includes(bersih) ? bersih : KELAS_DEFAULT;
}

function getTargetPertemuanKelas(kelas) {
    const k = normalizeKelas(kelas);
    return KELAS_TARGET_PERTEMUAN[k] ?? TOTAL_PERTEMUAN;
}

// Kelas aktif yang sedang ditampilkan di tab Rekap Data.
let activeKelasTab = KELAS_DEFAULT;

// Kata kunci pencarian nama di dalam tabel rekap (per kelas yang sedang aktif).
let rekapSearchQuery = "";

const SUPABASE_URL = "https://mjfwgmhuengvfdagbcsk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZndnbWh1ZW5ndmZkYWdiY3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMDczMTMsImV4cCI6MjA5Njg4MzMxM30.NxZY9zHP9zQmHRsgpcGZyk3t7_xaGFFuTa3bYIAD384";
const TABLE_NAME = "absensinsc";
const KONTAK_TABLE = "kontak";
const STORAGE_BUCKET = "laporan-pdf";
const EDGE_FUNCTION_KIRIM_WA = "dynamic-endpoint";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CATATAN_PRESET = [
    {
        label: "Umum / Kehadiran",
        options: [
            "Absensi tercatat",
            "Hadir tepat waktu dan aktif berlatih",
            "Tidak hadir tanpa keterangan",
            "Izin / sakit, tidak hadir"
        ]
    },
    {
        label: "Umum - Keberanian & Adaptasi Air",
        options: [
            "Masih ragu/takut menahan napas di dalam air",
            "Sudah cukup berani menahan napas di dalam air",
            "Masih takut mengapung/mengambang sendiri",
            "Sudah bisa mengapung dengan tenang tanpa bantuan"
        ]
    },
    {
        label: "Gaya Bebas - Gerakan Kaki",
        options: [
            "Cambukan kaki masih dari lutut, belum dari pangkal paha",
            "Dorongan tenaga dari pukulan kaki belum optimal",
            "Ritme gerakan kaki sudah bagus, siap masuk koordinasi tangan-kaki"
        ]
    },
    {
        label: "Gaya Bebas - Gerakan Tangan",
        options: [
            "Kayuhan tangan (push phase) belum maksimal sampai belakang",
            "Recovery tangan belum ideal, sikut belum high elbow",
            "Tangan menyilang garis tengah tubuh (crossing over)",
            "Sikut jatuh saat entry, tangan menepuk air duluan"
        ]
    },
    {
        label: "Gaya Bebas - Koordinasi & Pernapasan",
        options: [
            "Pengambilan napas masih terlalu sering, perlu latihan breath-holding",
            "Kepala diangkat ke depan saat ambil napas, bukan diputar ke samping",
            "Irama gerakan tergesa-gesa, fase glide/meluncur hilang",
            "Koordinasi tangan dan kaki sudah mulai selaras"
        ]
    },
    {
        label: "Gaya Bebas - Posisi Tubuh",
        options: [
            "Posisi kepala terlalu mendongak, pinggul jadi tenggelam",
            "Belum streamline, perlu latihan posisi wajah menghadap bawah",
            "Berenang datar (flat swimming), belum ada body roll"
        ]
    },
    {
        label: "Gaya Dada - Gerakan Kaki",
        options: [
            "Tendangan katak (whip kick) belum simetris kiri-kanan",
            "Lutut membuka terlalu lebar, dorongan air jadi berkurang",
            "Fase tarik-lipat-tendang-luncur sudah mulai terbentuk dengan baik"
        ]
    },
    {
        label: "Gaya Dada - Gerakan Tangan",
        options: [
            "Kayuhan tangan terlalu lebar, melewati garis bahu",
            "Fase recovery tangan belum rapat/streamline ke depan",
            "Pola tarikan tangan (pull) sudah membentuk pola hati dengan baik"
        ]
    },
    {
        label: "Gaya Dada - Koordinasi & Pernapasan",
        options: [
            "Urutan tarik-napas-tendang-luncur belum sinkron",
            "Kepala terlalu lama berada di atas air saat ambil napas",
            "Belum ada fase meluncur (glide) setelah tendangan",
            "Koordinasi tangan dan kaki sudah rapi, tinggal tambah kecepatan"
        ]
    },
    {
        label: "Gaya Punggung - Gerakan Kaki",
        options: [
            "Tendangan kaki masih dari lutut, lutut menyembul ke atas air",
            "Ukuran tendangan sudah kecil dan cepat, sudah cukup baik",
            "Posisi ujung jari kaki belum rileks/menunjuk (pointed)"
        ]
    },
    {
        label: "Gaya Punggung - Gerakan Tangan",
        options: [
            "Entry tangan tidak lurus di atas bahu, sering mengarah ke tengah",
            "Fase tarikan tangan belum penuh sampai ke paha",
            "Recovery tangan sudah lurus (straight-arm recovery) dengan baik"
        ]
    },
    {
        label: "Gaya Punggung - Koordinasi & Posisi Tubuh",
        options: [
            "Pinggul turun/tenggelam karena posisi kepala kurang stabil",
            "Rotasi bahu (body roll) belum mengikuti kayuhan tangan",
            "Posisi tubuh sudah horizontal dan stabil di permukaan air"
        ]
    },
    {
        label: "Gaya Kupu-kupu (Dolphin) - Gerakan Kaki",
        options: [
            "Gelombang tubuh (undulation) belum terbentuk dari dada ke kaki",
            "Tendangan dolphin kick masih kaku, hanya dari lutut",
            "Ritme dua kali tendangan tiap satu kayuhan tangan mulai terbentuk"
        ]
    },
    {
        label: "Gaya Kupu-kupu (Dolphin) - Gerakan Tangan",
        options: [
            "Pola tarikan tangan (keyhole pull) belum sempurna",
            "Recovery tangan di atas air masih terlalu tinggi dan cepat lelah",
            "Posisi masuk tangan ke air belum simetris kiri-kanan"
        ]
    },
    {
        label: "Gaya Kupu-kupu (Dolphin) - Koordinasi & Pernapasan",
        options: [
            "Mengangkat kepala terlalu tinggi saat ambil napas, mengganggu gelombang tubuh",
            "Timing napas belum pas dengan fase recovery tangan",
            "Koordinasi gelombang tubuh dan tangan sudah mulai menyatu"
        ]
    }
];

// ==========================================================
// Klasifikasi Otomatis Catatan -> Gaya Renang & Jenis Gerakan
// ==========================================================
// Ketika guru mengetik catatan manual (bukan memilih dari preset),
// teks tsb otomatis dianalisis dan dikelompokkan ke kategori
// "Gaya ... - Gerakan ..." yang sesuai, lalu disimpan permanen
// supaya muncul sebagai catatan cepat di kemudian hari.

const GAYA_KEYWORDS = [
    { label: "Gaya Bebas", katakunci: ["bebas", "freestyle", "front crawl", "crawl"] },
    { label: "Gaya Dada", katakunci: ["dada", "breaststroke", "katak"] },
    { label: "Gaya Punggung", katakunci: ["punggung", "backstroke"] },
    { label: "Gaya Kupu-kupu (Dolphin)", katakunci: ["kupu-kupu", "kupu", "dolphin", "butterfly"] }
];

const GERAKAN_KEYWORDS = [
    {
        label: "Keberanian & Adaptasi Air",
        katakunci: ["takut", "berani", "ragu", "trauma", "panik", "adaptasi air", "menahan napas di dalam air", "mengambang sendiri"]
    },
    { label: "Gerakan Kaki", katakunci: ["kaki", "tendang", "tendangan", "cambuk", "cambukan", "kick", "lutut", "pangkal paha"] },
    { label: "Gerakan Tangan", katakunci: ["tangan", "kayuh", "kayuhan", "lengan", "sikut", "siku", "recovery", "entry", "dayung", "pull", "high elbow"] },
    { label: "Koordinasi & Pernapasan", katakunci: ["napas", "nafas", "koordinasi", "irama", "ritme", "breath", "sinkron"] },
    { label: "Posisi Tubuh", katakunci: ["posisi tubuh", "streamline", "tenggelam", "pinggul", "mendongak", "body roll", "gelombang tubuh", "undulation", "horizontal", "mengapung", "mengambang"] }
];

// Supaya konsisten dengan nama grup yang sudah ada di CATATAN_PRESET
// (mis. gaya punggung menggabungkan "Koordinasi & Posisi Tubuh" jadi satu grup).
const GERAKAN_ALIAS_PER_GAYA = {
    "Gaya Punggung": {
        "Koordinasi & Pernapasan": "Koordinasi & Posisi Tubuh",
        "Posisi Tubuh": "Koordinasi & Posisi Tubuh"
    },
    "Gaya Dada": {
        "Posisi Tubuh": "Koordinasi & Pernapasan"
    }
};

function deteksiKataKunci(teksLower, daftar) {
    for (const item of daftar) {
        if (item.katakunci.some((kk) => teksLower.includes(kk))) {
            return item.label;
        }
    }
    return null;
}

// Menentukan grup klasifikasi (Gaya + Gerakan) dari sebuah teks catatan.
function klasifikasikanCatatan(teks) {
    const teksLower = String(teks || "").toLowerCase();
    const gaya = deteksiKataKunci(teksLower, GAYA_KEYWORDS);
    const gerakan = deteksiKataKunci(teksLower, GERAKAN_KEYWORDS);

    if (gaya && gerakan) {
        const alias = GERAKAN_ALIAS_PER_GAYA[gaya]?.[gerakan];
        return `${gaya} - ${alias || gerakan}`;
    }
    if (gaya && !gerakan) {
        return `${gaya} - Catatan Umum`;
    }
    if (!gaya && gerakan === "Keberanian & Adaptasi Air") {
        return "Umum - Keberanian & Adaptasi Air";
    }
    if (!gaya && gerakan) {
        return `Umum - ${gerakan}`;
    }
    return "Umum / Kehadiran";
}

const CATATAN_CUSTOM_KEY = "nsc_catatan_custom_v1";

// Membaca catatan kustom (hasil klasifikasi otomatis) yang tersimpan di perangkat ini.
function muatCatatanKustom() {
    try {
        const raw = localStorage.getItem(CATATAN_CUSTOM_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (error) {
        console.warn("Gagal memuat catatan kustom:", error);
        return {};
    }
}

// Menyimpan catatan baru ke grup klasifikasinya secara permanen (localStorage).
function simpanCatatanKustomKeStorage(kategori, teks) {
    const data = muatCatatanKustom();
    if (!Array.isArray(data[kategori])) data[kategori] = [];
    if (!data[kategori].includes(teks)) {
        data[kategori].push(teks);
        try {
            localStorage.setItem(CATATAN_CUSTOM_KEY, JSON.stringify(data));
        } catch (error) {
            console.warn("Gagal menyimpan catatan kustom:", error);
        }
    }
}

// Mendaftarkan catatan manual yang baru diketik: klasifikasikan otomatis,
// simpan permanen, lalu sinkronkan ke semua dropdown catatan yang aktif.
function daftarkanCatatanBaru(teks) {
    const teksBersih = String(teks || "").trim();
    if (!teksBersih) return false;

    const kategori = klasifikasikanCatatan(teksBersih);
    simpanCatatanKustomKeStorage(kategori, teksBersih);

    [selectCatatanControl, modalCatatanControl].forEach((ts) => {
        if (!ts) return;
        if (!ts.optgroups[kategori]) {
            ts.addOptionGroup(kategori, { label: kategori });
        }
        if (!ts.options[teksBersih]) {
            ts.addOption({ value: teksBersih, text: teksBersih, optgroup: kategori });
        }
        ts.refreshOptions(false);
    });

    return { value: teksBersih, text: teksBersih, optgroup: kategori };
}

function buildCatatanOptionsHtml() {
    const catatanKustom = muatCatatanKustom();
    const grupTerpakai = new Set();
    let html = '<option value=""></option>';

    CATATAN_PRESET.forEach((grup) => {
        grupTerpakai.add(grup.label);
        const tambahan = (catatanKustom[grup.label] || []).filter((teks) => !grup.options.includes(teks));
        // data-value disamakan dengan teks label, supaya ID grup di TomSelect konsisten
        // dengan "kategori" yang dipakai daftarkanCatatanBaru() saat catatan manual disimpan.
        // Tanpa ini, TomSelect otomatis kasih ID angka (1,2,3,...) untuk optgroup bawaan HTML,
        // sehingga grup hasil klasifikasi otomatis (ID = teks) dianggap grup baru yang berbeda
        // walau labelnya sama -> catatan baru "terpisah", tidak masuk ke baris kelompok aslinya.
        const grupValue = grup.label.replace(/"/g, "&quot;");
        html += `<optgroup label="${grup.label}" data-value="${grupValue}">`;
        [...grup.options, ...tambahan].forEach((teks) => {
            html += `<option value="${teks.replace(/"/g, "&quot;")}">${teks}</option>`;
        });
        html += "</optgroup>";
    });

    // Grup baru hasil klasifikasi otomatis yang belum ada di preset bawaan
    // (misalnya kombinasi gaya & gerakan yang belum pernah dicatat sebelumnya).
    Object.keys(catatanKustom).forEach((grupLabel) => {
        if (grupTerpakai.has(grupLabel)) return;
        const daftar = catatanKustom[grupLabel];
        if (!daftar || !daftar.length) return;
        const grupValue = grupLabel.replace(/"/g, "&quot;");
        html += `<optgroup label="${grupLabel}" data-value="${grupValue}">`;
        daftar.forEach((teks) => {
            html += `<option value="${teks.replace(/"/g, "&quot;")}">${teks}</option>`;
        });
        html += "</optgroup>";
    });

    return html;
}

let dataRekap = [];
let dataKontak = [];
let kontakMap = new Map();
let selectNamaControl = null;
let selectCatatanControl = null;

const namaHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const CACHE_KEY = "nsc_absensi_cache";
const CATATAN_HISTORY_PREFIX = "NSC_CATATAN_HISTORY_V1:";
let realtimeChannel = null;
let realtimeReloadTimer = null;
let realtimeChannelKontak = null;
let realtimeReloadTimerKontak = null;

// Waktu Absensi: mode otomatis (default) atau manual (pilih tanggal + scroll jam)
let waktuAbsensiMode = "otomatis";
let jamManualTerpilih = null;
let menitManualTerpilih = null;
const JAM_PICKER_ITEM_HEIGHT = 40;

// Waktu untuk modal update counter (+/- di tabel rekap)
let counterWaktuMode = "otomatis";
let counterJamTerpilih = null;
let counterMenitTerpilih = null;

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

// ===== Daftar Kontak (nama + no. HP) =====
// Disimpan terpisah dari tabel absensi supaya nama & no. HP TETAP ADA
// walaupun catatan/data absensinya dihapus dari rekap.

function normalizeKontakRow(row) {
    return {
        nama: normalizeNama(row?.nama),
        no_hp: String(row?.no_hp ?? "").trim(),
        kelas: normalizeKelas(row?.kelas)
    };
}

function rebuildKontakMap() {
    kontakMap = new Map(dataKontak.map((k) => [k.nama, k]));
}

// Kelas aktif seorang siswa, dicari dari daftar kontak. Siswa yang belum
// tercatat di daftar kontak (mis. data lama) dianggap "Prestasi" (default).
function getKelasSiswa(nama) {
    const kontak = kontakMap.get(normalizeNama(nama));
    return normalizeKelas(kontak?.kelas);
}

function renderNamaOptions() {
    if (!selectNamaControl) return;
    const currentValue = selectNamaControl.getValue();

    selectNamaControl.clearOptions();
    selectNamaControl.addOption({ value: "", text: "" });
    dataKontak.forEach((k) => {
        selectNamaControl.addOption({ value: k.nama, text: k.nama });
    });
    selectNamaControl.refreshOptions(false);

    if (currentValue) selectNamaControl.setValue(currentValue, true);
}

async function muatKontakDariCloud() {
    try {
        const { data, error } = await supabaseClient
            .from(KONTAK_TABLE)
            .select("nama, no_hp, kelas")
            .order("nama", { ascending: true });

        if (error) throw error;

        dataKontak = (data || []).map(normalizeKontakRow).filter((k) => k.nama);
        rebuildKontakMap();
        renderNamaOptions();
        // Render ulang tabel rekap supaya pengelompokan tab Kelas ikut ter-update
        // jika ada perubahan kelas kontak dari sesi/perangkat lain (realtime).
        if (Array.isArray(dataRekap) && dataRekap.length > 0) renderTable();
    } catch (error) {
        console.error("Gagal memuat daftar kontak dari Supabase:", error);
    }
}

// Simpan/perbarui satu kontak (nama + no. HP + kelas) ke Supabase.
// no. HP kosong TIDAK akan menimpa no. HP yang sudah tersimpan sebelumnya.
// kelas juga TIDAK akan menimpa kelas yang sudah ada jika tidak diisi
// (undefined/null); siswa baru tanpa kelas otomatis masuk "Prestasi".
async function upsertKontak(nama, noHp, kelas) {
    const namaBersih = normalizeNama(nama);
    if (!namaBersih) return null;

    const existing = dataKontak.find((k) => k.nama === namaBersih);
    const noHpBersih = String(noHp ?? "").trim();
    const noHpFinal = noHpBersih || existing?.no_hp || "";
    const kelasFinal = kelas !== undefined && kelas !== null && kelas !== ""
        ? normalizeKelas(kelas)
        : normalizeKelas(existing?.kelas);

    const { error } = await supabaseClient
        .from(KONTAK_TABLE)
        .upsert({ nama: namaBersih, no_hp: noHpFinal, kelas: kelasFinal }, { onConflict: "nama" });

    if (error) throw error;

    if (existing) {
        existing.no_hp = noHpFinal;
        existing.kelas = kelasFinal;
    } else {
        dataKontak.push({ nama: namaBersih, no_hp: noHpFinal, kelas: kelasFinal });
        dataKontak.sort((a, b) => a.nama.localeCompare(b.nama, "id"));
    }

    rebuildKontakMap();
    renderNamaOptions();
    return namaBersih;
}

// Memindahkan siswa dari satu kelas ke kelas lain (dipanggil dari dropdown
// "Kelas" di tabel rekap). Nomor HP tidak diubah.
async function pindahKelasSiswa(nama, kelasBaru, selectEl) {
    const session = await requireSessionOrAlert();
    if (!session) {
        renderTable();
        return;
    }

    const namaBersih = normalizeNama(nama);
    const kelasTervalidasi = normalizeKelas(kelasBaru);

    if (selectEl) selectEl.disabled = true;

    try {
        await upsertKontak(namaBersih, undefined, kelasTervalidasi);
        renderTable();
    } catch (error) {
        console.error("Gagal memindahkan kelas siswa:", error);
        alert("Gagal memindahkan kelas siswa: " + (error?.message || "Terjadi kesalahan."));
        renderTable();
    } finally {
        if (selectEl) selectEl.disabled = false;
    }
}

function jadwalkanReloadKontak() {
    if (realtimeReloadTimerKontak) clearTimeout(realtimeReloadTimerKontak);

    realtimeReloadTimerKontak = setTimeout(async () => {
        realtimeReloadTimerKontak = null;
        const session = await getActiveSession();
        if (!session) return;
        await muatKontakDariCloud();
    }, 600);
}

function aktifkanRealtimeKontak() {
    if (realtimeChannelKontak) return;

    realtimeChannelKontak = supabaseClient
        .channel("kontak-realtime")
        .on(
            "postgres_changes",
            { event: "*", schema: "public", table: KONTAK_TABLE },
            function () {
                jadwalkanReloadKontak();
            }
        )
        .subscribe(function (status) {
            console.log("Realtime kontak:", status);
        });
}

async function hentikanRealtimeKontak() {
    if (!realtimeChannelKontak) return;

    try {
        await supabaseClient.removeChannel(realtimeChannelKontak);
    } catch (error) {
        console.warn("Realtime channel kontak gagal dihentikan:", error);
    } finally {
        realtimeChannelKontak = null;
    }

    if (realtimeReloadTimerKontak) {
        clearTimeout(realtimeReloadTimerKontak);
        realtimeReloadTimerKontak = null;
    }
}

function buildWhatsAppText(item) {
    const kelasSiswa = getKelasSiswa(item.nama);
    const target = getTargetPertemuanKelas(kelasSiswa);
    const statusTarget = item.hadir >= target ? "LENGKAP" : `${item.hadir}/${target}`;
    return `Halo Bapak/Ibu, berikut laporan absensi Ananda *${item.nama}* di *Nona Swimming Course*.

Kelas: *${kelasSiswa}*
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

    const kelasSiswa = getKelasSiswa(item.nama);
    const targetSiswa = getTargetPertemuanKelas(kelasSiswa);

    const rows = [
        ["Nama Siswa", item.nama],
        ["Kelas", kelasSiswa],
        ["No. HP Orang Tua", item.no_hp || "-"],
        ["Total Kehadiran (Hadir)", `${item.hadir} Pertemuan`],
        ["Total Tidak Hadir", `${item.tidakHadir} Pertemuan`],
        ["Status Pertemuan", item.hadir >= targetSiswa ? "LENGKAP" : `${item.hadir}/${targetSiswa}`],
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

// Mengambil daftar siswa untuk kelas tertentu (default: kelas tab yang sedang aktif).
function getDataRekapByKelas(kelas = activeKelasTab) {
    const kelasTervalidasi = normalizeKelas(kelas);
    return dataRekap.filter((item) => getKelasSiswa(item.nama) === kelasTervalidasi);
}

async function buildTotalPdfBlob(kelas = activeKelasTab) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const kelasTervalidasi = normalizeKelas(kelas);
    const target = getTargetPertemuanKelas(kelasTervalidasi);
    const daftarSiswa = getDataRekapByKelas(kelasTervalidasi);

    await addPdfHeader(doc, "LAPORAN REKAP TOTAL KEHADIRAN", `Nona Swimming Course - Kelas ${kelasTervalidasi} - Target: ${target} Pertemuan`);

    const rows = daftarSiswa.map((item) => [
        item.nama,
        item.hadir,
        item.tidakHadir,
        item.hadir >= target ? "LENGKAP" : `${item.hadir}/${target}`,
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

// Render pill tab kelas (Prestasi / Menengah / Pemula A / Pemula B) + badge
// jumlah siswa di tiap kelas, supaya guru tahu berapa siswa yang masih
// "menumpuk" di Kelas Prestasi dan perlu dipindah.
function renderKelasTabs() {
    const wrap = $("kelasTabs");
    if (!wrap) return;

    const jumlahPerKelas = {};
    KELAS_LIST.forEach((k) => { jumlahPerKelas[k] = 0; });
    (Array.isArray(dataRekap) ? dataRekap : []).forEach((item) => {
        const k = getKelasSiswa(item.nama);
        jumlahPerKelas[k] = (jumlahPerKelas[k] || 0) + 1;
    });

    wrap.innerHTML = KELAS_LIST.map((k) => {
        const aktif = k === activeKelasTab ? "active" : "";
        return `<button type="button" class="kelas-tab-btn ${aktif}" onclick="gantiKelasTab('${k.replace(/'/g, "\\'")}')">
            ${escapeHtml(k)} <span class="kelas-tab-count">${jumlahPerKelas[k] || 0}</span>
        </button>`;
    }).join("");
}

function gantiKelasTab(kelas) {
    activeKelasTab = normalizeKelas(kelas);
    // Pencarian direset setiap ganti kelas, supaya tidak bingung menyangka
    // kelas baru "kosong" padahal cuma tersaring oleh kata kunci kelas lama.
    rekapSearchQuery = "";
    const searchInput = $("cariNamaRekap");
    if (searchInput) searchInput.value = "";
    const btnClear = $("btnClearCariNama");
    if (btnClear) btnClear.classList.add("hidden");
    renderTable();
}

function cariNamaRekapBerubah(value) {
    rekapSearchQuery = String(value ?? "").trim();
    const btnClear = $("btnClearCariNama");
    if (btnClear) btnClear.classList.toggle("hidden", rekapSearchQuery === "");
    renderTable();
}

function clearCariNamaRekap() {
    rekapSearchQuery = "";
    const searchInput = $("cariNamaRekap");
    if (searchInput) searchInput.value = "";
    const btnClear = $("btnClearCariNama");
    if (btnClear) btnClear.classList.add("hidden");
    renderTable();
    searchInput?.focus();
}

function buildKelasSelectOptionsHtml(kelasTerpilih) {
    return KELAS_LIST.map((k) => {
        const selected = k === kelasTerpilih ? "selected" : "";
        return `<option value="${escapeHtml(k)}" ${selected}>${escapeHtml(k)}</option>`;
    }).join("");
}

function renderTable(emptyMessage = "Belum ada data rekap.") {
    const tbody = $("tbody");
    if (!tbody) return;

    renderKelasTabs();

    const targetPertemuan = getTargetPertemuanKelas(activeKelasTab);
    const totalTextEl = $("totalPertemuanText");
    if (totalTextEl) {
        totalTextEl.innerText = `Total ${targetPertemuan} Pertemuan Les Renang \u2014 Kelas ${activeKelasTab}`;
    }

    if (!Array.isArray(dataRekap) || dataRekap.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="table-empty">${escapeHtml(emptyMessage)}</td></tr>`;
        return;
    }

    let html = "";
    let jumlahTampil = 0;
    const kataKunci = rekapSearchQuery.trim().toLowerCase();

    dataRekap.forEach((item, index) => {
        const kelasSiswa = getKelasSiswa(item.nama);
        if (kelasSiswa !== activeKelasTab) return;
        if (kataKunci && !item.nama.toLowerCase().includes(kataKunci)) return;
        jumlahTampil++;

        const targetSiswa = getTargetPertemuanKelas(kelasSiswa);
        const totalBadge = item.hadir >= targetSiswa
            ? `<span class="total-lengkap">LENGKAP</span>`
            : `<span class="total-fraction">${item.hadir}/${targetSiswa}</span>`;

        const nomorWA = normalizePhone(item.no_hp);
        const waLink = nomorWA ? buildWhatsAppLink(item) : "#";
        const waTitle = nomorWA ? "Kirim Laporan Teks via WhatsApp" : "Nomor HP belum valid";
        const waAria = nomorWA ? "" : 'aria-disabled="true" onclick="return false;"';

        const namaEsc = escapeHtml(item.nama);
        const tanggalDisplay = escapeHtml(item.tanggalRealtime || formatTanggalIndonesia(item.rawDate));
        const namaAttrAman = escapeHtml(item.nama).replaceAll("'", "&#39;");

        html += `
            <tr>
                <td>${namaEsc}</td>
                <td>
                    <select class="kelas-select" title="Pindah Kelas" onchange="pindahKelasSiswa('${namaAttrAman}', this.value, this)">
                        ${buildKelasSelectOptionsHtml(kelasSiswa)}
                    </select>
                </td>
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
                        <button class="btn-action btn-edit" title="Edit Nama Siswa" onclick="bukaModalEditNama(${index})">
                            <i class="fa fa-pen"></i>
                        </button>
                        <button class="btn-action btn-delete" title="Hapus Data Siswa" id="btnDelete-${index}" onclick="deleteRow(${index})">
                            <i class="fa fa-trash"></i>
                        </button>
                        <button class="btn-action btn-kick" title="Keluarkan Siswa" onclick="keluarkanSiswa('${namaAttrAman}')">
                            <i class="fa fa-user-minus"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    });

    if (jumlahTampil === 0) {
        const pesanKosong = kataKunci
            ? `Tidak ditemukan siswa bernama "${escapeHtml(rekapSearchQuery.trim())}" di Kelas ${escapeHtml(activeKelasTab)}.`
            : `Belum ada siswa di Kelas ${escapeHtml(activeKelasTab)}.`;
        tbody.innerHTML = `<tr><td colspan="7" class="table-empty">${pesanKosong}</td></tr>`;
        return;
    }

    tbody.innerHTML = html;
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
        await muatKontakDariCloud();
        await muatDataDariCloud();
        aktifkanRealtimeAbsensi();
        aktifkanRealtimeKontak();
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
        await muatKontakDariCloud();
        await muatDataDariCloud();
        aktifkanRealtimeAbsensi();
        aktifkanRealtimeKontak();
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
        await hentikanRealtimeKontak();
        dataRekap = [];
        dataKontak = [];
        kontakMap = new Map();
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
    let riwayatBaru;
    let tanggalPayload;

    if (value > 0) {
        const labelStatus = tipe === "hadir" ? "Hadir" : "Tidak Hadir";
        const inputCatatan = await bukaModalCatatan(`Catatan untuk ${namaSiswa} (${labelStatus})`);
        if (inputCatatan === null) return;
        const catatanKetik = inputCatatan.trim() === "" ? "Update manual via counter" : inputCatatan.trim();

        // Waktu mengikuti pilihan Otomatis (sekarang) / Manual (tanggal + scroll jam) di modal catatan.
        const waktuTerpilihISO = getWaktuCounterTerpilih().toISOString();

        const statusCatatan = tipe === "hadir" ? "Hadir" : "Tidak Hadir";
        if (tipe === "hadir") {
            baruHadir += 1;
        } else {
            baruTidakHadir += 1;
        }

        riwayatBaru = tambahRiwayatCatatan(targetSiswa.riwayatCatatan, catatanKetik, waktuTerpilihISO, statusCatatan);
        tanggalPayload = waktuTerpilihISO;
        resetCounterWaktuInput();
    } else {
        const waktuSekarangISO = new Date().toISOString();
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
    if (!session) return false;

    if (!confirm(confirmText)) return false;

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
        return true;
    } catch (error) {
        console.error(error);
        alert("Gagal menghapus data dari Supabase: " + (error?.message || "Terjadi kesalahan."));
        if (btnDelete) {
            btnDelete.disabled = false;
            btnDelete.innerHTML = originalHtml || '<i class="fa fa-trash"></i>';
        }
        return false;
    }
}

// Menghapus nama siswa dari daftar kontak (Supabase) supaya nama tersebut
// tidak lagi muncul di dropdown pilihan nama pada form input absensi.
async function hapusKontakByNama(namaSiswa) {
    const namaBersih = normalizeNama(namaSiswa);
    if (!namaBersih) return false;

    try {
        const { error } = await supabaseClient
            .from(KONTAK_TABLE)
            .delete()
            .eq("nama", namaBersih);

        if (error) throw error;

        dataKontak = dataKontak.filter((k) => k.nama !== namaBersih);
        rebuildKontakMap();
        renderNamaOptions();
        return true;
    } catch (error) {
        console.error("Gagal menghapus kontak dari Supabase:", error);
        alert("Data absensi berhasil dihapus, tetapi nama gagal dihapus dari daftar pilihan: " + (error?.message || "Terjadi kesalahan."));
        return false;
    }
}

async function deleteRow(index) {
    const item = dataRekap[index];
    if (!item) return;
    await deleteSiswaByName(item.nama, index, `Hapus data rekap ${item.nama} dari sistem Supabase?`);
}

async function keluarkanSiswa(namaSiswa) {
    const berhasil = await deleteSiswaByName(
        namaSiswa,
        null,
        `Keluarkan siswa ${namaSiswa} dari les renang?\n\nData absensi akan dihapus dari rekap cloud, dan nama akan ikut dihapus dari daftar pilihan nama.`
    );

    // Nama baru dihapus dari daftar pilihan (dropdown) jika penghapusan data
    // absensi di atas benar-benar berhasil (bukan dibatalkan/gagal).
    if (berhasil) {
        await hapusKontakByNama(namaSiswa);
    }
}

// ===== Edit Nama Siswa =====
// Mengubah nama siswa di tabel rekap (absensinsc) sekaligus di daftar kontak
// (kontak), supaya nama tetap konsisten di seluruh sistem tanpa menghapus
// riwayat/catatan absensi yang sudah ada.
let editNamaIndex = null;

function bukaModalEditNama(index) {
    const item = dataRekap[index];
    if (!item) return;

    editNamaIndex = index;

    const overlay = $("modalEditNama");
    const input = $("editNamaInput");
    if (input) input.value = item.nama;
    if (overlay) overlay.classList.remove("hidden");
    setTimeout(() => input?.focus(), 50);
}

function tutupModalEditNama() {
    const overlay = $("modalEditNama");
    if (overlay) overlay.classList.add("hidden");
    editNamaIndex = null;
}

async function simpanEditNama() {
    const session = await requireSessionOrAlert();
    if (!session) return;

    if (editNamaIndex === null) return;
    const item = dataRekap[editNamaIndex];
    if (!item) return;

    const input = $("editNamaInput");
    const namaBaru = normalizeNama(input?.value || "");
    const namaLama = item.nama;

    if (!namaBaru) {
        alert("Nama tidak boleh kosong.");
        input?.focus();
        return;
    }

    if (namaBaru === namaLama) {
        tutupModalEditNama();
        return;
    }

    const sudahDipakai =
        dataRekap.some((row, idx) => idx !== editNamaIndex && row.nama === namaBaru) ||
        dataKontak.some((k) => k.nama === namaBaru);

    if (sudahDipakai) {
        alert(`Nama "${namaBaru}" sudah dipakai siswa lain. Silakan gunakan nama lain.`);
        input?.focus();
        return;
    }

    const btnSimpan = $("modalEditNamaSimpan");
    const originalHtml = btnSimpan ? btnSimpan.innerHTML : "";
    if (btnSimpan) {
        btnSimpan.disabled = true;
        btnSimpan.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Menyimpan...';
    }

    try {
        const { error: errorRekap } = await supabaseClient
            .from(TABLE_NAME)
            .update({ nama: namaBaru, absensi: namaBaru })
            .eq("absensi", namaLama);

        if (errorRekap) throw errorRekap;

        const kontakAda = dataKontak.some((k) => k.nama === namaLama);
        if (kontakAda) {
            const { error: errorKontak } = await supabaseClient
                .from(KONTAK_TABLE)
                .update({ nama: namaBaru })
                .eq("nama", namaLama);

            if (errorKontak) throw errorKontak;
        }

        dataRekap[editNamaIndex] = {
            ...item,
            nama: namaBaru,
            absensi: namaBaru
        };
        dataRekap.sort((a, b) => a.nama.localeCompare(b.nama, "id"));

        const kontakEntry = dataKontak.find((k) => k.nama === namaLama);
        if (kontakEntry) {
            kontakEntry.nama = namaBaru;
            dataKontak.sort((a, b) => a.nama.localeCompare(b.nama, "id"));
        }

        rebuildKontakMap();
        renderNamaOptions();
        saveCache();
        renderTable();
        tutupModalEditNama();
    } catch (error) {
        console.error(error);
        alert("Gagal mengubah nama di Supabase: " + (error?.message || "Terjadi kesalahan."));
    } finally {
        if (btnSimpan) {
            btnSimpan.disabled = false;
            btnSimpan.innerHTML = originalHtml;
        }
    }
}

function initModalEditNama() {
    const btnBatal = $("modalEditNamaBatal");
    const btnSimpan = $("modalEditNamaSimpan");
    const overlay = $("modalEditNama");
    const input = $("editNamaInput");

    if (btnBatal) btnBatal.addEventListener("click", () => tutupModalEditNama());
    if (overlay) {
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) tutupModalEditNama();
        });
    }
    if (btnSimpan) btnSimpan.addEventListener("click", () => simpanEditNama());
    if (input) {
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                simpanEditNama();
            }
        });
    }
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

        let waktuTerpilih;
        if (waktuAbsensiMode === "manual") {
            const tanggalManualVal = $("tanggalManual")?.value || "";
            if (!tanggalManualVal) {
                alert("Silakan pilih tanggal absensi terlebih dahulu!");
                setButtonLoading(btnSimpan, false, "", '<i class="fa fa-plus-circle"></i> Simpan Data');
                return;
            }
            if (jamManualTerpilih === null || menitManualTerpilih === null) {
                alert("Silakan pilih jam absensi terlebih dahulu!");
                setButtonLoading(btnSimpan, false, "", '<i class="fa fa-plus-circle"></i> Simpan Data');
                return;
            }
            const [tahun, bulan, tgl] = tanggalManualVal.split("-").map(Number);
            waktuTerpilih = new Date(tahun, bulan - 1, tgl, jamManualTerpilih, menitManualTerpilih, 0);
        } else {
            waktuTerpilih = new Date();
        }

        const waktuSekarangISO = waktuTerpilih.toISOString();
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

        // Simpan nama + no. HP ke daftar kontak (terpisah dari rekap absensi),
        // supaya tetap ada di dropdown walaupun catatan absensi ini nanti dihapus.
        try {
            await upsertKontak(nama, noHpFinal);
        } catch (kontakError) {
            console.warn("Gagal menyinkronkan ke daftar kontak:", kontakError);
        }

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
        resetWaktuAbsensiInput();

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

    const kelasSiswa = getKelasSiswa(item.nama);
    const targetSiswa = getTargetPertemuanKelas(kelasSiswa);

    const worksheetData = [
        ["LAPORAN ABSENSI INDIVIDU SISWA"],
        ["Nona Swimming Course (NSC)"],
        [],
        ["Komponen", "Keterangan"],
        ["Nama Siswa", item.nama],
        ["Kelas", kelasSiswa],
        ["No. HP Orang Tua", item.no_hp || "-"],
        ["Jumlah Kehadiran", `${item.hadir} Pertemuan`],
        ["Tidak Hadir", `${item.tidakHadir} Pertemuan`],
        ["Status Target", item.hadir >= targetSiswa ? "LENGKAP" : `${item.hadir}/${targetSiswa}`],
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
    const kelasTervalidasi = activeKelasTab;
    const daftarSiswa = getDataRekapByKelas(kelasTervalidasi);
    const target = getTargetPertemuanKelas(kelasTervalidasi);

    if (daftarSiswa.length === 0) {
        alert(`Tidak ada data untuk diekspor di Kelas ${kelasTervalidasi}!`);
        return;
    }

    const worksheetData = [
        ["LAPORAN REKAP TOTAL KEHADIRAN SISWA"],
        [`Nona Swimming Course (NSC) - Kelas ${kelasTervalidasi}`],
        [],
        ["Nama Siswa", "Hadir", "Tidak Hadir", "Rasio", "Tanggal Terbaru", "Catatan Terakhir", "No. HP"]
    ];

    daftarSiswa.forEach((item) => {
        worksheetData.push([
            item.nama,
            item.hadir,
            item.tidakHadir,
            item.hadir >= target ? "LENGKAP" : `${item.hadir}/${target}`,
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
    prosesUnduhFile(blob, `Rekap_Total_Absensi_NSC_${slugifyFileName(kelasTervalidasi)}.xlsx`);
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
    const kelasTervalidasi = activeKelasTab;
    const daftarSiswa = getDataRekapByKelas(kelasTervalidasi);

    if (daftarSiswa.length === 0) {
        alert(`Tidak ada data untuk diekspor di Kelas ${kelasTervalidasi}!`);
        return;
    }

    try {
        const blob = await buildTotalPdfBlob(kelasTervalidasi);
        downloadBlob(blob, `Rekap_Total_Absensi_NSC_${slugifyFileName(kelasTervalidasi)}.pdf`);
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

const kelasSiswaWA = getKelasSiswa(item.nama);
const targetSiswaWA = getTargetPertemuanKelas(kelasSiswaWA);
const pesanWAPDF = `Halo Bapak/Ibu, berikut laporan absensi Ananda *${item.nama}* di *Nona Swimming Course*.

Kelas: *${kelasSiswaWA}*
Status Kehadiran: *${item.hadir >= targetSiswaWA ? "LENGKAP" : `${item.hadir}/${targetSiswaWA}`}*
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
                // Nama dipilih dari daftar kontak yang sudah tersimpan -> no. HP otomatis terisi,
                // jadi tidak perlu mengetik ulang.
                const namaTerpilih = normalizeNama(value);
                const noHpEl = $("no_hp");
                if (noHpEl && kontakMap.has(namaTerpilih)) {
                    noHpEl.value = kontakMap.get(namaTerpilih)?.no_hp || "";
                }

                if (selectNamaControl) selectNamaControl.blur();
                document.activeElement?.blur?.();
            }
        }
    });
}

function initCatatanSelect() {
    const selectEl = $("catatan");
    if (!selectEl || selectCatatanControl) return;

    selectEl.innerHTML = buildCatatanOptionsHtml();

    // create: true -> boleh pilih dari dropdown ATAU ketik catatan manual bebas
    selectCatatanControl = new TomSelect("#catatan", {
        create: function (input, callback) {
            // Catatan manual otomatis diklasifikasikan ke kategori Gaya & Gerakan.
            // PENTING: TomSelect mengharapkan hasilnya dikirim lewat callback(data),
            // bukan di-return -- kalau di-return saja, kontrol akan terkunci
            // (lock) permanen dan catatan tidak pernah benar-benar tersimpan
            // sebagai nilai terpilih.
            callback(daftarkanCatatanBaru(input));
        },
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

let modalCatatanControl = null;
let modalCatatanResolve = null;

function initModalCatatanSelect() {
    const selectEl = $("modalCatatanSelect");
    if (!selectEl || modalCatatanControl) return;

    selectEl.innerHTML = buildCatatanOptionsHtml();

    modalCatatanControl = new TomSelect("#modalCatatanSelect", {
        create: function (input, callback) {
            // Catatan manual otomatis diklasifikasikan ke kategori Gaya & Gerakan.
            // PENTING: kirim hasilnya lewat callback(data), bukan return,
            // supaya TomSelect benar-benar melepas lock dan memilih item baru ini.
            callback(daftarkanCatatanBaru(input));
        },
        createOnBlur: true,
        allowEmptyOption: true,
        persist: false,
        placeholder: "Pilih catatan cepat atau ketik catatan manual..."
    });

    const btnBatal = $("modalCatatanBatal");
    const btnSimpan = $("modalCatatanSimpan");
    const overlay = $("modalCatatanCounter");

    if (btnBatal) btnBatal.addEventListener("click", () => tutupModalCatatan(null));
    if (btnSimpan) {
        btnSimpan.addEventListener("click", () => {
            if (counterWaktuMode === "manual") {
                const tanggalVal = $("tanggalCounterManual")?.value || "";
                if (!tanggalVal) {
                    alert("Silakan pilih tanggal terlebih dahulu!");
                    return;
                }
                if (counterJamTerpilih === null || counterMenitTerpilih === null) {
                    alert("Silakan pilih jam terlebih dahulu!");
                    return;
                }
            }
            const nilai = modalCatatanControl ? (modalCatatanControl.getValue() || "") : "";
            tutupModalCatatan(nilai);
        });
    }
    if (overlay) {
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) tutupModalCatatan(null);
        });
    }
}

// Membuka modal pilih/ketik catatan (dropdown + manual), mengganti prompt() bawaan browser.
// Mengembalikan Promise<string|null> -> null jika dibatalkan.
function bukaModalCatatan(judul) {
    return new Promise((resolve) => {
        const overlay = $("modalCatatanCounter");
        const titleEl = $("modalCatatanTitle");
        if (!overlay || !modalCatatanControl) {
            resolve(null);
            return;
        }

        if (titleEl) titleEl.innerText = judul;
        modalCatatanControl.clear(true);
        resetCounterWaktuInput();

        modalCatatanResolve = resolve;
        overlay.classList.remove("hidden");
        setTimeout(() => modalCatatanControl?.focus(), 50);
    });
}

function tutupModalCatatan(hasil) {
    const overlay = $("modalCatatanCounter");
    if (overlay) overlay.classList.add("hidden");

    if (modalCatatanResolve) {
        const resolveFn = modalCatatanResolve;
        modalCatatanResolve = null;
        resolveFn(hasil);
    }
}

function initModalKontakBaru() {
    const btnBatal = $("modalKontakBatal");
    const btnSimpan = $("modalKontakSimpan");
    const overlay = $("modalKontakBaru");

    if (btnBatal) btnBatal.addEventListener("click", () => tutupModalKontak());
    if (overlay) {
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) tutupModalKontak();
        });
    }

    if (btnSimpan) {
        const originalHtml = btnSimpan.innerHTML;
        btnSimpan.addEventListener("click", async () => {
            const session = await requireSessionOrAlert();
            if (!session) return;

            const namaInput = $("kontakNamaInput");
            const hpInput = $("kontakHpInput");
            const kelasInput = $("kontakKelasInput");
            const nama = normalizeNama(namaInput?.value || "");
            const noHp = (hpInput?.value || "").trim();
            const kelas = normalizeKelas(kelasInput?.value || KELAS_DEFAULT);

            if (!nama) {
                alert("Nama tidak boleh kosong.");
                namaInput?.focus();
                return;
            }

            btnSimpan.disabled = true;
            btnSimpan.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Menyimpan...';

            try {
                await upsertKontak(nama, noHp, kelas);

                if (selectNamaControl) {
                    selectNamaControl.setValue(nama, true);
                }
                const noHpEl = $("no_hp");
                if (noHpEl) noHpEl.value = kontakMap.get(nama)?.no_hp || noHp;

                if (namaInput) namaInput.value = "";
                if (hpInput) hpInput.value = "";
                if (kelasInput) kelasInput.value = KELAS_DEFAULT;

                tutupModalKontak();
            } catch (error) {
                console.error(error);
                alert("Gagal menyimpan kontak ke Supabase: " + (error?.message || "Terjadi kesalahan."));
            } finally {
                btnSimpan.disabled = false;
                btnSimpan.innerHTML = originalHtml;
            }
        });
    }
}

function bukaModalKontak() {
    const overlay = $("modalKontakBaru");
    if (!overlay) return;

    const namaInput = $("kontakNamaInput");
    const hpInput = $("kontakHpInput");
    const kelasInput = $("kontakKelasInput");

    // Prefill dari input nama utama jika sudah diketik tapi belum tersimpan sebagai kontak.
    if (namaInput) {
        const currentVal = selectNamaControl ? selectNamaControl.getValue() : "";
        const currentNama = normalizeNama(currentVal);
        namaInput.value = currentNama && !kontakMap.has(currentNama) ? currentNama : "";
    }
    if (hpInput) {
        hpInput.value = $("no_hp")?.value.trim() || "";
    }
    // Kontak baru selalu dimulai dari Kelas Prestasi (kelas evaluasi/percobaan).
    if (kelasInput) {
        kelasInput.value = KELAS_DEFAULT;
    }

    overlay.classList.remove("hidden");
    setTimeout(() => namaInput?.focus(), 50);
}

function tutupModalKontak() {
    const overlay = $("modalKontakBaru");
    if (overlay) overlay.classList.add("hidden");
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

/* ===== Waktu Absensi: toggle Otomatis / Manual + scroll picker jam ===== */

function setWaktuMode(mode) {
    waktuAbsensiMode = mode === "manual" ? "manual" : "otomatis";

    const btnOtomatis = $("btnModeOtomatis");
    const btnManual = $("btnModeManual");
    const fieldsWrap = $("waktuManualFields");

    btnOtomatis?.classList.toggle("active", waktuAbsensiMode === "otomatis");
    btnManual?.classList.toggle("active", waktuAbsensiMode === "manual");
    fieldsWrap?.classList.toggle("hidden", waktuAbsensiMode !== "manual");

    if (waktuAbsensiMode === "manual") {
        const tanggalEl = $("tanggalManual");
        if (tanggalEl && !tanggalEl.value) {
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, "0");
            const dd = String(now.getDate()).padStart(2, "0");
            tanggalEl.value = `${yyyy}-${mm}-${dd}`;
        }
    }
}

function resetWaktuAbsensiInput() {
    setWaktuMode("otomatis");
    jamManualTerpilih = null;
    menitManualTerpilih = null;
    if ($("tanggalManual")) $("tanggalManual").value = "";
    if ($("jamManualLabel")) $("jamManualLabel").innerText = "-- : --";
}

/* ===== Waktu untuk modal update counter (+/- di tabel rekap) ===== */

function setCounterWaktuMode(mode) {
    counterWaktuMode = mode === "manual" ? "manual" : "otomatis";

    const btnOtomatis = $("btnCounterModeOtomatis");
    const btnManual = $("btnCounterModeManual");
    const fieldsWrap = $("counterManualFields");

    btnOtomatis?.classList.toggle("active", counterWaktuMode === "otomatis");
    btnManual?.classList.toggle("active", counterWaktuMode === "manual");
    fieldsWrap?.classList.toggle("hidden", counterWaktuMode !== "manual");

    if (counterWaktuMode === "manual") {
        const tanggalEl = $("tanggalCounterManual");
        if (tanggalEl && !tanggalEl.value) {
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, "0");
            const dd = String(now.getDate()).padStart(2, "0");
            tanggalEl.value = `${yyyy}-${mm}-${dd}`;
        }
    }
}

function resetCounterWaktuInput() {
    setCounterWaktuMode("otomatis");
    counterJamTerpilih = null;
    counterMenitTerpilih = null;
    if ($("tanggalCounterManual")) $("tanggalCounterManual").value = "";
    if ($("jamCounterManualLabel")) $("jamCounterManualLabel").innerText = "-- : --";
}

// Menentukan Date final untuk update counter, sesuai mode Otomatis/Manual yang dipilih di modal catatan.
function getWaktuCounterTerpilih() {
    if (counterWaktuMode === "manual") {
        const tanggalVal = $("tanggalCounterManual")?.value || "";
        if (tanggalVal && counterJamTerpilih !== null && counterMenitTerpilih !== null) {
            const [tahun, bulan, tgl] = tanggalVal.split("-").map(Number);
            return new Date(tahun, bulan - 1, tgl, counterJamTerpilih, counterMenitTerpilih, 0);
        }
    }
    return new Date();
}

function buatKolomJamPicker(containerId, jumlah, nilaiTerpilih) {
    const container = $(containerId);
    if (!container) return;

    let html = "";
    for (let i = 0; i < jumlah; i++) {
        html += `<div class="jam-picker-item" data-value="${i}">${String(i).padStart(2, "0")}</div>`;
    }
    container.innerHTML = html;

    container.querySelectorAll(".jam-picker-item").forEach((el) => {
        el.addEventListener("click", () => {
            el.scrollIntoView({ block: "center", behavior: "smooth" });
        });
    });

    let scrollTimer = null;
    container.addEventListener("scroll", () => {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            tandaiItemAktif(container);
        }, 100);
    });

    // Set posisi awal (default: jam/menit sekarang jika belum ada pilihan)
    const startIndex = nilaiTerpilih !== null && nilaiTerpilih !== undefined ? nilaiTerpilih : 0;
    container.scrollTop = startIndex * JAM_PICKER_ITEM_HEIGHT;
    tandaiItemAktif(container);
}

// Nilai sementara hasil scroll, dibaca oleh callback saat tombol "Pilih Jam" ditekan.
let jamPickerTempJam = null;
let jamPickerTempMenit = null;
let jamPickerOnConfirm = null;

function tandaiItemAktif(container) {
    if (!container) return;
    const index = Math.round(container.scrollTop / JAM_PICKER_ITEM_HEIGHT);
    const items = container.querySelectorAll(".jam-picker-item");
    items.forEach((el, i) => el.classList.toggle("active", i === index));

    if (container.id === "scrollJam") jamPickerTempJam = index;
    if (container.id === "scrollMenit") jamPickerTempMenit = index;
}

// Modal jam dipakai bersama (form input & update counter). onConfirm(jam, menit) dipanggil saat "Pilih Jam" ditekan.
function bukaModalJamGeneric(jamAwal, menitAwal, onConfirm) {
    const overlay = $("modalJamPicker");
    if (!overlay) return;

    jamPickerOnConfirm = onConfirm;
    buatKolomJamPicker("scrollJam", 24, jamAwal);
    buatKolomJamPicker("scrollMenit", 60, menitAwal);

    overlay.classList.remove("hidden");
}

function bukaModalJam() {
    const now = new Date();
    const jamAwal = jamManualTerpilih !== null ? jamManualTerpilih : now.getHours();
    const menitAwal = menitManualTerpilih !== null ? menitManualTerpilih : now.getMinutes();

    bukaModalJamGeneric(jamAwal, menitAwal, (jam, menit) => {
        jamManualTerpilih = jam;
        menitManualTerpilih = menit;
        if ($("jamManualLabel")) {
            $("jamManualLabel").innerText = `${String(jam).padStart(2, "0")} : ${String(menit).padStart(2, "0")}`;
        }
    });
}

function bukaModalJamCounter() {
    const now = new Date();
    const jamAwal = counterJamTerpilih !== null ? counterJamTerpilih : now.getHours();
    const menitAwal = counterMenitTerpilih !== null ? counterMenitTerpilih : now.getMinutes();

    bukaModalJamGeneric(jamAwal, menitAwal, (jam, menit) => {
        counterJamTerpilih = jam;
        counterMenitTerpilih = menit;
        if ($("jamCounterManualLabel")) {
            $("jamCounterManualLabel").innerText = `${String(jam).padStart(2, "0")} : ${String(menit).padStart(2, "0")}`;
        }
    });
}

function tutupModalJam() {
    const overlay = $("modalJamPicker");
    if (overlay) overlay.classList.add("hidden");
}

function initModalJamPicker() {
    const overlay = $("modalJamPicker");
    const btnBatal = $("modalJamBatal");
    const btnSimpanJam = $("modalJamSimpan");

    if (overlay) {
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) tutupModalJam();
        });
    }

    if (btnBatal) {
        btnBatal.addEventListener("click", tutupModalJam);
    }

    if (btnSimpanJam) {
        btnSimpanJam.addEventListener("click", () => {
            const scrollJamEl = $("scrollJam");
            const scrollMenitEl = $("scrollMenit");
            if (scrollJamEl) tandaiItemAktif(scrollJamEl);
            if (scrollMenitEl) tandaiItemAktif(scrollMenitEl);

            const jam = jamPickerTempJam ?? 0;
            const menit = jamPickerTempMenit ?? 0;
            if (typeof jamPickerOnConfirm === "function") {
                jamPickerOnConfirm(jam, menit);
            }
            tutupModalJam();
        });
    }
}

function initTanggalManualClick() {
    [$("tanggalManual"), $("tanggalCounterManual")].forEach((tanggalEl) => {
        if (!tanggalEl) return;
        tanggalEl.addEventListener("click", () => {
            if (typeof tanggalEl.showPicker === "function") {
                try {
                    tanggalEl.showPicker();
                } catch (e) {
                    /* Browser tidak mendukung showPicker(), abaikan */
                }
            }
        });
    });
}

document.addEventListener("DOMContentLoaded", async function () {
    initNamaSelect();
    initCatatanSelect();
    initModalCatatanSelect();
    initModalKontakBaru();
    initModalEditNama();
    initModalJamPicker();
    initTanggalManualClick();
    updateJamRealtime();
    setInterval(updateJamRealtime, 1000);
    await checkLoginSession();
});
