const TOTAL_PERTEMUAN = 12; // Total target pertemuan les[cite: 2]

// Inisialisasi Supabase Client[cite: 2]
const SUPABASE_URL = "https://mjfwgmhuengvfdagbcsk.supabase.co";[cite: 2]
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZndgmWh1ZW5ndmZkYWdiY3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMDczMTMsImV4cCI6MjA5Njg4MzMxM30.NxZY9zHP9zQmHRsgpcGZyk3t7_xaGFFuTa3bYIAD384";[cite: 2]
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);[cite: 2]

let dataRekap = [];[cite: 2]
let selectNamaControl;[cite: 2]

// Nama hari dan bulan lokal Indonesia[cite: 2]
const namaHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];[cite: 2]
const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];[cite: 2]

// Fungsi pembantu untuk memformat tanggal realtime ke teks Indonesia[cite: 2]
function formatTanggalIndonesia(timestamp) {
    if (!timestamp) return "Belum Ada Tanggal";[cite: 2]
    const dateObj = new Date(timestamp);[cite: 2]
    if (isNaN(dateObj.getTime())) return timestamp;[cite: 2]
    
    const hari = namaHari[dateObj.getDay()];[cite: 2]
    const tanggal = dateObj.getDate();[cite: 2]
    const bulan = namaBulan[dateObj.getMonth()];[cite: 2]
    const tahun = dateObj.getFullYear();[cite: 2]
    
    return `${hari}, ${tanggal} ${bulan} ${tahun}`;[cite: 2]
}

// Fungsi untuk Jam dan Tanggal Realtime di Pojok Atas Aplikasi Utama[cite: 2]
function updateJamRealtime() {
    const sekarang = new Date();[cite: 2]
    
    const jam = String(sekarang.getHours()).padStart(2, '0');[cite: 2]
    const menit = String(sekarang.getMinutes()).padStart(2, '0');[cite: 2]
    const detik = String(sekarang.getSeconds()).padStart(2, '0');[cite: 2]
    
    const jamEl = document.getElementById("jamRealtime");[cite: 2]
    if (jamEl) jamEl.innerText = `${jam}.${menit}.${detik}`;[cite: 2]
    
    const tanggalEl = document.getElementById("tanggalRealtime");[cite: 2]
    if (tanggalEl) tanggalEl.innerText = formatTanggalIndonesia(sekarang);[cite: 2]
}

document.addEventListener("DOMContentLoaded", function() {
    selectNamaControl = new TomSelect("#nama", {[cite: 2]
        create: true, 
        sortField: { field: "text", direction: "asc" },[cite: 2]
        placeholder: "Ketik / Pilih Nama Siswa...",[cite: 2]
        allowEmptyOption: true,[cite: 2]
        onChange: function(value) {[cite: 2]
            if(value) {[cite: 2]
                if(selectNamaControl) { selectNamaControl.blur(); }[cite: 2]
                document.activeElement.blur(); 
            }
        }
    });

    const loginForm = document.getElementById("loginForm");[cite: 2]
    if (loginForm) {[cite: 2]
        loginForm.addEventListener("submit", handleLogin);[cite: 2]
    }

    checkLoginSession();[cite: 2]
    muatDataDariCloud();[cite: 2]
    
    updateJamRealtime();[cite: 2]
    setInterval(updateJamRealtime, 1000);[cite: 2]
});

// MEMUAT DATA DARI SUPABASE[cite: 2]
async function muatDataDariCloud() {
    const tbody = document.getElementById("tbody");[cite: 2]
    try {
        if (tbody) {[cite: 2]
            tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; color:#234a84;'><i class='fa fa-spinner fa-spin'></i> Menyinkronkan data terbaru dari Cloud Supabase...</td></tr>";[cite: 2]
        }

        const { data, error } = await supabaseClient[cite: 2]
            .from('absensinsc')[cite: 2]
            .select('*')[cite: 2]
            .order('absensi', { ascending: true });[cite: 2]

        if (error) throw error;[cite: 2]

        if (data && data.length > 0) {[cite: 2]
            dataRekap = data.map(item => {[cite: 2]
                let rawDateSource = item["Tanggal Terbaru"] || item.created_at || new Date().toISOString();[cite: 2]
                return {
                    nama: item.absensi ? item.absensi.toString().toUpperCase().trim() : "TANPA NAMA",[cite: 2]
                    hadir: parseInt(item.Hadir) || 0,[cite: 2]
                    tidakHadir: parseInt(item["Tidak Hadir"] || item.id_tidak_hadir || item.status) || 0,[cite: 2]
                    catatan: item.Catatan || "",[cite: 2]
                    no_hp: item.no_hp || "",[cite: 2]
                    tanggalRealtime: formatTanggalIndonesia(rawDateSource),[cite: 2]
                    rawDate: rawDateSource[cite: 2]
                };
            });
        } else {
            dataRekap = [];[cite: 2]
        }
        
        try { localStorage.setItem("dataRekap", JSON.stringify(dataRekap)); } catch(e){}[cite: 2]
        renderTable();[cite: 2]
    } catch (e) { 
        console.error("Gagal memuat dari Cloud Supabase:", e);[cite: 2]
        dataRekap = JSON.parse(localStorage.getItem("dataRekap")) || [];[cite: 2]
        renderTable();[cite: 2]
    }
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById("loginPassword");[cite: 2]
    const eyeIcon = document.getElementById("eyeIcon");[cite: 2]
    if (passwordInput.type === "password") {[cite: 2]
        passwordInput.type = "text";[cite: 2]
        eyeIcon.classList.replace("fa-eye", "fa-eye-slash");[cite: 2]
    } else {
        passwordInput.type = "password";[cite: 2]
        eyeIcon.classList.replace("fa-eye-slash", "fa-eye");[cite: 2]
    }
}

// LOGIN AKUN PERBAIKAN: Langsung Bypass Tanpa SHA256 Bermasalah
async function handleLogin(event) {
    if (event) event.preventDefault();[cite: 2]
    
    const emailEl = document.getElementById("loginEmail");[cite: 2]
    const passwordEl = document.getElementById("loginPassword");[cite: 2]
    
    if (!emailEl || !passwordEl) return;[cite: 2]

    const email = emailEl.value.trim().toLowerCase();[cite: 2]
    const password = passwordEl.value;[cite: 2]

    // LOGIN SEDERHANA & PASTI BISA MASUK
    if (email === "nonaswimmingcourse@gmail.com" && password === "nonaswimmingcourse") {
        try { localStorage.setItem("isLoggedIn", "true"); } catch(e){}[cite: 2]
        
        const loginSection = document.getElementById("loginSection");[cite: 2]
        const mainAppSection = document.getElementById("mainAppSection");[cite: 2]
        
        if (loginSection) loginSection.classList.add("hidden");[cite: 2]
        if (mainAppSection) mainAppSection.classList.remove("hidden");[cite: 2]
        
        muatDataDariCloud();[cite: 2]
    } else {
        alert("Akses ditolak! Akun atau Password salah.");[cite: 2]
    }
}

function handleLogout() {
    if(confirm("Apakah Anda yakin ingin keluar?")) {[cite: 2]
        try { 
            localStorage.removeItem("isLoggedIn");[cite: 2]
        } catch(e){}
        window.location.reload();[cite: 2]
    }
}

// MENGECEK APAKAH LOGIN AKTIF ATAU TIDAK
function checkLoginSession() {
    if(localStorage.getItem("isLoggedIn") === "true") {[cite: 2]
        const loginSec = document.getElementById("loginSection");[cite: 2]
        const mainSec = document.getElementById("mainAppSection");[cite: 2]
        if(loginSec) loginSec.classList.add("hidden");[cite: 2]
        if(mainSec) mainSec.classList.remove("hidden");[cite: 2]
    }
}

// MENAMPILKAN TABEL REKAP UTAMA[cite: 2]
function renderTable() {
    let html = "";[cite: 2]
    if(!dataRekap || dataRekap.length === 0) {[cite: 2]
        html = "<tr><td colspan='6' style='text-align:center; color:#94a3b8;'>Belum ada data rekap.</td></tr>";[cite: 2]
    } else {
        dataRekap.forEach((item, index) => {[cite: 2]
            let totalTeks = item.hadir === TOTAL_PERTEMUAN[cite: 2]
                ? `<span class="total-lengkap">LENGKAP</span>`[cite: 2]
                : `<span class="total-fraction">${item.hadir}/${TOTAL_PERTEMUAN}</span>`;[cite: 2]

            html += `
            <tr>
                <td style="font-weight: 500;">${item.nama}</td>[cite: 2]
                <td>
                    <div class="counter-box">
                        <button class="counter-btn" onclick="updateCounter(${index}, 'hadir', -1)">-</button>[cite: 2]
                        <span class="counter-val hadir-val">${item.hadir}</span>[cite: 2]
                        <button class="counter-btn" onclick="updateCounter(${index}, 'hadir', 1)">+</button>[cite: 2]
                    </div>
                </td>
                <td>
                    <div class="counter-box">
                        <button class="counter-btn" onclick="updateCounter(${index}, 'tidakHadir', -1)">-</button>[cite: 2]
                        <span class="counter-val tidak-val">${item.tidakHadir}</span>[cite: 2]
                        <button class="counter-btn" onclick="updateCounter(${index}, 'tidakHadir', 1)">+</button>[cite: 2]
                    </div>
                </td>
                <td>${totalTeks}</td>[cite: 2]
                <td style="color: #475569; font-size: 14px;">${item.tanggalRealtime}</td>[cite: 2]
                <td>
                    <div class="actions-cell">
                        <button onclick="prosesDanKirimCloudPDF(${index})" class="btn-action btn-wa" title="Kirim Laporan PDF Resmi via WhatsApp" id="btnWa-${index}">[cite: 2]
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button class="btn-action btn-excel" title="Download Excel Harian Siswa" onclick="exportSiswaExcel(${index})"><i class="fa fa-file-excel"></i></button>[cite: 2]
                        <button class="btn-action btn-pdf" title="Download PDF Harian Siswa" onclick="exportSiswaPDF(${index})"><i class="fa fa-file-pdf"></i></button>[cite: 2]
                        <button class="btn-action btn-delete" title="Hapus Data Siswa" id="btnDelete-${index}" onclick="deleteRow(${index})"><i class="fa fa-trash"></i></button>[cite: 2]
                    </div>
                </td>
            </tr>`;
        });
    }
    document.getElementById("tbody").innerHTML = html;[cite: 2]
    document.getElementById("totalPertemuanText").innerText = `Total ${TOTAL_PERTEMUAN} Pertemuan Les Renang`;[cite: 2]
}

// FUNGSI UTAMA WHATSAPP DAN FALLBACK (STRUKTUR SAKTI SUDAH DIPERBAIKI)
async function prosesDanKirimCloudPDF(index) {
    const item = dataRekap[index];[cite: 2]
    const btnWa = document.getElementById(`btnWa-${index}`);[cite: 2]
    let nomorWA = item.no_hp || "";[cite: 2]
    if (!nomorWA) { alert("Nomor HP orang tua belum diisi!"); return; }[cite: 2]
    if (nomorWA.startsWith('0')) nomorWA = '62' + nomorWA.slice(1);[cite: 2]
    nomorWA = nomorWA.replace(/[^0-9]/g, "");[cite: 2]

    const iconAsli = btnWa.innerHTML;[cite: 2]
    btnWa.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';[cite: 2]
    btnWa.style.pointerEvents = 'none';[cite: 2]

    const generatePDFBlob = () => {
        return new Promise((resolve) => {
            const { jsPDF } = window.jspdf;[cite: 2]
            const doc = new jsPDF();[cite: 2]
            doc.setFont("Helvetica", "bold").setFontSize(14).setTextColor(35, 74, 132);[cite: 2]
            doc.text("LAPORAN ABSENSI INDIVIDU SISWA", 14, 20);[cite: 2]
            doc.setFontSize(10).setFont("Helvetica", "normal").setTextColor(100, 100, 100);[cite: 2]
            doc.text("Nona Swimming Course (NSC)", 14, 27);[cite: 2]
            
            const rows = [
                ["Nama Siswa", item.nama],[cite: 2]
                ["Total Kehadiran", `${item.hadir} Pertemuan`],[cite: 2]
                ["Total Tidak Hadir", `${item.tidakHadir} Pertemuan`],[cite: 2]
                ["Tanggal Terakhir", item.tanggalRealtime || "-"],[cite: 2]
                ["Catatan", item.catatan || "-"][cite: 2]
            ];
            doc.autoTable({ startY: 33, head: [["Komponen", "Detail"]], body: rows, theme: "striped", headStyles: { fillColor: [35, 74, 132] } });[cite: 2]
            resolve(doc.output('blob'));[cite: 2]
        });
    };

    try {
        const pdfBlob = await generatePDFBlob();[cite: 2]
        const namaFileCloud = `Absensi_${item.nama.replace(/\s+/g, '_')}_${Date.now()}.pdf`;[cite: 2]

        // Mencoba Upload[cite: 2]
        const { data: uploadData, error: uploadError } = await supabaseClient.storage.from('laporan-pdf').upload(namaFileCloud, pdfBlob, { contentType: 'application/pdf', upsert: true });[cite: 2]
        
        if (uploadError) throw uploadError;[cite: 2]

        // JIKA BERHASIL:[cite: 2]
        const { data: urlData } = supabaseClient.storage.from('laporan-pdf').getPublicUrl(namaFileCloud);[cite: 2]
        let pesanWA = `Halo Bapak/Ibu, berikut laporan absensi resmi Ananda *${item.nama}* di *Nona Swimming Course*. \n\nTotal Hadir: *${item.hadir}* Pertemuan\nTidak Hadir: *${item.tidakHadir}* Pertemuan\n\nSilakan klik link berikut untuk melihat/mengunduh PDF:\n${urlData.publicUrl}\n\nTerima kasih.`;[cite: 2]
        window.open(`https://api.whatsapp.com/send?phone=${nomorWA}&text=${encodeURIComponent(pesanWA)}`, '_blank');[cite: 2]

    } catch (e) {
        // JIKA SUPABASE LAGI ERROR / SIGNATURE VERIFICATION FAILED (SISTEM PENYELAMAT DIKUNCI DI SINI):[cite: 2]
        console.warn("Mengaktifkan sistem aman fallback download lokal...");[cite: 2]
        const pdfBlob = await generatePDFBlob();[cite: 2]
        const urlLokal = window.URL.createObjectURL(pdfBlob);[cite: 2]
        
        const a = document.createElement('a');[cite: 2]
        a.href = urlLokal;[cite: 2]
        a.download = `Laporan_Absensi_${item.nama}.pdf`;[cite: 2]
        document.body.appendChild(a);[cite: 2]
        a.click();[cite: 2]
        document.body.removeChild(a);[cite: 2]

        let pesanWA = `Halo Bapak/Ibu, berikut ringkasan laporan absensi resmi Ananda *${item.nama}* di *Nona Swimming Course*.\n\n✓ Total Kehadiran: *${item.hadir}* Pertemuan\n✓ Tidak Hadir: *${item.tidakHadir}* Pertemuan\n✓ Tanggal Rekap: ${item.tanggalRealtime || '-'}\n✓ Catatan: _${item.catatan || 'Tercatat dengan baik'}_\n\n*Dokumen PDF resmi baru saja diunduh otomatis di perangkat Admin dan akan dikirimkan langsung oleh admin via chat.* \n\nTerima kasih atas perhatiannya.`;[cite: 2]
        window.open(`https://api.whatsapp.com/send?phone=${nomorWA}&text=${encodeURIComponent(pesanWA)}`, '_blank');[cite: 2]
    } finally {
        btnWa.innerHTML = iconAsli;[cite: 2]
        btnWa.style.pointerEvents = 'auto';[cite: 2]
    }
}

// UPDATE COUNTER + DAN -
async function updateCounter(index, tipe, value) {
    const targetSiswa = dataRekap[index];[cite: 2]
    const namaSiswa = targetSiswa.nama;[cite: 2]
    let catatanKetik = "";[cite: 2]
    
    let baruHadir = targetSiswa.hadir;[cite: 2]
    let baruTidakHadir = targetSiswa.tidakHadir;[cite: 2]

    if (value > 0) {
        let inputCatatan = prompt(`Masukkan Catatan Baru untuk ${namaSiswa}:`, `Update manual via counter`);[cite: 2]
        if (inputCatatan === null) return; 
        catatanKetik = inputCatatan.trim() === "" ? `Update manual via counter` : inputCatatan.trim();[cite: 2]
        
        if (tipe === 'hadir') baruHadir += 1;[cite: 2]
        else baruTidakHadir += 1;[cite: 2]
    } else {
        if (tipe === 'hadir') {[cite: 2]
            if (baruHadir === 0) return;[cite: 2]
            baruHadir -= 1;[cite: 2]
        } else {
            if (baruTidakHadir === 0) return;[cite: 2]
            baruTidakHadir -= 1;[cite: 2]
        }
        catatanKetik = `Pengurangan manual via counter`;[cite: 2]
    }

    if (baruHadir === 0 && baruTidakHadir === 0) {[cite: 2]
        alert(`Rekap data ${namaSiswa} bernilai 0. Siswa akan otomatis dihapus dari sistem.`);[cite: 2]
        await deleteRow(index);[cite: 2]
        return;
    }

    const waktuSekarangISO = new Date().toISOString();[cite: 2]

    try {
        const { error } = await supabaseClient[cite: 2]
            .from("absensinsc")[cite: 2]
            .upsert({[cite: 2]
                absensi: namaSiswa,[cite: 2]
                Hadir: baruHadir,[cite: 2]
                "Tidak Hadir": baruTidakHadir.toString(),[cite: 2]
                Catatan: catatanKetik,[cite: 2]
                "Tanggal Terbaru": waktuSekarangISO[cite: 2]
            }, {
                onConflict: "absensi"[cite: 2]
            });

        if (error) throw error;[cite: 2]
        
        dataRekap[index].hadir = baruHadir;[cite: 2]
        dataRekap[index].tidakHadir = baruTidakHadir;[cite: 2]
        dataRekap[index].catatan = catatanKetik;[cite: 2]
        dataRekap[index].tanggalRealtime = formatTanggalIndonesia(waktuSekarangISO);[cite: 2]
        dataRekap[index].rawDate = waktuSekarangISO;[cite: 2]
        
        renderTable();[cite: 2]
        try { localStorage.setItem("dataRekap", JSON.stringify(dataRekap)); } catch(e){}[cite: 2]
    } catch (err) {
        alert("Gagal memperbarui data ke Supabase: " + err.message);[cite: 2]
    }
}

async function deleteRow(index) {
    const namaSiswa = dataRekap[index].nama;[cite: 2]
    if (!confirm(`Hapus data rekap ${namaSiswa} dari sistem Supabase?`)) return;[cite: 2]
    
    const btnDelete = document.getElementById(`btnDelete-${index}`);[cite: 2]
    if(btnDelete) btnDelete.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';[cite: 2]

    try {
        const { error } = await supabaseClient[cite: 2]
            .from('absensinsc')[cite: 2]
            .delete()[cite: 2]
            .eq('absensi', namaSiswa);[cite: 2]

        if (error) throw error;[cite: 2]

        dataRekap.splice(index, 1);[cite: 2]
        try { localStorage.setItem("dataRekap", JSON.stringify(dataRekap)); } catch(e){}[cite: 2]
        renderTable();[cite: 2]
    } catch (err) {
        alert("Gagal menghapus data dari Supabase: " + err.message);[cite: 2]
        if(btnDelete) btnDelete.innerHTML = '<i class="fa fa-trash"></i>';[cite: 2]
    }
}

async function simpan() {
    let nama = "";[cite: 2]
    if (selectNamaControl) { nama = selectNamaControl.getValue(); }[cite: 2]
    if (!nama) { nama = document.getElementById("nama").value; }[cite: 2]
    if (!nama) { alert("Silakan pilih nama siswa terlebih dahulu!"); return; }[cite: 2]

    const status = document.getElementById("status").value;[cite: 2]
    const catatan = document.getElementById("catatan").value;[cite: 2]
    const no_hp = document.getElementById("no_hp").value.trim();[cite: 2]
    const btnSimpan = document.getElementById("btnSimpan");[cite: 2]

    nama = nama.trim().toUpperCase();[cite: 2]
    btnSimpan.disabled = true;[cite: 2]
    btnSimpan.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Menyimpan...';[cite: 2]

    const catatanTeks = catatan.trim() !== "" ? catatan.trim() : "Absensi tercatat";[cite: 2]
    if (!Array.isArray(dataRekap)) { dataRekap = []; }[cite: 2]

    let siswaExist = dataRekap.find(s => s && s.nama === nama);[cite: 2]
    let nHadir = status === "Hadir" ? 1 : 0;[cite: 2]
    let nTidakHadir = status === "Tidak Hadir" ? 1 : 0;[cite: 2]

    if (siswaExist) {
        nHadir = (siswaExist.hadir || 0) + (status === "Hadir" ? 1 : 0);[cite: 2]
        nTidakHadir = (siswaExist.tidakHadir || 0) + (status === "Tidak Hadir" ? 1 : 0);[cite: 2]
    }

    const waktuSekarangISO = new Date().toISOString();[cite: 2]

    try {
        const { error: errorRekap } = await supabaseClient[cite: 2]
            .from("absensinsc")[cite: 2]
            .upsert({[cite: 2]
                absensi: nama,[cite: 2]
                Hadir: nHadir,[cite: 2]
                "Tidak Hadir": nTidakHadir.toString(),[cite: 2]
                Catatan: catatanTeks,[cite: 2]
                "Tanggal Terbaru": waktuSekarangISO,[cite: 2]
                no_hp: no_hp || (siswaExist ? siswaExist.no_hp : "")[cite: 2]
            }, {
                onConflict: "absensi"[cite: 2]
            });

        if (errorRekap) throw errorRekap;[cite: 2]

        const { error: errorLog } = await supabaseClient[cite: 2]
            .from("log_harian")[cite: 2]
            .insert({ nama: nama, status: status, catatan: catatanTeks });[cite: 2]

        if (errorLog) throw errorLog;[cite: 2]

        const realtimeSekarang = formatTanggalIndonesia(waktuSekarangISO);[cite: 2]

        if (siswaExist) {
            siswaExist.hadir = nHadir;[cite: 2]
            siswaExist.tidakHadir = nTarget = nTidakHadir;[cite: 2]
            siswaExist.catatan = catatanTeks;[cite: 2]
            siswaExist.tanggalRealtime = realtimeSekarang;[cite: 2]
            siswaExist.rawDate = waktuSekarangISO;[cite: 2]
            if(no_hp) siswaExist.no_hp = no_hp;[cite: 2]
        } else {
            dataRekap.push({
                nama: nama, hadir: nHadir, tidakHadir: nTidakHadir,[cite: 2]
                catatan: catatanTeks, tanggalRealtime: realtimeSekarang, rawDate: waktuSekarangISO, no_hp: no_hp[cite: 2]
            });
        }

        renderTable();[cite: 2]
        try { localStorage.setItem("dataRekap", JSON.stringify(dataRekap)); } catch (e) {}[cite: 2]

        if (selectNamaControl) { selectNamaControl.clear(true); } 
        else { document.getElementById("nama").value = ""; }[cite: 2]

        document.getElementById("catatan").value = "";[cite: 2]
        document.getElementById("no_hp").value = "";[cite: 2]
        alert("Data berhasil disimpan ke Rekap dan Log Harian!");[cite: 2]
    } catch (err) {
        console.error(err);[cite: 2]
        alert("Gagal menyimpan ke Supabase: " + err.message);[cite: 2]
    } finally {
        btnSimpan.disabled = false;[cite: 2]
        btnSimpan.innerHTML = '<i class="fa fa-plus-circle"></i> Simpan Data';[cite: 2]
    }
}

function showTab(tab, btn) {
    document.getElementById("input").classList.add("hidden");[cite: 2]
    document.getElementById("rekap").classList.add("hidden");[cite: 2]
    document.getElementById(tab).classList.remove("hidden");[cite: 2]
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));[cite: 2]
    btn.classList.add("active");[cite: 2]
}

function prosesUnduhFile(blob, namaFile) {
    try {
        const url = URL.createObjectURL(blob);[cite: 2]
        const a = document.createElement("a");[cite: 2]
        a.href = url;[cite: 2]
        a.download = namaFile;[cite: 2]
        a.style.display = 'none';[cite: 2]
        document.body.appendChild(a);[cite: 2]
        a.click();[cite: 2]
        setTimeout(() => {
            document.body.removeChild(a);[cite: 2]
            URL.revokeObjectURL(url);[cite: 2]
        }, 300);
    } catch (e) {
        alert("Gagal mengunduh file.");[cite: 2]
    }
}

function exportSiswaExcel(index) {
    const item = dataRekap[index];[cite: 2]
    const worksheetData = [
        ["LAPORAN ABSENSI INDIVIDU SISWA"],[cite: 2]
        ["Nona Swimming Course (NSC)"],[cite: 2]
        [],
        ["Komponen", "Keterangan"],[cite: 2]
        ["Nama Siswa", item.nama],[cite: 2]
        ["Jumlah Kehadiran", `${item.hadir} Pertemuan`],[cite: 2]
        ["Tidak Hadir", `${item.tidakHadir} Pertemuan`],[cite: 2]
        ["Status Target", item.hadir === TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir}/${TOTAL_PERTEMUAN}`],[cite: 2]
        ["Tanggal Terakhir Update", item.tanggalRealtime],[cite: 2]
        ["Catatan Terakhir", item.catatan || "-"][cite: 2]
    ];
    const wb = XLSX.utils.book_new();[cite: 2]
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);[cite: 2]
    XLSX.utils.book_append_sheet(wb, ws, "Absensi Siswa");[cite: 2]
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });[cite: 2]
    const blob = new Blob([wbout], { type: 'application/octet-stream' });[cite: 2]
    prosesUnduhFile(blob, `Absensi_${item.nama}.xlsx`);[cite: 2]
}

function exportSiswaPDF(index) {
    const item = dataRekap[index];[cite: 2]
    const { jsPDF } = window.jspdf;[cite: 2]
    const doc = new jsPDF();[cite: 2]
    
    doc.setFont("Helvetica", "bold");[cite: 2]
    doc.setFontSize(14);[cite: 2]
    doc.setTextColor(35, 74, 132);[cite: 2]
    doc.text("LAPORAN ABSENSI INDIVIDU SISWA", 14, 20);[cite: 2]
    
    const rows = [
        ["Nama Siswa", item.nama],[cite: 2]
        ["Total Kehadiran (Hadir)", `${item.hadir} Pertemuan`],[cite: 2]
        ["Total Tidak Hadir", `${item.tidakHadir} Pertemuan`],[cite: 2]
        ["Status Pertemuan", item.hadir === TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir}/${TOTAL_PERTEMUAN}`],[cite: 2]
        ["Tanggal Terakhir Diinput", item.tanggalRealtime],[cite: 2]
        ["Catatan Khusus", item.catatan || "-"][cite: 2]
    ];

    doc.autoTable({ startY: 28, head: [["Komponen Data", "Detail Keterangan"]], body: rows });[cite: 2]
    doc.save(`Absensi_${item.nama}.pdf`);[cite: 2]
}

function exportTotalPDF() {
    if (dataRekap.length === 0) { alert("Tidak ada data untuk diekspor!"); return; }[cite: 2]
    const { jsPDF } = window.jspdf;[cite: 2]
    const doc = new jsPDF();[cite: 2]
    
    doc.setFont("Helvetica", "bold");[cite: 2]
    doc.setFontSize(14);[cite: 2]
    doc.setTextColor(35, 74, 132);[cite: 2]
    doc.text("LAPORAN REKAP TOTAL KEHADIRAN", 14, 20);[cite: 2]
    
    const tableRows = [];[cite: 2]
    dataRekap.forEach(item => {
        tableRows.push([
            item.nama, item.hadir, item.tidakHadir,[cite: 2]
            item.hadir === TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir}/${TOTAL_PERTEMUAN}`,[cite: 2]
            item.tanggalRealtime, item.catatan || '-'[cite: 2]
        ]);
    });
    
    doc.autoTable({
        startY: 28,
        head: [["Nama Siswa", "Hadir", "Absen", "Rasio", "Tanggal Terbaru", "Catatan Terakhir"]],[cite: 2]
        body: tableRows,[cite: 2]
        theme: "striped"[cite: 2]
    });
    
    doc.save("Rekap_Total_Absensi_NSC.pdf");[cite: 2]
}

async function resetSemuaData() {
    if (!confirm("⚠️ PERINGATAN KERAS!\nApakah Anda yakin ingin MENGHAPUS TOTAL semua data absensi siswa dari database cloud Supabase?\n\nData yang dihapus tidak bisa dikembalikan!")) return;[cite: 2]
    if (!confirm("Konfirmasi terakhir: Benar-benar ingin mengosongkan semua rekap data?")) return;[cite: 2]

    const btnReset = document.getElementById("btnResetAll");[cite: 2]
    if (btnReset) {[cite: 2]
        btnReset.disabled = true;[cite: 2]
        btnReset.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Mereset...';[cite: 2]
    }

    try {
        const { data: listSiswa, error: fetchError } = await supabaseClient[cite: 2]
            .from('absensinsc')[cite: 2]
            .select('absensi');[cite: 2]

        if (fetchError) throw fetchError;[cite: 2]

        if (listSiswa && listSiswa.length > 0) {[cite: 2]
            const listNama = listSiswa.map(s => s.absensi);[cite: 2]
            const { error: errorDeleteRekap } = await supabaseClient[cite: 2]
                .from('absensinsc')[cite: 2]
                .delete()[cite: 2]
                .in('absensi', listNama);[cite: 2]
            if (errorDeleteRekap) throw errorDeleteRekap;[cite: 2]
        }

        dataRekap = [];[cite: 2]
        try { localStorage.setItem("dataRekap", JSON.stringify(dataRekap)); } catch(e){}[cite: 2]
        renderTable();[cite: 2]
        alert("Database Absensi Berhasil Dikosongkan!");[cite: 2]
    } catch (err) {
        alert("Gagal mereset: " + err.message);[cite: 2]
    } finally {
        if (btnReset) {[cite: 2]
            btnReset.disabled = false;[cite: 2]
            btnReset.innerHTML = '<i class="fa fa-trash-can"></i> Reset';[cite: 2]
        }
    }
}

function keluarkanSiswa(nama) {
    if(!confirm("Keluarkan siswa " + nama + " dari les renang?\n\nData absensi tetap tersimpan.")) return;[cite: 2]

    let siswaAktif = JSON.parse(localStorage.getItem("siswaAktif")) || [];[cite: 2]
    siswaAktif = siswaAktif.filter(s => s !== nama);[cite: 2]
    localStorage.setItem("siswaAktif", JSON.stringify(siswaAktif));[cite: 2]

    dataRekap = dataRekap.filter(x => x.nama !== nama);[cite: 2]
    localStorage.setItem("dataRekap", JSON.stringify(dataRekap));[cite: 2]
    renderTable();[cite: 2]
    alert(nama + " sudah dikeluarkan dari daftar siswa aktif.");[cite: 2]
}
