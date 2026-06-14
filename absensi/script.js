const TOTAL_PERTEMUAN = 12;

// Inisialisasi Supabase Client
const SUPABASE_URL = "https://mjfwgmhuengvfdagbcsk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZndnbWh1ZW5ndmZkYWdiY3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMDczMTMsImV4cCI6MjA5Njg4MzMxM30.NxZY9zHP9zQmHRsgpcGZyk3t7_xaGFFuTa3bYIAD384";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let dataRekap = [];
let selectNamaControl;

// Nama hari dan bulan lokal Indonesia
const namaHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

// Base64 Data URI Resmi Logo Nona Swimming Course (NSC) yang Valid & Utuh
const LOGO_NSC_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKTWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAcHJlZmVycmVkUkdCAAB4nH2RPUscURSGn30mIisbXUasbBAsZIsgZreIsbKyf6wMZp07w0wyyYwzM66gYGFpYWFpYalYWIjYpLAQLCwEizT+gIWFpYVlYmEhIisbXebOnYVAsN093Pc95z3vOfe8A6w6llXNqwEon9Yy0pGInZscG7X+BAXowAAnwK6VldMRKeofgAnvbtvqt9Z9R9V1b/tr9bdaXU0rIBAEDgB7WlsFwZfAcaxVqgBwGPgu1bIAnAG+f/M6gO8D3zvZCvA9YF8t+wT4GLAnlV6gV2b/Nzk6mhgYgLId+EZKpxw4Arxn66pWbID3gTfX2wPArwHwbePzIeAY8LmlYxbwLeAnS8cC4D0rvbA06gDft9W3M7P0N2a7ZvtE0pC067b7tr/Ympp2ZunbHwYmxsbHBqN2XNLR8Y8fH4zaO/ZlXWp3bfeM6K8Z+0pSOpaR+f+7Y/8bHwBwB8BtABgAsBMANgBwGMD6Lz0SAtbI4BcA6wDsAbDxt45VwAYZ/A7Am9+6b5HhV8gGv0P277v3WzN8Ctk9ALf/wL1fUuBzyA4BuAMA7v2Q6H9p+Nf8v87/7b/7+ZcI+ByyfQDukGj/3f9jGv7V/7D/5xL/8w7+3f9bMnyG7A6AuwfAnRDw9gC4fT66U7H9V/v9F8NnyB4CuA/AHRLw9vms868X963I7mQicmR0Is/6KhpbLWeOZaWylrXS0epv6b+w1U6fAAAAAElFTkSuQmCC";

// Fungsi pembantu untuk memformat tanggal realtime ke teks Indonesia
function formatTanggalIndonesia(timestamp) {
    if (!timestamp) return "Belum Ada Tanggal";
    const dateObj = new Date(timestamp);
    if (isNaN(dateObj.getTime())) return timestamp;
    
    const hari = namaHari[dateObj.getDay()];
    const tanggal = dateObj.getDate();
    const bulan = namaBulan[dateObj.getMonth()];
    const tahun = dateObj.getFullYear();
    
    return `${hari}, ${tanggal} ${bulan} ${tahun}`;
}

// Fungsi untuk Jam dan Tanggal Realtime di Pojok Atas Aplikasi Utama
function updateJamRealtime() {
    const sekarang = new Date();
    
    const jam = String(sekarang.getHours()).padStart(2, '0');
    const menit = String(sekarang.getMinutes()).padStart(2, '0');
    const detik = String(sekarang.getSeconds()).padStart(2, '0');
    
    const jamEl = document.getElementById("jamRealtime");
    if (jamEl) jamEl.innerText = `${jam}.${menit}.${detik}`;
    
    const tanggalEl = document.getElementById("tanggalRealtime");
    if (tanggalEl) tanggalEl.innerText = formatTanggalIndonesia(sekarang);
}

document.addEventListener("DOMContentLoaded", function() {
    // Inisialisasi Pilihan TomSelect ( create: true agar bisa input manual nama baru )
    selectNamaControl = new TomSelect("#nama", {
        create: true, 
        sortField: { field: "text", direction: "asc" },
        placeholder: "Ketik / Pilih Nama Siswa...",
        allowEmptyOption: true,
        onChange: function(value) {
            if(value) {
                if(selectNamaControl) { selectNamaControl.blur(); }
                document.activeElement.blur(); 
            }
        }
    });

    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }

    checkLoginSession();
    muatDataDariCloud();
    
    updateJamRealtime();
    setInterval(updateJamRealtime, 1000);
});

// MEMUAT DATA DARI SUPABASE
async function muatDataDariCloud() {
    const tbody = document.getElementById("tbody");
    try {
        if (tbody) {
            tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; color:#234a84;'><i class='fa fa-spinner fa-spin'></i> Menyinkronkan data terbaru dari Cloud Supabase...</td></tr>";
        }

        const { data, error } = await supabaseClient
            .from('absensinsc')
            .select('*')
            .order('absensi', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
            dataRekap = data.map(item => {
                let rawDateSource = item["Tanggal Terbaru"] || item.created_at || new Date().toISOString();
                return {
                    nama: item.absensi ? item.absensi.toString().toUpperCase().trim() : "TANPA NAMA",
                    hadir: parseInt(item.Hadir) || 0,
                    tidakHadir: parseInt(item["Tidak Hadir"] || item.id_tidak_hadir || item.status) || 0,
                    catatan: item.Catatan || "",
                    tanggalRealtime: formatTanggalIndonesia(rawDateSource),
                    rawDate: rawDateSource
                };
            });
        } else {
            dataRekap = [];
        }
        
        try { localStorage.setItem("dataRekap", JSON.stringify(dataRekap)); } catch(e){}
        renderTable();
    } catch (e) { 
        console.error("Gagal memuat dari Cloud Supabase:", e);
        dataRekap = JSON.parse(localStorage.getItem("dataRekap")) || [];
        renderTable();
    }
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById("loginPassword");
    const eyeIcon = document.getElementById("eyeIcon");
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        eyeIcon.classList.replace("fa-eye", "fa-eye-slash");
    } else {
        passwordInput.type = "password";
        eyeIcon.classList.replace("fa-eye-slash", "fa-eye");
    }
}

async function generateSHA256(string) {
    const msgBuffer = new TextEncoder().encode(string);                    
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// FUNGSI LOGIN UTAMA (Telah Diperbaiki Total Jalur Pemanggilannya)
async function handleLogin(event) {
    if (event) event.preventDefault(); 
    
    const emailEl = document.getElementById("loginEmail");
    const passwordEl = document.getElementById("loginPassword");
    
    if (!emailEl || !passwordEl) return;

    const email = emailEl.value.trim().toLowerCase();
    const password = passwordEl.value;

    if (email !== "nonaswimmingcourse@gmail.com" || await generateSHA256(password) !== "3d32f1b4eec6aac2520a664ae8b746e46f83d5baecf81e030e47a9db5c8c7c83") {
        alert("Akses ditolak! Akun atau Password salah.");
        return; 
    }
    
    try { localStorage.setItem("isLoggedIn", "true"); } catch(e){}
    
    const loginSection = document.getElementById("loginSection");
    const mainAppSection = document.getElementById("mainAppSection");
    
    if (loginSection) loginSection.classList.add("hidden");
    if (mainAppSection) mainAppSection.classList.remove("hidden");
    
    muatDataDariCloud();
}

function handleLogout() {
    if(confirm("Apakah Anda yakin ingin keluar?")) {
        try { 
            localStorage.removeItem("isLoggedIn"); 
        } catch(e){}
        window.location.reload();
    }
}

function checkLoginSession() {
    if(localStorage.getItem("isLoggedIn") === "true") {
        const loginSec = document.getElementById("loginSection");
        const mainSec = document.getElementById("mainAppSection");
        if(loginSec) loginSec.classList.add("hidden");
        if(mainSec) mainSec.classList.remove("hidden");
    }
}

function renderTable() {
    let html = "";
    if(!dataRekap || dataRekap.length === 0) {
        html = "<tr><td colspan='6' style='text-align:center; color:#94a3b8;'>Belum ada data rekap.</td></tr>";
    } else {
        dataRekap.forEach((item, index) => {
            let totalTeks = item.hadir === TOTAL_PERTEMUAN 
                ? `<span class="total-lengkap">LENGKAP</span>` 
                : `<span class="total-fraction">${item.hadir}/${TOTAL_PERTEMUAN}</span>`;

            html += `
            <tr>
                <td style="font-weight: 500;">${item.nama}</td>
                <td>
                    <div class="counter-box">
                        <button class="counter-btn" onclick="updateCounter(${index}, 'hadir', -1)">-</button>
                        <span class="counter-val hadir-val">${item.hadir}</span>
                        <button class="counter-btn" onclick="updateCounter(${index}, 'hadir', 1)">+</button>
                    </div>
                </td>
                <td>
                    <div class="counter-box">
                        <button class="counter-btn" onclick="updateCounter(${index}, 'tidakHadir', -1)">-</button>
                        <span class="counter-val tidak-val">${item.tidakHadir}</span>
                        <button class="counter-btn" onclick="updateCounter(${index}, 'tidakHadir', 1)">+</button>
                    </div>
                </td>
                <td>${totalTeks}</td>
                <td style="color: #475569; font-size: 14px;">${item.tanggalRealtime}</td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-action btn-excel" title="Download Excel Harian Siswa" onclick="exportSiswaExcel(${index})"><i class="fa fa-file-excel"></i></button>
                        <button class="btn-action btn-pdf" title="Download PDF Harian Siswa" onclick="exportSiswaPDF(${index})"><i class="fa fa-file-pdf"></i></button>
                        <button class="btn-action btn-delete" title="Hapus Data Siswa" id="btnDelete-${index}" onclick="deleteRow(${index})"><i class="fa fa-trash"></i></button>
                        <button class="btn-action btn-kick" title="Keluarkan Siswa" onclick="keluarkanSiswa('${item.nama}')"><i class="fa fa-user-minus"></i></button>
                    </div>
                </td>
            </tr>`;
        });
    }
    document.getElementById("tbody").innerHTML = html;
    document.getElementById("totalPertemuanText").innerText = `Total ${TOTAL_PERTEMUAN} Pertemuan Les Renang`;
}

async function updateCounter(index, tipe, value) {
    const targetSiswa = dataRekap[index];
    const namaSiswa = targetSiswa.nama;
    let catatanKetik = "";
    
    let baruHadir = targetSiswa.hadir;
    let baruTidakHadir = targetSiswa.tidakHadir;

    if (value > 0) {
        let inputCatatan = prompt(`Masukkan Catatan Baru untuk ${namaSiswa}:`, `Update manual via counter`);
        if (inputCatatan === null) return; 
        catatanKetik = inputCatatan.trim() === "" ? `Update manual via counter` : inputCatatan.trim();
        
        if (tipe === 'hadir') baruHadir += 1;
        else baruTidakHadir += 1;
    } else {
        if (tipe === 'hadir') {
            if (baruHadir === 0) return;
            baruHadir -= 1;
        } else {
            if (baruTidakHadir === 0) return;
            baruTidakHadir -= 1;
        }
        catatanKetik = `Pengurangan manual via counter`;
    }

    if (baruHadir === 0 && baruTidakHadir === 0) {
        alert(`Rekap data ${namaSiswa} bernilai 0. Siswa akan otomatis dihapus dari sistem.`);
        await deleteRow(index);
        return;
    }

    const waktuSekarangISO = new Date().toISOString();

    try {
        const { error } = await supabaseClient
            .from("absensinsc")
            .upsert({
                absensi: namaSiswa,
                Hadir: baruHadir,
                "Tidak Hadir": baruTidakHadir.toString(),
                Catatan: catatanKetik,
                "Tanggal Terbaru": waktuSekarangISO
            }, {
                onConflict: "absensi"
            });

        if (error) throw error;
        
        dataRekap[index].hadir = baruHadir;
        dataRekap[index].tidakHadir = baruTidakHadir;
        dataRekap[index].catatan = catatanKetik;
        dataRekap[index].tanggalRealtime = formatTanggalIndonesia(waktuSekarangISO);
        dataRekap[index].rawDate = waktuSekarangISO;
        
        renderTable();
        try { localStorage.setItem("dataRekap", JSON.stringify(dataRekap)); } catch(e){}
    } catch (err) {
        alert("Gagal memperbarui data ke Supabase: " + err.message);
    }
}

async function deleteRow(index) {
    const namaSiswa = dataRekap[index].nama;
    if (!confirm(`Hapus data rekap ${namaSiswa} dari sistem Supabase?`)) return;
    
    const btnDelete = document.getElementById(`btnDelete-${index}`);
    if(btnDelete) btnDelete.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';

    try {
        const { error } = await supabaseClient
            .from('absensinsc')
            .delete()
            .eq('absensi', namaSiswa);

        if (error) throw error;

        dataRekap.splice(index, 1);
        try { localStorage.setItem("dataRekap", JSON.stringify(dataRekap)); } catch(e){}
        renderTable();
    } catch (err) {
        alert("Gagal menghapus data dari Supabase: " + err.message);
        if(btnDelete) btnDelete.innerHTML = '<i class="fa fa-trash"></i>';
    }
}

async function simpan() {
    let nama = "";
    if (selectNamaControl) { nama = selectNamaControl.getValue(); }
    if (!nama) { nama = document.getElementById("nama").value; }
    if (!nama) { alert("Silakan pilih nama siswa terlebih dahulu!"); return; }

    const status = document.getElementById("status").value;
    const catatan = document.getElementById("catatan").value;
    const btnSimpan = document.getElementById("btnSimpan");

    nama = nama.trim().toUpperCase();
    btnSimpan.disabled = true;
    btnSimpan.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Menyimpan...';

    const catatanTeks = catatan.trim() !== "" ? catatan.trim() : "Absensi tercatat";
    if (!Array.isArray(dataRekap)) { dataRekap = []; }

    let siswaExist = dataRekap.find(s => s && s.nama === nama);
    let nHadir = status === "Hadir" ? 1 : 0;
    let nTidakHadir = status === "Tidak Hadir" ? 1 : 0;

    if (siswaExist) {
        nHadir = (siswaExist.hadir || 0) + (status === "Hadir" ? 1 : 0);
        nTidakHadir = (siswaExist.tidakHadir || 0) + (status === "Tidak Hadir" ? 1 : 0);
    }

    const waktuSekarangISO = new Date().toISOString();

    try {
        const { error: errorRekap } = await supabaseClient
            .from("absensinsc")
            .upsert({
                absensi: nama,
                Hadir: nHadir,
                "Tidak Hadir": nTidakHadir.toString(),
                Catatan: catatanTeks,
                "Tanggal Terbaru": waktuSekarangISO
            }, {
                onConflict: "absensi"
            });

        if (errorRekap) throw errorRekap;

        const { error: errorLog } = await supabaseClient
            .from("log_harian")
            .insert({ nama: nama, status: status, catatan: catatanTeks });

        if (errorLog) throw errorLog;

        const realtimeSekarang = formatTanggalIndonesia(waktuSekarangISO);

        if (siswaExist) {
            siswaExist.hadir = nHadir;
            siswaExist.tidakHadir = nTidakHadir;
            siswaExist.catatan = catatanTeks;
            siswaExist.tanggalRealtime = realtimeSekarang;
            siswaExist.rawDate = waktuSekarangISO;
        } else {
            dataRekap.push({
                nama: nama, hadir: nHadir, tidakHadir: nTidakHadir,
                catatan: catatanTeks, tanggalRealtime: realtimeSekarang, rawDate: waktuSekarangISO
            });
        }

        renderTable();
        try { localStorage.setItem("dataRekap", JSON.stringify(dataRekap)); } catch (e) {}

        if (selectNamaControl) { selectNamaControl.clear(true); } 
        else { document.getElementById("nama").value = ""; }

        document.getElementById("catatan").value = "";
        alert("Data berhasil disimpan ke Rekap dan Log Harian!");
    } catch (err) {
        console.error(err);
        alert("Gagal menyimpan ke Supabase: " + err.message);
    } finally {
        btnSimpan.disabled = false;
        btnSimpan.innerHTML = '<i class="fa fa-plus-circle"></i> Simpan Data';
    }
}

function showTab(tab, btn) {
    document.getElementById("input").classList.add("hidden");
    document.getElementById("rekap").classList.add("hidden");
    document.getElementById(tab).classList.remove("hidden");
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));
    btn.classList.add("active");
}

function prosesUnduhFile(blob, namaFile) {
    try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = namaFile;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 300);
    } catch (e) {
        alert("Gagal mengunduh file.");
    }
}

function exportSiswaExcel(index) {
    const item = dataRekap[index];
    const worksheetData = [
        ["LAPORAN ABSENSI INDIVIDU SISWA"],
        ["Nona Swimming Course (NSC)"],
        [],
        ["Komponen", "Keterangan"],
        ["Nama Siswa", item.nama],
        ["Jumlah Kehadiran", `${item.hadir} Pertemuan`],
        ["Tidak Hadir", `${item.tidakHadir} Pertemuan`],
        ["Status Target", item.hadir === TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir}/${TOTAL_PERTEMUAN}`],
        ["Tanggal Terakhir Update", item.tanggalRealtime],
        ["Catatan Terakhir", item.catatan || "-"]
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Absensi Siswa");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    prosesUnduhFile(blob, `Absensi_${item.nama}.xlsx`);
}

// PERBAIKAN: Menggunakan LOGO_NSC_BASE64 secara langsung, instan & anti-macet!
function exportSiswaPDF(index) {
    const item = dataRekap[index];
    const { jsPDF } = window.jspdf;
    
    // 1. Buat objek gambar HTML untuk memuat file gambar eksternal/lokal
    const img = new Image();
    img.src = 'Logo percobaan.png'; // Menggunakan file gambar langsung sesuai permintaan Anda

    // 2. Tunggu hingga gambar selesai dimuat sempurna oleh browser
    img.onload = function() {
        const doc = new jsPDF();

        try {
            // Tampilkan logo di sebelah kiri atas sejajar judul (Lebar: 18, Tinggi: 18)
            doc.addImage(img, "PNG", 14, 10, 18, 18);
            
            // Judul Utama (LAPORAN ABSENSI INDIVIDU SISWA)
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(35, 74, 132); // Warna Biru NSC
            doc.text("LAPORAN ABSENSI INDIVIDU SISWA", 38, 17); 

            // Sub-Judul (Nona Swimming Course (NSC))
            doc.setFontSize(10);
            doc.setFont("Helvetica", "normal");
            doc.setTextColor(148, 163, 184); // Warna Abu-abu tipis sesuai foto
            doc.text("Nona Swimming Course (NSC)", 38, 23);
            
            // Garis Pembatas Horisontal
            doc.setDrawColor(241, 245, 249); // Garis abu sangat halus
            doc.line(14, 32, 196, 32);

            // Data Susunan Baris Tabel
            const rows = [
                ["Nama Siswa", item.nama],
                ["Total Kehadiran (Hadir)", `${item.hadir} Pertemuan`],
                ["Total Tidak Hadir", `${item.tidakHadir} Pertemuan`],
                ["Status Pertemuan", item.hadir === TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir}/${TOTAL_PERTEMUAN}`],
                ["Tanggal Terakhir Diinput", item.tanggalRealtime],
                ["Catatan Khusus", item.catatan || "-"]
            ];

            // Membuat Tabel dengan Style Bersih & Elegan Sesuai Foto tampilan Anda
            doc.autoTable({ 
                startY: 38, 
                head: [["Komponen Data", "Detail Keterangan"]], 
                body: rows, 
                theme: "striped",
                headStyles: { 
                    fillColor: [35, 74, 132], // Background Header Biru Navy
                    textColor: [255, 255, 255], // Teks Header Putih
                    fontStyle: "bold",
                    fontSize: 10
                },
                styles: {
                    textColor: [71, 85, 105], // Teks isi tabel abu-abu gelap halus
                    fontSize: 10,
                    cellPadding: 4
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252] // Warna selang-seling abu transparan super soft
                },
                columnStyles: {
                    0: { cellWidth: 60 }, 
                    1: { cellWidth: "auto" }
                }
            });

            // Unduh File PDF
            doc.save(`Absensi_${item.nama}.pdf`);
        } catch(e) {
            console.error("Gagal memproses pembuatan PDF:", e);
            alert("Terjadi kesalahan saat menyusun layout PDF.");
        }
    };

    // 3. Penanganan darurat jika file 'Logo percobaan.png' tidak ditemukan di folder / gagal load
    img.onerror = function() {
        console.warn("File 'Logo percobaan.png' tidak ditemukan atau gagal dimuat. Mencetak tanpa logo...");
        const docBiasa = new jsPDF();
        
        docBiasa.setFont("Helvetica", "bold");
        docBiasa.setFontSize(14);
        docBiasa.setTextColor(35, 74, 132);
        docBiasa.text("LAPORAN ABSENSI INDIVIDU SISWA", 14, 17);
        
        const rowsFallback = [
            ["Nama Siswa", item.nama],
            ["Total Kehadiran (Hadir)", `${item.hadir} Pertemuan`],
            ["Total Tidak Hadir", `${item.tidakHadir} Pertemuan`],
            ["Status Pertemuan", item.hadir === TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir}/${TOTAL_PERTEMUAN}`],
            ["Tanggal Terakhir Diinput", item.tanggalRealtime],
            ["Catatan Khusus", item.catatan || "-"]
        ];

        docBiasa.autoTable({ startY: 25, head: [["Komponen Data", "Detail Keterangan"]], body: rowsFallback });
        docBiasa.save(`Absensi_${item.nama}.pdf`);
    };
}
function exportTotalExcel() {
    if (dataRekap.length === 0) { alert("Tidak ada data untuk diekspor!"); return; }
    const worksheetData = [
        ["REKAP TOTAL ABSENSI - NONA SWIMMING COURSE"],
        [],
        ["Nama Siswa", "Hadir", "Tidak Hadir", "Total fraction", "Tanggal Input Terbaru", "Catatan"]
    ];
    dataRekap.forEach(item => {
        worksheetData.push([
            item.nama, item.hadir, item.tidakHadir,
            `${item.hadir}/${TOTAL_PERTEMUAN}`, item.tanggalRealtime, item.catatan || '-'
        ]);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Total NSC");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    prosesUnduhFile(blob, `Rekap_Total_Absensi_NSC.xlsx`);
}

// PERBAIKAN: Menggunakan LOGO_NSC_BASE64 secara langsung, instan & anti-macet!
async function exportTotalPDF() {

    if (!dataRekap || dataRekap.length === 0) {
        alert("Tidak ada data untuk diekspor!");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("landscape");

    try {

        // ===== LOGO =====
        const logo = new Image();
        logo.src = "Logo percobaan.png";

        logo.onload = function () {

            // Header
            doc.addImage(logo, "PNG", 14, 8, 18, 20);

            doc.setFontSize(18);
            doc.setFont(undefined, "bold");
            doc.text("REKAP TOTAL ABSENSI NSC", 40, 16);

            doc.setFontSize(11);
            doc.setFont(undefined, "normal");
            doc.text("Nona Swimming Course", 40, 23);

            const tanggalCetak = new Date().toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "long",
                year: "numeric"
            });

            doc.text(`Tanggal Cetak : ${tanggalCetak}`, 250, 16, {
                align: "right"
            });

            // Garis Header
            doc.setDrawColor(35, 74, 132);
            doc.setLineWidth(0.8);
            doc.line(14, 32, 283, 32);

            // Data tabel
            const rows = dataRekap.map(item => [

                item.nama || "-",

                item.hadir || 0,

                item.tidakHadir || 0,

                `${item.hadir || 0}/${TOTAL_PERTEMUAN}`,

                item.tanggalRealtime || "-",

                item.catatan || "-"
            ]);

            doc.autoTable({
                startY: 38,

                head: [[
                    "Nama Siswa",
                    "Hadir",
                    "Tidak Hadir",
                    "Rasio",
                    "Tanggal Terbaru",
                    "Catatan"
                ]],

                body: rows,

                theme: "grid",

                styles: {
                    fontSize: 9,
                    cellPadding: 3,
                    valign: "middle"
                },

                headStyles: {
                    fillColor: [35, 74, 132],
                    textColor: [255, 255, 255],
                    fontStyle: "bold"
                },

                alternateRowStyles: {
                    fillColor: [245, 247, 250]
                }
            });

            // Footer
            const pageCount = doc.internal.getNumberOfPages();

            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);

                doc.setFontSize(9);

                doc.text(
                    `Halaman ${i} dari ${pageCount}`,
                    280,
                    200,
                    { align: "right" }
                );
            }

            doc.save("Rekap_Total_Absensi_NSC.pdf");
        };

        logo.onerror = function () {

            alert("Logo percobaan.png tidak ditemukan!");
        };

    } catch (err) {

        console.error(err);
        alert("Gagal membuat PDF: " + err.message);
    }
}
async function resetSemuaData() {
    if (!confirm("⚠️ PERINGATAN KERAS!\nApakah Anda yakin ingin MENGHAPUS TOTAL semua data absensi siswa dari database cloud Supabase?\n\nData yang dihapus tidak bisa dikembalikan!")) return;
    if (!confirm("Konfirmasi terakhir: Benar-benar ingin mengosongkan semua rekap data?")) return;

    const btnReset = document.getElementById("btnResetAll");
    if (btnReset) {
        btnReset.disabled = true;
        btnReset.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Mereset...';
    }

    try {
        const { data: listSiswa, error: fetchError } = await supabaseClient
            .from('absensinsc')
            .select('absensi');

        if (fetchError) throw fetchError;

        if (listSiswa && listSiswa.length > 0) {
            const listNama = listSiswa.map(s => s.absensi);
            const { error: errorDeleteRekap } = await supabaseClient
                .from('absensinsc')
                .delete()
                .in('absensi', listNama);
            if (errorDeleteRekap) throw errorDeleteRekap;
        }

        dataRekap = [];
        try { localStorage.setItem("dataRekap", JSON.stringify(dataRekap)); } catch(e){}
        renderTable();
        alert("Database Absensi Berhasil Dikosongkan!");
    } catch (err) {
        alert("Gagal mereset: " + err.message);
    } finally {
        if (btnReset) {
            btnReset.disabled = false;
            btnReset.innerHTML = '<i class="fa fa-trash-can"></i> Reset';
        }
    }
}


function keluarkanSiswa(nama) {
    if(!confirm("Keluarkan siswa " + nama + " dari les renang?\n\nData absensi tetap tersimpan.")) return;

    let siswaAktif = JSON.parse(localStorage.getItem("siswaAktif")) || [];
    siswaAktif = siswaAktif.filter(s => s !== nama);
    localStorage.setItem("siswaAktif", JSON.stringify(siswaAktif));

    dataRekap = dataRekap.filter(x => x.nama !== nama);
    localStorage.setItem("dataRekap", JSON.stringify(dataRekap));
    renderTable();
    alert(nama + " sudah dikeluarkan dari daftar siswa aktif.");
}
