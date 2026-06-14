const TOTAL_PERTEMUAN = 12; // Total target pertemuan les

// Inisialisasi Supabase Client
const SUPABASE_URL = "https://mjfwgmhuengvfdagbcsk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZndgmWh1ZW5ndmZkYWdiY3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMDczMTMsImV4cCI6MjA5Njg4MzMxM30.NxZY9zHP9zQmHRsgpcGZyk3t7_xaGFFuTa3bYIAD384";
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
    try {
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
    } catch (e) { console.warn("TomSelect belum dimuat penuh."); }

    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    } else {
        // Jika form HTML Anda tidak sengaja rusak ID-nya, jalankan otomatis prompt backup
        setTimeout(jalankanLoginBackupPrompt, 1000);
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
                    no_hp: item.no_hp || "",
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
    if (passwordInput) {
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            if (eyeIcon) eyeIcon.classList.replace("fa-eye", "fa-eye-slash");
        } else {
            passwordInput.type = "password";
            if (eyeIcon) eyeIcon.classList.replace("fa-eye-slash", "fa-eye");
        }
    }
}

// LOGIN UTAMA: Dengan sistem deteksi otomatis jika input HTML error
async function handleLogin(event) {
    if (event) event.preventDefault();
    
    const emailEl = document.getElementById("loginEmail");
    const passwordEl = document.getElementById("loginPassword");
    
    // Jika elemen form HTML hilang/berubah nama, oper ke login cadangan
    if (!emailEl || !passwordEl) {
        jalankanLoginBackupPrompt();
        return;
    }

    const email = emailEl.value.trim().toLowerCase();
    const password = passwordEl.value;

    prosesVerifikasiLogin(email, password);
}

// BACKUP LOGIN DIALOG: Muncul jika form login di HTML Anda error/tidak merespon
function jalankanLoginBackupPrompt() {
    if (localStorage.getItem("isLoggedIn") === "true") return;
    
    alert("Sistem mendeteksi komponen Form Login HTML terganggu. Mengaktifkan gerbang masuk darurat...");
    const email = prompt("Masukkan Email Akun NSC:");
    if (!email) return;
    const password = prompt("Masukkan Password Akun NSC:");
    if (!password) return;

    prosesVerifikasiLogin(email.trim().toLowerCase(), password);
}

// Eksekutor pembuka gerbang aplikasi
function prosesVerifikasiLogin(email, password) {
    if (email === "nonaswimmingcourse@gmail.com" && password === "nonaswimmingcourse") {
        try { localStorage.setItem("isLoggedIn", "true"); } catch(e){}
        
        const loginSection = document.getElementById("loginSection");
        const mainAppSection = document.getElementById("mainAppSection");
        
        if (loginSection) loginSection.classList.add("hidden");
        if (mainAppSection) mainAppSection.classList.remove("hidden");
        
        muatDataDariCloud();
    } else {
        alert("Akses ditolak! Akun atau Password salah.");
    }
}

function handleLogout() {
    if(confirm("Apakah Anda yakin ingin keluar?")) {
        try { 
            localStorage.removeItem("isLoggedIn");
        } catch(e){}
        window.location.reload();
    }
}

// MENGECEK APAKAH LOGIN AKTIF ATAU TIDAK
function checkLoginSession() {
    if(localStorage.getItem("isLoggedIn") === "true") {
        const loginSec = document.getElementById("loginSection");
        const mainSec = document.getElementById("mainAppSection");
        if(loginSec) loginSec.classList.add("hidden");
        if(mainSec) mainSec.classList.remove("hidden");
    }
}

// MENAMPILKAN TABEL REKAP UTAMA
function renderTable() {
    const tbody = document.getElementById("tbody");
    if (!tbody) return;

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
                        <button onclick="prosesDanKirimCloudPDF(${index})" class="btn-action btn-wa" title="Kirim Laporan PDF Resmi via WhatsApp" id="btnWa-${index}">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button class="btn-action btn-excel" title="Download Excel Harian Siswa" onclick="exportSiswaExcel(${index})"><i class="fa fa-file-excel"></i></button>
                        <button class="btn-action btn-pdf" title="Download PDF Harian Siswa" onclick="exportSiswaPDF(${index})"><i class="fa fa-file-pdf"></i></button>
                        <button class="btn-action btn-delete" title="Hapus Data Siswa" id="btnDelete-${index}" onclick="deleteRow(${index})"><i class="fa fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
        });
    }
    tbody.innerHTML = html;
    const totalTextEl = document.getElementById("totalPertemuanText");
    if (totalTextEl) totalTextEl.innerText = `Total ${TOTAL_PERTEMUAN} Pertemuan Les Renang`;
}

// FUNGSI UTAMA WHATSAPP DAN FALLBACK 
async function prosesDanKirimCloudPDF(index) {
    const item = dataRekap[index];
    const btnWa = document.getElementById(`btnWa-${index}`);
    let nomorWA = item.no_hp || "";
    if (!nomorWA) { alert("Nomor HP orang tua belum diisi!"); return; }
    if (nomorWA.startsWith('0')) nomorWA = '62' + nomorWA.slice(1);
    nomorWA = nomorWA.replace(/[^0-9]/g, "");

    const iconAsli = btnWa.innerHTML;
    btnWa.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
    btnWa.style.pointerEvents = 'none';

    const generatePDFBlob = () => {
        return new Promise((resolve) => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.setFont("Helvetica", "bold").setFontSize(14).setTextColor(35, 74, 132);
            doc.text("LAPORAN ABSENSI INDIVIDU SISWA", 14, 20);
            doc.setFontSize(10).setFont("Helvetica", "normal").setTextColor(100, 100, 100);
            doc.text("Nona Swimming Course (NSC)", 14, 27);
            
            const rows = [
                ["Nama Siswa", item.nama],
                ["Total Kehadiran", `${item.hadir} Pertemuan`],
                ["Total Tidak Hadir", `${item.tidakHadir} Pertemuan`],
                ["Tanggal Terakhir", item.tanggalRealtime || "-"],
                ["Catatan", item.catatan || "-"]
            ];
            doc.autoTable({ startY: 33, head: [["Komponen", "Detail"]], body: rows, theme: "striped", headStyles: { fillColor: [35, 74, 132] } });
            resolve(doc.output('blob'));
        });
    };

    try {
        const pdfBlob = await generatePDFBlob();
        const namaFileCloud = `Absensi_${item.nama.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

        const { data: uploadData, error: uploadError } = await supabaseClient.storage.from('laporan-pdf').upload(namaFileCloud, pdfBlob, { contentType: 'application/pdf', upsert: true });
        
        if (uploadError) throw uploadError;

        const { data: urlData } = supabaseClient.storage.from('laporan-pdf').getPublicUrl(namaFileCloud);
        let pesanWA = `Halo Bapak/Ibu, berikut laporan absensi resmi Ananda *${item.nama}* di *Nona Swimming Course*. \n\nTotal Hadir: *${item.hadir}* Pertemuan\nTidak Hadir: *${item.tidakHadir}* Pertemuan\n\nSilakan klik link berikut untuk melihat/mengunduh PDF:\n${urlData.publicUrl}\n\nTerima kasih.`;
        window.open(`https://api.whatsapp.com/send?phone=${nomorWA}&text=${encodeURIComponent(pesanWA)}`, '_blank');

    } catch (e) {
        console.warn("Mengaktifkan sistem aman fallback download lokal...");
        const pdfBlob = await generatePDFBlob();
        const urlLokal = window.URL.createObjectURL(pdfBlob);
        
        const a = document.createElement('a');
        a.href = urlLokal;
        a.download = `Laporan_Absensi_${item.nama}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        let pesanWA = `Halo Bapak/Ibu, berikut ringkasan laporan absensi resmi Ananda *${item.nama}* di *Nona Swimming Course*.\n\n✓ Total Kehadiran: *${item.hadir}* Pertemuan\n✓ Tidak Hadir: *${item.tidakHadir}* Pertemuan\n✓ Tanggal Rekap: ${item.tanggalRealtime || '-'}\n✓ Catatan: _${item.catatan || 'Tercatat dengan baik'}_\n\n*Dokumen PDF resmi baru saja diunduh otomatis di perangkat Admin dan akan dikirimkan langsung oleh admin via chat.* \n\nTerima kasih atas perhatiannya.`;
        window.open(`https://api.whatsapp.com/send?phone=${nomorWA}&text=${encodeURIComponent(pesanWA)}`, '_blank');
    } finally {
        btnWa.innerHTML = iconAsli;
        btnWa.style.pointerEvents = 'auto';
    }
}

// UPDATE COUNTER + DAN -
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
    if (!nama && document.getElementById("nama")) { nama = document.getElementById("nama").value; }
    if (!nama) { alert("Silakan pilih nama siswa terlebih dahulu!"); return; }

    const status = document.getElementById("status").value;
    const catatan = document.getElementById("catatan").value;
    const no_hp = document.getElementById("no_hp").value.trim();
    const btnSimpan = document.getElementById("btnSimpan");

    nama = nama.trim().toUpperCase();
    if(btnSimpan) {
        btnSimpan.disabled = true;
        btnSimpan.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Menyimpan...';
    }

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
                "Tanggal Terbaru": waktuSekarangISO,
                no_hp: no_hp || (siswaExist ? siswaExist.no_hp : "")
            }, {
                onConflict: "absensi"
            });

        if (errorRekap) throw errorRekap;

        const { error: errorLog } = await supabaseClient
            .from("log_harian")[cite: 2]
            .insert({ nama: nama, status: status, catatan: catatanTeks });

        if (errorLog) throw errorLog;

        const realtimeSekarang = formatTanggalIndonesia(waktuSekarangISO);

        if (siswaExist) {
            siswaExist.hadir = nHadir;
            siswaExist.tidakHadir = nTidakHadir; // Sudah diperbaiki dari crash nTarget
            siswaExist.catatan = catatanTeks;
            siswaExist.tanggalRealtime = realtimeSekarang;
            siswaExist.rawDate = waktuSekarangISO;
            if(no_hp) siswaExist.no_hp = no_hp;
        } else {
            dataRekap.push({
                nama: nama, hadir: nHadir, tidakHadir: nTidakHadir,
                catatan: catatanTeks, tanggalRealtime: realtimeSekarang, rawDate: waktuSekarangISO, no_hp: no_hp
            });
        }

        renderTable();
        try { localStorage.setItem("dataRekap", JSON.stringify(dataRekap)); } catch (e) {}

        if (selectNamaControl) { selectNamaControl.clear(true); } 
        else if (document.getElementById("nama")) { document.getElementById("nama").value = ""; }

        document.getElementById("catatan").value = "";
        document.getElementById("no_hp").value = "";
        alert("Data berhasil disimpan ke Rekap dan Log Harian!");
    } catch (err) {
        console.error(err);
        alert("Gagal menyimpan ke Supabase: " + err.message);
    } finally {
        if(btnSimpan) {
            btnSimpan.disabled = false;
            btnSimpan.innerHTML = '<i class="fa fa-plus-circle"></i> Simpan Data';
        }
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

function exportSiswaPDF(index) {
    const item = dataRekap[index];
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(35, 74, 132);
    doc.text("LAPORAN ABSENSI INDIVIDU SISWA", 14, 20);
    
    const rows = [
        ["Nama Siswa", item.nama],
        ["Total Kehadiran (Hadir)", `${item.hadir} Pertemuan`],
        ["Total Tidak Hadir", `${item.tidakHadir} Pertemuan`],
        ["Status Pertemuan", item.hadir === TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir}/${TOTAL_PERTEMUAN}`],
        ["Tanggal Terakhir Diinput", item.tanggalRealtime],
        ["Catatan Khusus", item.catatan || "-"]
    ];

    doc.autoTable({ startY: 28, head: [["Komponen Data", "Detail Keterangan"]], body: rows });
    doc.save(`Absensi_${item.nama}.pdf`);
}

function exportTotalPDF() {
    if (dataRekap.length === 0) { alert("Tidak ada data untuk diekspor!"); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(35, 74, 132);
    doc.text("LAPORAN REKAP TOTAL KEHADIRAN", 14, 20);
    
    const tableRows = [];
    dataRekap.forEach(item => {
        tableRows.push([
            item.nama, item.hadir, item.tidakHadir,
            item.hadir === TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir}/${TOTAL_PERTEMUAN}`,
            item.tanggalRealtime, item.catatan || '-'
        ]);
    });
    
    doc.autoTable({
        startY: 28,
        head: [["Nama Siswa", "Hadir", "Absen", "Rasio", "Tanggal Terbaru", "Catatan Terakhir"]],
        body: tableRows,
        theme: "striped"
    });
    
    doc.save("Rekap_Total_Absensi_NSC.pdf");
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
