Berikut adalah seluruh kode file `script.js` Anda yang sudah saya edit secara utuh dari atas sampai bawah. Fungsi `simpan()` telah diperbarui agar merekam log harian ke tabel `log_harian` tanpa merusak atau menghapus fungsi `showTab`, `prosesUnduhFile`, dan fungsi ekspor lainnya di bawahnya:

```javascript
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

document.addEventListener("DOMContentLoaded", function() {
    selectNamaControl = new TomSelect("#nama", {
        create: false,
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
            dataRekap = data.map(item => ({
                nama: item.absensi ? item.absensi.toString().toUpperCase().trim() : "TANPA NAMA",
                hadir: parseInt(item.Hadir) || 0,
                tidakHadir: parseInt(item["Tidak Hadir"] || item.id_tidak_hadir || item.status) || 0,
                catatan: item.Catatan || "",
                tanggalRealtime: formatTanggalIndonesia(item.created_at),
                rawDate: item.created_at || ""
            }));
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

async function handleLogin(event) {
    event.preventDefault(); 
    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;

    if (email !== "nonaswimmingcourse@gmail.com" || await generateSHA256(password) !== "3d32f1b4eec6aac2520a664ae8b746e46f83d5baecf81e030e47a9db5c8c7c83") {
        alert("Akses ditolak! Akun atau Password salah.");
        return; 
    }
    try { localStorage.setItem("isLoggedIn", "true"); } catch(e){}
    document.getElementById("loginSection").classList.add("hidden");
    document.getElementById("mainAppSection").classList.remove("hidden");
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
        document.getElementById("loginSection").classList.add("hidden");
        document.getElementById("mainAppSection").classList.remove("hidden");
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

    try {
        const { error } = await supabaseClient
            .from('absensinsc')
            .update({ 
                Hadir: baruHadir, 
                "Tidak Hadir": baruTidakHadir.toString(), 
                Catatan: catatanKetik 
            })
            .eq('absensi', namaSiswa);

        if (error) throw error;
        
        dataRekap[index].hadir = baruHadir;
        dataRekap[index].tidakHadir = baruTidakHadir;
        dataRekap[index].catatan = catatanKetik;
        dataRekap[index].tanggalRealtime = formatTanggalIndonesia(new Date().toISOString());
        
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

    if (selectNamaControl) {
        nama = selectNamaControl.getValue();
    }

    if (!nama) {
        nama = document.getElementById("nama").value;
    }

    const status = document.getElementById("status").value;
    const catatan = document.getElementById("catatan").value;
    const btnSimpan = document.getElementById("btnSimpan");

    if (!nama || nama.trim() === "") {
        alert("Silakan pilih nama siswa terlebih dahulu!");
        return;
    }

    nama = nama.trim().toUpperCase();

    btnSimpan.disabled = true;
    btnSimpan.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Menyimpan...';

    const catatanTeks = catatan.trim() !== "" ? catatan.trim() : "Absensi tercatat";

    if (!Array.isArray(dataRekap)) {
        dataRekap = [];
    }

    let siswaExist = dataRekap.find(s => s && s.nama === nama);

    let nHadir = status === "Hadir" ? 1 : 0;
    let nTidakHadir = status === "Tidak Hadir" ? 1 : 0;

    if (siswaExist) {
        nHadir = (siswaExist.hadir || 0) + (status === "Hadir" ? 1 : 0);
        nTidakHadir = (siswaExist.tidakHadir || 0) + (status === "Tidak Hadir" ? 1 : 0);
    }

    try {
        // 1. Simpan/Update Total Akumulasi ke tabel absensinsc
        const { error: errorRekap } = await supabaseClient
            .from("absensinsc")
            .upsert({
                absensi: nama,
                Hadir: nHadir,
                "Tidak Hadir": nTidakHadir.toString(),
                Catatan: catatanTeks
            }, {
                onConflict: "absensi"
            });

        if (errorRekap) throw errorRekap;

        // 2. Simpan Baris Baru ke tabel log_harian untuk riwayat harian
        const { error: errorLog } = await supabaseClient
            .from("log_harian")
            .insert({
                nama: nama,
                status: status,
                catatan: catatanTeks
            });

        if (errorLog) throw errorLog;

        const realtimeSekarang = formatTanggalIndonesia(new Date().toISOString());

        if (siswaExist) {
            siswaExist.hadir = nHadir;
            siswaExist.tidakHadir = nTidakHadir;
            siswaExist.catatan = catatanTeks;
            siswaExist.tanggalRealtime = realtimeSekarang;
        } else {
            dataRekap.push({
                nama: nama,
                hadir: nHadir,
                tidakHadir: nTidakHadir,
                catatan: catatanTeks,
                tanggalRealtime: realtimeSekarang
            });
        }

        renderTable();

        try {
            localStorage.setItem("dataRekap", JSON.stringify(dataRekap));
        } catch (e) {}

        if (selectNamaControl) {
            selectNamaControl.clear(true);
        } else {
            document.getElementById("nama").value = "";
        }

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
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
        const reader = new FileReader();
        reader.onloadend = function() {
            const dataUrl = reader.result;
            const w = window.open();
            if (w) {
                w.document.write(`
                    <html lang="id">
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Unduh File NSC</title>
                        <style>
                            body { font-family: 'Segoe UI', sans-serif; text-align: center; padding: 40px 20px; background: #f4f6f9; color: #1e3a63; }
                            .box { background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-width: 400px; margin: auto; }
                            .btn-download { display: inline-block; background: #234a84; color: white; padding: 14px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; box-shadow: 0 4px 6px rgba(35,74,132,0.2); }
                            .info { color: #64748b; font-size: 14px; margin-top: 15px; }
                        </style>
                    </head>
                    <body>
                        <div class="box">
                            <h3>File Berhasil Disiapkan!</h3>
                            <p>Silakan klik tombol di bawah untuk menyimpan berkas ke perangkat Anda.</p>
                            <a href="${dataUrl}" download="${namaFile}" class="btn-download">⬇️ SIMPAN FILE SEKARANG</a>
                            <p class="info">Nama File: <br><strong>${namaFile}</strong></p>
                        </div>
                    </body>
                    </html>
                `);
                w.document.close();
            } else {
                alert("Gagal membuka window baru. Aktifkan izin pop-up.");
            }
        };
        reader.readAsDataURL(blob);
    } else {
        try {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = namaFile;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch(e) {
            alert("Gagal mengunduh file.");
        }
    }
}

function exportSiswaExcel(index) {
    const item = dataRekap[index];
    const worksheetData = [
        ["DATA ABSENSI INDIVIDU - NONA SWIMMING COURSE"],
        [],
        ["Nama Siswa", item.nama],
        ["Jumlah Kehadiran (Hadir)", item.hadir],
        ["Jumlah Tidak Hadir", item.tidakHadir],
        ["Total Pertemuan Saat Ini", `${item.hadir}/${TOTAL_PERTEMUAN}`],
        ["Tanggal Pengisian Terbaru", item.tanggalRealtime],
        ["Catatan Terakhir", item.catatan || '-']
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Absensi Siswa");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    prosesUnduhFile(blob, `Absensi_${item.nama.replace(/\s+/g, '_')}.xlsx`);
}

function exportSiswaPDF(index) {
    const item = dataRekap[index];
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(35, 74, 132);
    doc.text("LAPORAN ABSENSI INDIVIDU SISWA", 14, 20);
    
    doc.setFontSize(11);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Nona Swimming Course (NSC)", 14, 27);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 32, 196, 32);
    
    const rows = [
        ["Nama Siswa", item.nama],
        ["Total Kehadiran (Hadir)", `${item.hadir} Pertemuan`],
        ["Total Tidak Hadir", `${item.tidakHadir} Pertemuan`],
        ["Status Pertemuan", item.hadir === TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir} / ${TOTAL_PERTEMUAN}`],
        ["Tanggal Terakhir Diinput", item.tanggalRealtime],
        ["Catatan Khusus", item.catatan || "-"]
    ];
    
    doc.autoTable({
        startY: 38,
        head: [["Komponen Data", "Detail Keterangan"]],
        body: rows,
        theme: "striped",
        headStyles: { fillColor: [35, 74, 132], textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 11, padding: 6 }
    });
    
    const blob = doc.output("blob");
    prosesUnduhFile(blob, `Absensi_${item.nama.replace(/\s+/g, '_')}.pdf`);
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
            item.nama,
            item.hadir,
            item.tidakHadir,
            `${item.hadir}/${TOTAL_PERTEMUAN}`,
            item.tanggalRealtime,
            item.catatan || '-'
        ]);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Total NSC");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    prosesUnduhFile(blob, `Rekap_Total_Absensi_NSC.xlsx`);
}

function exportTotalPDF() {
    if (dataRekap.length === 0) { alert("Tidak ada data untuk diekspor!"); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(35, 74, 132);
    doc.text("LAPORAN REKAP TOTAL KEHADIRAN", 14, 20);
    
    doc.setFontSize(11);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Nona Swimming Course - Total Target: ${TOTAL_PERTEMUAN} Pertemuan`, 14, 27);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 32, 196, 32);
    
    const tableRows = [];
    dataRekap.forEach(item => {
        tableRows.push([
            item.nama,
            item.hadir,
            item.tidakHadir,
            item.hadir === TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir}/${TOTAL_PERTEMUAN}`,
            item.tanggalRealtime,
            item.catatan || '-'
        ]);
    });
    
    doc.autoTable({
        startY: 38,
        head: [["Nama Siswa", "Hadir", "Absen", "Rasio", "Tanggal Terbaru", "Catatan Terakhir"]],
        body: tableRows,
        theme: "striped",
        headStyles: { fillColor: [35, 74, 132], textColor: [255, 255, 255] },
        styles: { fontSize: 9, padding: 4 }
    });
    
    const blob = doc.output("blob");
    prosesUnduhFile(blob, "Rekap_Total_Absensi_NSC.pdf");
}

function updateJamRealtime(){
    const sekarang = new Date();
    const jam = sekarang.toLocaleTimeString("id-ID",{
        hour:"2-digit",
        minute:"2-digit",
        second:"2-digit"
    });

    const options = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
    const tanggalTeks = sekarang.toLocaleDateString("id-ID", options);

    const el = document.getElementById("jamRealtime");
    if (el) {
        el.innerHTML = `
            <div class="jam">${jam}</div>
            <div class="tanggal">${tanggalTeks}</div>
        `;
    }
}

```
