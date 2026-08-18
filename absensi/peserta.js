// ======================================================================
// PORTAL PESERTA - Absensi NSC
// Halaman ini TERPISAH dari login admin/pelatih (index.html).
// Peserta/orang tua cukup memasukkan 1 "Password Peserta" bersama,
// lalu memilih nama anaknya dari daftar untuk melihat catatan.
//
// PENTING (baca sebelum dipakai):
// 1. Ganti PESERTA_PASSWORD di bawah ini dengan password pilihan Anda.
// 2. Password ini HANYA gerbang tampilan di sisi browser (bukan akun
//    Supabase Auth sungguhan) - siapa pun yang membuka kode halaman ini
//    bisa melihat teksnya. Jangan pakai password yang sama dengan
//    password admin/pelatih atau password penting lain.
// 3. Supaya peserta bisa membaca data TANPA login admin, tabel di
//    Supabase perlu policy Row Level Security yang mengizinkan SELECT
//    untuk role "anon". Lihat catatan SQL di akhir file/README.
// ======================================================================

const PESERTA_PASSWORD = "GANTI_PASSWORD_PESERTA"; // <-- WAJIB diganti

const SUPABASE_URL = "https://mjfwgmhuengvfdagbcsk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZndnbWh1ZW5ndmZkYWdiY3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMDczMTMsImV4cCI6MjA5Njg4MzMxM30.NxZY9zHP9zQmHRsgpcGZyk3t7_xaGFFuTa3bYIAD384";
const TABLE_NAME = "absensinsc";
const KONTAK_TABLE = "kontak";
const SESSION_KEY = "nsc_peserta_session";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const namaHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const CATATAN_HISTORY_PREFIX = "NSC_CATATAN_HISTORY_V1:";

let pesertaNamaControl = null;

function $(id) {
    return document.getElementById(id);
}

// ===== Gerbang password peserta =====

function togglePesertaPasswordVisibility() {
    const input = $("pesertaPassword");
    const icon = $("pesertaEyeIcon");
    if (!input || !icon) return;

    if (input.type === "password") {
        input.type = "text";
        icon.classList.replace("fa-eye", "fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.replace("fa-eye-slash", "fa-eye");
    }
}

function handlePesertaLogin(event) {
    event.preventDefault();
    const input = $("pesertaPassword");
    const error = $("pesertaGateError");
    const masukan = String(input?.value ?? "").trim();

    if (masukan && masukan === PESERTA_PASSWORD) {
        error?.classList.add("hidden");
        sessionStorage.setItem(SESSION_KEY, "1");
        tampilkanKontenPeserta();
    } else {
        error?.classList.remove("hidden");
    }
    return false;
}

function handlePesertaLogout() {
    sessionStorage.removeItem(SESSION_KEY);
    $("pesertaContent")?.classList.add("hidden");
    $("pesertaGate")?.classList.remove("hidden");
    const input = $("pesertaPassword");
    if (input) input.value = "";
}

function tampilkanKontenPeserta() {
    $("pesertaGate")?.classList.add("hidden");
    $("pesertaContent")?.classList.remove("hidden");
    muatDaftarNamaPeserta();
}

// ===== Daftar nama (untuk selection) =====

async function muatDaftarNamaPeserta() {
    const selectEl = $("pesertaNama");
    if (!selectEl) return;

    if (!pesertaNamaControl) {
        pesertaNamaControl = new TomSelect(selectEl, {
            create: false,
            maxItems: 1,
            placeholder: "Ketik atau pilih nama siswa...",
            onChange: function (value) {
                if (value) tampilkanCatatanUntukNama(value);
            }
        });
    }

    try {
        const { data, error } = await supabaseClient
            .from(KONTAK_TABLE)
            .select("nama")
            .order("nama", { ascending: true });

        if (error) throw error;

        pesertaNamaControl.clearOptions();
        pesertaNamaControl.addOption({ value: "", text: "" });
        (data || []).forEach((row) => {
            const nama = String(row?.nama ?? "").trim();
            if (nama) pesertaNamaControl.addOption({ value: nama, text: nama });
        });
        pesertaNamaControl.refreshOptions(false);
    } catch (error) {
        console.error("Gagal memuat daftar nama peserta:", error);
        alert("Gagal memuat daftar nama. Pastikan koneksi internet aktif, lalu coba lagi.");
    }
}

// ===== Catatan untuk 1 nama terpilih =====

function normalizeRiwayatCatatan(list, fallbackTanggal) {
    if (!Array.isArray(list)) return [];
    return list
        .map((entry) => {
            if (typeof entry === "string") {
                const teks = entry.trim();
                if (!teks) return null;
                return { tanggal: fallbackTanggal, waktu: formatWaktuIndonesia(fallbackTanggal), status: "", catatan: teks };
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
        .filter(Boolean);
}

function parseCatatanHistory(rawCatatan, fallbackTanggal) {
    const teks = String(rawCatatan ?? "").trim();
    if (!teks) return [];

    if (teks.startsWith(CATATAN_HISTORY_PREFIX)) {
        try {
            const parsed = JSON.parse(teks.slice(CATATAN_HISTORY_PREFIX.length));
            return normalizeRiwayatCatatan(parsed, fallbackTanggal);
        } catch (error) {
            console.warn("Riwayat catatan gagal dibaca:", error);
            return [];
        }
    }

    try {
        const parsed = JSON.parse(teks);
        if (Array.isArray(parsed)) return normalizeRiwayatCatatan(parsed, fallbackTanggal);
        if (parsed && Array.isArray(parsed.riwayat)) return normalizeRiwayatCatatan(parsed.riwayat, fallbackTanggal);
    } catch (error) {
        // bukan JSON -> anggap catatan teks polos satu baris
        return [{ tanggal: fallbackTanggal, waktu: formatWaktuIndonesia(fallbackTanggal), status: "", catatan: teks }];
    }

    return [];
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

function formatWaktuIndonesia(timestamp) {
    if (!timestamp) return "-";
    const dateObj = new Date(timestamp);
    if (Number.isNaN(dateObj.getTime())) return "-";
    const jam = String(dateObj.getHours()).padStart(2, "0");
    const menit = String(dateObj.getMinutes()).padStart(2, "0");
    return `${jam}.${menit} WIB`;
}

function toInt(value) {
    const hasil = parseInt(value, 10);
    return Number.isFinite(hasil) ? hasil : 0;
}

async function tampilkanCatatanUntukNama(nama) {
    const hasilCard = $("pesertaHasil");
    const kosongCard = $("pesertaKosong");
    const tbody = $("pesertaTbody");

    hasilCard?.classList.add("hidden");
    kosongCard?.classList.add("hidden");
    if (tbody) tbody.innerHTML = `<tr><td colspan="4" class="table-empty"><i class="fa fa-spinner fa-spin"></i> Memuat catatan...</td></tr>`;
    hasilCard?.classList.remove("hidden");

    try {
        const { data, error } = await supabaseClient
            .from(TABLE_NAME)
            .select("*")
            .eq("nama", nama)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            hasilCard?.classList.add("hidden");
            kosongCard?.classList.remove("hidden");
            return;
        }

        const fallbackTanggal = data.tanggal || data.created_at || new Date().toISOString();
        const riwayat = parseCatatanHistory(data.catatan, fallbackTanggal);
        const hadir = toInt(data.hadir);
        const tidakHadir = toInt(data.tidak_hadir);

        $("pesertaNamaTerpilih").textContent = nama;
        $("pesertaRingkasan").textContent = `Hadir: ${hadir}  |  Tidak Hadir: ${tidakHadir}  |  Total: ${hadir + tidakHadir} pertemuan`;

        if (riwayat.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="table-empty">Belum ada catatan untuk siswa ini.</td></tr>`;
            return;
        }

        tbody.innerHTML = riwayat
            .slice()
            .reverse() // catatan terbaru di atas
            .map((entry) => {
                const statusClass = entry.status === "Hadir" ? "status-hadir" : (entry.status === "Tidak Hadir" ? "status-tidak" : "");
                const statusText = entry.status || "-";
                return `
                    <tr>
                        <td>${formatTanggalIndonesia(entry.tanggal)}</td>
                        <td>${entry.waktu || "-"}</td>
                        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                        <td>${entry.catatan ? escapeHtml(entry.catatan) : "-"}</td>
                    </tr>
                `;
            })
            .join("");
    } catch (error) {
        console.error("Gagal memuat catatan peserta:", error);
        tbody.innerHTML = `<tr><td colspan="4" class="table-empty">Gagal memuat catatan. Coba lagi beberapa saat.</td></tr>`;
    }
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// ===== Inisialisasi halaman =====

document.addEventListener("DOMContentLoaded", () => {
    // Sesi peserta hanya bertahan selama tab ini terbuka (sessionStorage),
    // supaya tidak perlu masukkan password tiap ganti nama, tapi tetap
    // otomatis "keluar" saat tab ditutup.
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
        tampilkanKontenPeserta();
    }
});
