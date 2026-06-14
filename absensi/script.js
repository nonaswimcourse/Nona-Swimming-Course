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
    } catch(e) { console.warn("TomSelect belum siap."); }

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
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        eyeIcon.classList.replace("fa-eye", "fa-eye-slash");
    } else {
        passwordInput.type = "password";
        eyeIcon.classList.replace("fa-eye-slash", "fa-eye");
    }
}

// PERBAIKAN LOGIC LOGIN VERIFIKASI LANGSUNG BYPASS ERROR SHA
async function handleLogin(event) {
    if (event) event.preventDefault(); 
    
    const emailEl = document.getElementById("loginEmail");
    const passwordEl = document.getElementById("loginPassword");
    
    if (!emailEl || !passwordEl) return;

    const email = emailEl.value.trim().toLowerCase();
    const password = passwordEl.value.trim();

    // Verifikasi bypass langsung menggunakan teks murni tanpa crash SHA
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
    let html = "";
    const tbody = document.getElementById("tbody");
    if (!tbody) return;

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
                        <button class="btn-action btn-kick" title="Keluarkan Siswa" onclick="keluarkanSiswa('${item.nama}')"><i class="fa fa-user-minus"></i></button>
                    </div>
                </td>
            </tr>`;
        });
    }
    tbody.innerHTML = html;
    
    const totalPertemuanText = document.getElementById("totalPertemuanText");
    if (totalPertemuanText) totalPertemuanText.innerText = `Total ${TOTAL_PERTEMUAN} Pertemuan Les Renang`;
}

// GENERATE PDF & KIRIM WHATSAPP
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
        const pdfBlob = await generatePDFBlob();
        const urlLokal = window.URL.createObjectURL(pdfBlob);
        
        const a = document.createElement('a');
        a.href = urlLokal;
        a.download = `Laporan_Absensi_${item.nama}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        let pesanWA = `Halo Bapak/Ibu, berikut ringkasan laporan absensi resmi Ananda *${item.nama}* di *Nona Swimming Course*.\n\n✓ Total Kehadiran: *${item.hadir}* Pertemuan\n✓ Tidak Hadir: *${item.tidakHadir}* Pertemuan\n\n*Dokumen PDF resmi telah diunduh oleh sistem dan akan dikirimkan file fisiknya secara langsung oleh admin via chat ini.* \n\nTerima kasih.`;
        window.open(`https://api.whatsapp.com/send?phone=${nomorWA}&text=${encodeURIComponent(pesanWA)}`, '_blank');
    } finally {
        btnWa.innerHTML = iconAsli;
        btnWa.style.pointerEvents = 'auto';
    }
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
    const no_hp = document.getElementById("no_hp").value.trim();
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
                "Tanggal Terbaru": waktuSekarangISO,
                no_hp: no_hp || (siswaExist ? siswaExist.no_hp : "")
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
        else { document.getElementById("nama").value = ""; }

        document.getElementById("catatan").value = "";
        document.getElementById("no_hp").value = "";
        alert("Data berhasil disimpan!");
    } catch (err) {
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
        ["LAPORAN ABSENSI INDIVIDU SISWA"], ["Nona Swimming Course (NSC)"], [],
        ["Komponen", "Keterangan"], ["Nama Siswa", item.nama], ["Jumlah Kehadiran", `${item.hadir} Pertemuan`]
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Absensi Siswa");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    prosesUnduhFile(new Blob([wbout], { type: 'application/octet-stream' }), `Absensi_${item.nama}.xlsx`);
}

function exportSiswaPDF(index) {
    const item = dataRekap[index];
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(`Absensi: ${item.nama}`, 14, 20);
    doc.autoTable({ startY: 28, head: [["Hadir", "Tidak Hadir"]], body: [[item.hadir, item.tidakHadir]] });
    doc.save(`Absensi_${item.nama}.pdf`);
}

function exportTotalPDF() {
    const doc = new window.jspdf.jsPDF();
    const tableRows = dataRekap.map(item => [item.nama, item.hadir, item.tidakHadir, item.tanggalRealtime]);
    doc.autoTable({ head: [["Nama Siswa", "Hadir", "Absen", "Tanggal Terbaru"]], body: tableRows });
    doc.save("Rekap_Total_Absensi_NSC.pdf");
}

async function resetSemuaData() {
    if (!confirm("Hapus total data cloud?")) return;
    try {
        await supabaseClient.from('absensinsc').delete().neq('absensi', 'placeholder');
        dataRekap = []; renderTable();
    } catch (err) { alert(err.message); }
}

function keluarkanSiswa(nama) {
    if(!confirm("Keluarkan siswa " + nama + "?")) return;
    dataRekap = dataRekap.filter(x => x.nama !== nama);
    renderTable();
}
