const TOTAL_PERTEMUAN = 12; // Total target pertemuan les

// Inisialisasi Supabase Client
const SUPABASE_URL = "https://mjfwgmhuengvfdagbcsk.supabase.co";[cite: 3]
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZndgmWh1ZW5ndmZkYWdiY3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMDczMTMsImV4cCI6MjA5Njg4MzMxM30.NxZY9zHP9zQmHRsgpcGZyk3t7_xaGFFuTa3bYIAD384";[cite: 3]
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);[cite: 3]

let dataRekap = [];[cite: 3]
let selectNamaControl;[cite: 3]

// Nama hari dan bulan lokal Indonesia
const namaHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];[cite: 3]
const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];[cite: 3]

// Fungsi pembantu untuk memformat tanggal realtime ke teks Indonesia[cite: 3]
function formatTanggalIndonesia(timestamp) {
    if (!timestamp) return "Belum Ada Tanggal";[cite: 3]
    const dateObj = new Date(timestamp);[cite: 3]
    if (isNaN(dateObj.getTime())) return timestamp;[cite: 3]
    
    const hari = namaHari[dateObj.getDay()];[cite: 3]
    const tanggal = dateObj.getDate();[cite: 3]
    const bulan = namaBulan[dateObj.getMonth()];[cite: 3]
    const tahun = dateObj.getFullYear();[cite: 3]
    
    return `${hari}, ${tanggal} ${bulan} ${tahun}`;[cite: 3]
}

// Fungsi untuk Jam dan Tanggal Realtime di Pojok Atas Aplikasi Utama[cite: 3]
function updateJamRealtime() {
    const sekarang = new Date();[cite: 3]
    
    const jam = String(sekarang.getHours()).padStart(2, '0');[cite: 3]
    const menit = String(sekarang.getMinutes()).padStart(2, '0');[cite: 3]
    const detik = String(sekarang.getSeconds()).padStart(2, '0');[cite: 3]
    
    const jamEl = document.getElementById("jamRealtime");[cite: 3]
    if (jamEl) jamEl.innerText = `${jam}.${menit}.${detik}`;[cite: 3]
    
    const tanggalEl = document.getElementById("tanggalRealtime");[cite: 2, 3]
    if (tanggalEl) tanggalEl.innerText = formatTanggalIndonesia(sekarang);[cite: 3]
}

document.addEventListener("DOMContentLoaded", function() {
    // Jalankan pengecekan session pertama kali sebelum merender apa pun
    checkLoginSession();

    try {
        selectNamaControl = new TomSelect("#nama", {[cite: 3]
            create: true, 
            sortField: { field: "text", direction: "asc" },[cite: 3]
            placeholder: "Ketik / Pilih Nama Siswa...",[cite: 3]
            allowEmptyOption: true,[cite: 3]
            onChange: function(value) {[cite: 3]
                if(value) {[cite: 3]
                    if(selectNamaControl) { selectNamaControl.blur(); }[cite: 3]
                    document.activeElement.blur(); 
                }
            }
        });
    } catch(e) { console.warn("TomSelect belum siap."); }

    const loginForm = document.getElementById("loginForm");[cite: 3]
    if (loginForm) {[cite: 3]
        // Hapus listener lama jika ada, ganti dengan penanganan intercept ketat
        loginForm.onsubmit = function(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            handleLogin(event);
            return false;
        };
    }
    
    updateJamRealtime();[cite: 3]
    setInterval(updateJamRealtime, 1000);[cite: 3]
});

// MEMUAT DATA DARI SUPABASE[cite: 3]
async function muatDataDariCloud() {
    const tbody = document.getElementById("tbody");[cite: 3]
    try {
        if (tbody) {[cite: 3]
            tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; color:#234a84;'><i class='fa fa-spinner fa-spin'></i> Menyinkronkan data terbaru dari Cloud Supabase...</td></tr>";[cite: 3]
        }

        const { data, error } = await supabaseClient[cite: 3]
            .from('absensinsc')[cite: 3]
            .select('*')[cite: 3]
            .order('absensi', { ascending: true });[cite: 3]

        if (error) throw error;[cite: 3]

        if (data && data.length > 0) {[cite: 3]
            dataRekap = data.map(item => {[cite: 3]
                let rawDateSource = item["Tanggal Terbaru"] || item.created_at || new Date().toISOString();[cite: 3]
                return {
                    nama: item.absensi ? item.absensi.toString().toUpperCase().trim() : "TANPA NAMA",[cite: 3]
                    hadir: parseInt(item.Hadir) || 0,[cite: 3]
                    tidakHadir: parseInt(item["Tidak Hadir"] || item.id_tidak_hadir || item.status) || 0,[cite: 3]
                    catatan: item.Catatan || "",[cite: 3]
                    no_hp: item.no_hp || "",[cite: 3]
                    tanggalRealtime: formatTanggalIndonesia(rawDateSource),[cite: 3]
                    rawDate: rawDateSource[cite: 3]
                };
            });
        } else {
            dataRekap = [];[cite: 3]
        }
        
        try { localStorage.setItem("dataRekap", JSON.stringify(dataRekap)); } catch(e){}[cite: 3]
        renderTable();[cite: 3]
    } catch (e) { 
        console.error("Gagal memuat dari Cloud Supabase:", e);[cite: 3]
        dataRekap = JSON.parse(localStorage.getItem("dataRekap")) || [];[cite: 3]
        renderTable();[cite: 3]
    }
}

function togglePasswordVisibility() {[cite: 3]
    const passwordInput = document.getElementById("loginPassword");[cite: 3]
    const eyeIcon = document.getElementById("eyeIcon");[cite: 3]
    if (passwordInput.type === "password") {[cite: 3]
        passwordInput.type = "text";[cite: 3]
        eyeIcon.classList.replace("fa-eye", "fa-eye-slash");[cite: 3]
    } else {
        passwordInput.type = "password";[cite: 3]
        eyeIcon.classList.replace("fa-eye-slash", "fa-eye");[cite: 3]
    }
}

// LOGIN UTAMA ANTI REFRESH
async function handleLogin(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const emailEl = document.getElementById("loginEmail");[cite: 3]
    const passwordEl = document.getElementById("loginPassword");[cite: 3]
    
    if (!emailEl || !passwordEl) return false;[cite: 3]

    const email = emailEl.value.trim().toLowerCase();[cite: 3]
    const password = passwordEl.value;[cite: 3]

    if (email === "nonaswimmingcourse@gmail.com" && password === "nonaswimmingcourse") {
        localStorage.setItem("isLoggedIn", "true");
        
        // Eksekusi paksa perubahan UI tanpa menunggu reload browser
        gantiTampilanHalamanMaju();
        muatDataDariCloud();[cite: 3]
    } else {
        alert("Akses ditolak! Akun atau Password salah.");[cite: 3]
    }
    return false;
}

// Fungsi pembantu pemindah tampilan untuk mengunci CSS ketat
function gantiTampilanHalamanMaju() {
    const loginSection = document.getElementById("loginSection");[cite: 3]
    const mainAppSection = document.getElementById("mainAppSection");[cite: 3]
    
    if (loginSection) {
        loginSection.style.display = "none";
        loginSection.classList.add("hidden");[cite: 3]
    }
    if (mainAppSection) {
        mainAppSection.style.display = "block";
        mainAppSection.classList.remove("hidden");[cite: 3]
    }
}

function handleLogout() {[cite: 3]
    if(confirm("Apakah Anda yakin ingin keluar?")) {[cite: 3]
        try { 
            localStorage.removeItem("isLoggedIn");[cite: 3]
        } catch(e){}
        window.location.reload();[cite: 3]
    }
}

// MENGECEK APAKAH LOGIN AKTIF ATAU TIDAK (DIPERKETAT)
function checkLoginSession() {
    if(localStorage.getItem("isLoggedIn") === "true") {[cite: 3]
        // Jalankan pemindahan DOM dengan jeda mikro agar DOM HTML ter-render sempurna terlebih dahulu
        setTimeout(() => {
            gantiTampilanHalamanMaju();
            muatDataDariCloud();[cite: 3]
        }, 50);
    }
}

// MENAMPILKAN TABEL REKAP UTAMA[cite: 3]
function renderTable() {
    let html = "";[cite: 3]
    const tbody = document.getElementById("tbody");
    if (!tbody) return;

    if(!dataRekap || dataRekap.length === 0) {[cite: 3]
        html = "<tr><td colspan='6' style='text-align:center; color:#94a3b8;'>Belum ada data rekap.</td></tr>";[cite: 3]
    } else {
        dataRekap.forEach((item, index) => {[cite: 3]
            let totalTeks = item.hadir === TOTAL_PERTEMUAN[cite: 3]
                ? `<span class="total-lengkap">LENGKAP</span>`[cite: 3]
                : `<span class="total-fraction">${item.hadir}/${TOTAL_PERTEMUAN}</span>`;[cite: 3]

            html += `
            <tr>
                <td style="font-weight: 500;">${item.nama}</td>[cite: 3]
                <td>
                    <div class="counter-box">
                        <button class="counter-btn" onclick="updateCounter(${index}, 'hadir', -1)">-</button>[cite: 3]
                        <span class="counter-val hadir-val">${item.hadir}</span>[cite: 3]
                        <button class="counter-btn" onclick="updateCounter(${index}, 'hadir', 1)">+</button>[cite: 3]
                    </div>
                </td>
                <td>
                    <div class="counter-box">
                        <button class="counter-btn" onclick="updateCounter(${index}, 'tidakHadir', -1)">-</button>[cite: 3]
                        <span class="counter-val tidak-val">${item.tidakHadir}</span>[cite: 3]
                        <button class="counter-btn" onclick="updateCounter(${index}, 'tidakHadir', 1)">+</button>[cite: 3]
                    </div>
                </td>
                <td>${totalTeks}</td>[cite: 3]
                <td style="color: #475569; font-size: 14px;">${item.tanggalRealtime}</td>[cite: 3]
                <td>
                    <div class="actions-cell">
                        <button onclick="prosesDanKirimCloudPDF(${index})" class="btn-action btn-wa" title="Kirim Laporan PDF Resmi via WhatsApp" id="btnWa-${index}">[cite: 3]
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button class="btn-action btn-excel" title="Download Excel Harian Siswa" onclick="exportSiswaExcel(${index})"><i class="fa fa-file-excel"></i></button>[cite: 3]
                        <button class="btn-action btn-pdf" title="Download PDF Harian Siswa" onclick="exportSiswaPDF(${index})"><i class="fa fa-file-pdf"></i></button>[cite: 3]
                        <button class="btn-action btn-delete" title="Hapus Data Siswa" id="btnDelete-${index}" onclick="deleteRow(${index})"><i class="fa fa-trash"></i></button>[cite: 3]
                    </div>
                </td>
            </tr>`;
        });
    }
    tbody.innerHTML = html;[cite: 3]
    const totalPertemuanText = document.getElementById("totalPertemuanText");
    if (totalPertemuanText) totalPertemuanText.innerText = `Total ${TOTAL_PERTEMUAN} Pertemuan Les Renang`;[cite: 3]
}

// FUNGSI UTAMA WHATSAPP DAN FALLBACK[cite: 3]
async function prosesDanKirimCloudPDF(index) {
    const item = dataRekap[index];[cite: 3]
    const btnWa = document.getElementById(`btnWa-${index}`);[cite: 3]
    let nomorWA = item.no_hp || "";[cite: 3]
    if (!nomorWA) { alert("Nomor HP orang tua belum diisi!"); return; }[cite: 3]
    if (nomorWA.startsWith('0')) nomorWA = '62' + nomorWA.slice(1);[cite: 3]
    nomorWA = nomorWA.replace(/[^0-9]/g, "");[cite: 3]

    const iconAsli = btnWa.innerHTML;[cite: 3]
    btnWa.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';[cite: 3]
    btnWa.style.pointerEvents = 'none';[cite: 3]

    const generatePDFBlob = () => {
        return new Promise((resolve) => {
            const { jsPDF } = window.jspdf;[cite: 3]
            const doc = new jsPDF();[cite: 3]
            doc.setFont("Helvetica", "bold").setFontSize(14).setTextColor(35, 74, 132);[cite: 3]
            doc.text("LAPORAN ABSENSI INDIVIDU SISWA", 14, 20);[cite: 3]
            doc.setFontSize(10).setFont("Helvetica", "normal").setTextColor(100, 100, 100);[cite: 3]
            doc.text("Nona Swimming Course (NSC)", 14, 27);[cite: 3]
            
            const rows = [
                ["Nama Siswa", item.nama],[cite: 3]
                ["Total Kehadiran", `${item.hadir} Pertemuan`],[cite: 3]
                ["Total Tidak Hadir", `${item.tidakHadir} Pertemuan`],[cite: 3]
                ["Tanggal Terakhir", item.tanggalRealtime || "-"],[cite: 3]
                ["Catatan", item.catatan || "-"][cite: 3]
            ];
            doc.autoTable({ startY: 33, head: [["Komponen", "Detail"]], body: rows, theme: "striped", headStyles: { fillColor: [35, 74, 132] } });[cite: 3]
            resolve(doc.output('blob'));[cite: 3]
        });
    };

    try {
        const pdfBlob = await generatePDFBlob();[cite: 3]
        const namaFileCloud = `Absensi_${item.nama.replace(/\s+/g, '_')}_${Date.now()}.pdf`;[cite: 3]

        const { data: uploadData, error: uploadError } = await supabaseClient.storage.from('laporan-pdf').upload(namaFileCloud, pdfBlob, { contentType: 'application/pdf', upsert: true });[cite: 3]
        
        if (uploadError) throw uploadError;[cite: 3]

        const { data: urlData } = supabaseClient.storage.from('laporan-pdf').getPublicUrl(namaFileCloud);[cite: 3]
        let pesanWA = `Halo Bapak/Ibu, berikut laporan absensi resmi Ananda *${item.nama}* di *Nona Swimming Course*. \n\nTotal Hadir: *${item.hadir}* Pertemuan\nTidak Hadir: *${item.tidakHadir}* Pertemuan\n\nSilakan klik link berikut untuk melihat/mengunduh PDF:\n${urlData.publicUrl}\n\nTerima kasih.`;[cite: 3]
        window.open(`https://api.whatsapp.com/send?phone=${nomorWA}&text=${encodeURIComponent(pesanWA)}`, '_blank');[cite: 3]

    } catch (e) {
        console.warn("Mengaktifkan sistem aman fallback download lokal...");[cite: 3]
        const pdfBlob = await generatePDFBlob();[cite: 3]
        const urlLokal = window.URL.createObjectURL(pdfBlob);[cite: 3]
        
        const a = document.createElement('a');[cite: 3]
        a.href = urlLokal;[cite: 3]
        a.download = `Laporan_Absensi_${item.nama}.pdf`;[cite: 3]
        document.body.appendChild(a);[cite: 3]
        a.click();[cite: 3]
        document.body.removeChild(a);[cite: 3]

        let pesanWA = `Halo Bapak/Ibu, berikut ringkasan laporan absensi resmi Ananda *${item.nama}* di *Nona Swimming Course*.\n\n✓ Total Kehadiran: *${item.hadir}* Pertemuan\n✓ Tidak Hadir: *${item.tidakHadir}* Pertemuan\n✓ Tanggal Rekap: ${item.tanggalRealtime || '-'}\n✓ Catatan: _${item.catatan || 'Tercatat dengan baik'}_\n\n*Dokumen PDF resmi baru saja diunduh otomatis di perangkat Admin dan akan dikirimkan langsung oleh admin via chat.* \n\nTerima kasih atas perhatiannya.`;[cite: 3]
        window.open(`https://api.whatsapp.com/send?phone=${nomorWA}&text=${encodeURIComponent(pesanWA)}`, '_blank');[cite: 3]
    } finally {
        btnWa.innerHTML = iconAsli;[cite: 3]
        btnWa.style.pointerEvents = 'auto';[cite: 3]
    }
}

// UPDATE COUNTER + DAN -
async function updateCounter(index, tipe, value) {
    const targetSiswa = dataRekap[index];[cite: 3]
    const namaSiswa = targetSiswa.nama;[cite: 3]
    let catatanKetik = "";[cite: 3]
    
    let baruHadir = targetSiswa.hadir;[cite: 3]
    let baruTidakHadir = targetSiswa.tidakHadir;[cite: 3]

    if (value > 0) {
        let inputCatatan = prompt(`Masukkan Catatan Baru untuk ${namaSiswa}:`, `Update manual via counter`);[cite: 3]
        if (inputCatatan === null) return; 
        catatanKetik = inputCatatan.trim() === "" ? `Update manual via counter` : inputCatatan.trim();[cite: 3]
        
        if (tipe === 'hadir') baruHadir += 1;[cite: 3]
        else baruTidakHadir += 1;[cite: 3]
    } else {
        if (tipe === 'hadir') {[cite: 3]
            if (baruHadir === 0) return;[cite: 3]
            baruHadir -= 1;[cite: 3]
        } else {
            if (baruTidakHadir === 0) return;[cite: 3]
            baruTidakHadir -= 1;[cite: 3]
        }
        catatanKetik = `Pengurangan manual via counter`;[cite: 3]
    }

    if (baruHadir === 0 && baruTidakHadir === 0) {[cite: 3]
        alert(`Rekap data ${namaSiswa} bernilai 0. Siswa akan otomatis dihapus dari sistem.`);[cite: 3]
        await deleteRow(index);[cite: 3]
        return;
    }

    const waktuSekarangISO = new Date().toISOString();[cite: 3]

    try {
        const { error } = await supabaseClient[cite: 3]
            .from("absensinsc")[cite: 3]
            .upsert({[cite: 3]
                absensi: namaSiswa,[cite: 3]
                Hadir: baruHadir,[cite: 3]
                "Tidak Hadir": baruTidakHadir.toString(),[cite: 3]
                Catatan: catatanKetik,[cite: 3]
                "Tanggal Terbaru": waktuSekarangISO[cite: 3]
            }, {
                onConflict: "absensi"[cite: 3]
            });

        if (error) throw error;[cite: 3]
        
        dataRekap[index].hadir = baruHadir;[cite: 3]
        dataRekap[index].tidakHadir = baruTidakHadir;[cite: 3]
        dataRekap[index].catatan = catatanKetik;[cite: 3]
        dataRekap[index].tanggalRealtime = formatTanggalIndonesia(waktuSekarangISO);[cite: 3]
        dataRekap[index].rawDate = waktuSekarangISO;[cite: 3]
        
        renderTable();[cite: 3]
        try { localStorage.setItem("dataRekap", JSON.stringify(dataRekap)); } catch(e){}[cite: 3]
    } catch (err) {
        alert("Gagal memperbarui data ke Supabase: " + err.message);[cite: 3]
    }
}

async function deleteRow(index) {
    const namaSiswa = dataRekap[index].nama;[cite: 3]
    if (!confirm(`Hapus data rekap ${namaSiswa} dari sistem Supabase?`)) return;[cite: 3]
    
    const btnDelete = document.getElementById(`btnDelete-${index}`);[cite: 3]
    if(btnDelete) btnDelete.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';[cite: 3]

    try {
        const { error } = await supabaseClient[cite: 3]
            .from('absensinsc')[cite: 3]
            .delete()[cite: 3]
            .eq('absensi', namaSiswa);[cite: 3]

        if (error) throw error;[cite: 3]

        dataRekap.splice(index, 1);[cite: 3]
        try { localStorage.setItem("dataRekap", JSON.stringify(dataRekap)); } catch(e){}[cite: 3]
        renderTable();[cite: 3]
    } catch (err) {
        alert("Gagal menghapus data dari Supabase: " + err.message);[cite: 3]
        if(btnDelete) btnDelete.innerHTML = '<i class="fa fa-trash"></i>';[cite: 3]
    }
}

async function simpan() {
    let nama = "";[cite: 3]
    if (selectNamaControl) { nama = selectNamaControl.getValue(); }[cite: 3]
    if (!nama) { nama = document.getElementById("nama").value; }[cite: 3]
    if (!nama) { alert("Silakan pilih nama siswa terlebih dahulu!"); return; }[cite: 3]

    const status = document.getElementById("status").value;[cite: 3]
    const catatan = document.getElementById("catatan").value;[cite: 3]
    const no_hp = document.getElementById("no_hp").value.trim();[cite: 3]
    const btnSimpan = document.getElementById("btnSimpan");[cite: 3]

    nama = nama.trim().toUpperCase();[cite: 3]
    btnSimpan.disabled = true;[cite: 3]
    btnSimpan.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Menyimpan...';[cite: 3]

    const catatanTeks = catatan.trim() !== "" ? catatan.trim() : "Absensi tercatat";[cite: 3]
    if (!Array.isArray(dataRekap)) { dataRekap = []; }[cite: 3]

    let siswaExist = dataRekap.find(s => s && s.nama === nama);[cite: 3]
    let nHadir = status === "Hadir" ? 1 : 0;[cite: 3]
    let nTidakHadir = status === "Tidak Hadir" ? 1 : 0;[cite: 3]

    if (siswaExist) {
        nHadir = (siswaExist.hadir || 0) + (status === "Hadir" ? 1 : 0);[cite: 3]
        nTidakHadir = (siswaExist.tidakHadir || 0) + (status === "Tidak Hadir" ? 1 : 0);[cite: 3]
    }

    const waktuSekarangISO = new Date().toISOString();[cite: 3]

    try {
        const { error: errorRekap } = await supabaseClient[cite: 3]
            .from("absensinsc")[cite: 3]
            .upsert({[cite: 3]
                absensi: nama,[cite: 3]
                Hadir: nHadir,[cite: 3]
                "Tidak Hadir": nTidakHadir.toString(),[cite: 3]
                Catatan: catatanTeks,[cite: 3]
                "Tanggal Terbaru": waktuSekarangISO,[cite: 3]
                no_hp: no_hp || (siswaExist ? siswaExist.no_hp : "")[cite: 3]
            }, {
                onConflict: "absensi"[cite: 3]
            });

        if (errorRekap) throw errorRekap;[cite: 3]

        const { error: errorLog } = await supabaseClient[cite: 3]
            .from("log_harian")[cite: 3]
            .insert({ nama: nama, status: status, catatan: catatanTeks });[cite: 3]

        if (errorLog) throw errorLog;[cite: 3]

        const realtimeSekarang = formatTanggalIndonesia(waktuSekarangISO);[cite: 3]

        if (siswaExist) {
            siswaExist.hadir = nHadir;[cite: 3]
            siswaExist.tidakHadir = nTidakHadir;[cite: 3]
            siswaExist.catatan = catatanTeks;[cite: 3]
            siswaExist.tanggalRealtime = realtimeSekarang;[cite: 3]
            siswaExist.rawDate = waktuSekarangISO;[cite: 3]
            if(no_hp) siswaExist.no_hp = no_hp;[cite: 3]
        } else {
            dataRekap.push({
                nama: nama, hadir: nHadir, tidakHadir: nTidakHadir,[cite: 3]
                catatan: catatanTeks, tanggalRealtime: realtimeSekarang, rawDate: waktuSekarangISO, no_hp: no_hp[cite: 3]
            });
        }

        renderTable();[cite: 3]
        try { localStorage.setItem("dataRekap", JSON.stringify(dataRekap)); } catch (e) {}[cite: 3]

        if (selectNamaControl) { selectNamaControl.clear(true); } 
        else { document.getElementById("nama").value = ""; }[cite: 3]

        document.getElementById("catatan").value = "";[cite: 3]
        document.getElementById("no_hp").value = "";[cite: 3]
        alert("Data berhasil disimpan ke Rekap dan Log Harian!");[cite: 3]
    } catch (err) {
        console.error(err);[cite: 3]
        alert("Gagal menyimpan ke Supabase: " + err.message);[cite: 3]
    } finally {
        btnSimpan.disabled = false;[cite: 3]
        btnSimpan.innerHTML = '<i class="fa fa-plus-circle"></i> Simpan Data';[cite: 3]
    }
}

function showTab(tab, btn) {[cite: 3]
    document.getElementById("input").classList.add("hidden");[cite: 3]
    document.getElementById("rekap").classList.add("hidden");[cite: 3]
    document.getElementById(tab).classList.remove("hidden");[cite: 3]
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));[cite: 3]
    btn.classList.add("active");[cite: 3]
}

function prosesUnduhFile(blob, namaFile) {[cite: 3]
    try {
        const url = URL.createObjectURL(blob);[cite: 3]
        const a = document.createElement("a");[cite: 3]
        a.href = url;[cite: 3]
        a.download = namaFile;[cite: 3]
        a.style.display = 'none';[cite: 3]
        document.body.appendChild(a);[cite: 3]
        a.click();[cite: 3]
        setTimeout(() => {
            document.body.removeChild(a);[cite: 3]
            URL.revokeObjectURL(url);[cite: 3]
        }, 300);
    } catch (e) {
        alert("Gagal mengunduh file.");[cite: 3]
    }
}

function exportSiswaExcel(index) {[cite: 3]
    const item = dataRekap[index];[cite: 3]
    const worksheetData = [
        ["LAPORAN ABSENSI INDIVIDU SISWA"],[cite: 3]
        ["Nona Swimming Course (NSC)"],[cite: 3]
        [],
        ["Komponen", "Keterangan"],[cite: 3]
        ["Nama Siswa", item.nama],[cite: 3]
        ["Jumlah Kehadiran", `${item.hadir} Pertemuan`],[cite: 3]
        ["Tidak Hadir", `${item.tidakHadir} Pertemuan`],[cite: 3]
        ["Status Target", item.hadir === TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir}/${TOTAL_PERTEMUAN}`],[cite: 3]
        ["Tanggal Terakhir Update", item.tanggalRealtime],[cite: 3]
        ["Catatan Terakhir", item.catatan || "-"][cite: 3]
    ];
    const wb = XLSX.utils.book_new();[cite: 3]
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);[cite: 3]
    XLSX.utils.book_append_sheet(wb, ws, "Absensi Siswa");[cite: 3]
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });[cite: 3]
    const blob = new Blob([wbout], { type: 'application/octet-stream' });[cite: 3]
    prosesUnduhFile(blob, `Absensi_${item.nama}.xlsx`);[cite: 3]
}

function exportSiswaPDF(index) {[cite: 3]
    const item = dataRekap[index];[cite: 3]
    const { jsPDF } = window.jspdf;[cite: 3]
    const doc = new jsPDF();[cite: 3]
    
    doc.setFont("Helvetica", "bold");[cite: 3]
    doc.setFontSize(14);[cite: 2, 3]
    doc.setTextColor(35, 74, 132);[cite: 3]
    doc.text("LAPORAN ABSENSI INDIVIDU SISWA", 14, 20);[cite: 3]
    
    const rows = [
        ["Nama Siswa", item.nama],[cite: 3]
        ["Total Kehadiran (Hadir)", `${item.hadir} Pertemuan`],[cite: 3]
        ["Total Tidak Hadir", `${item.tidakHadir} Pertemuan`],[cite: 3]
        ["Status Pertemuan", item.hadir === TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir}/${TOTAL_PERTEMUAN}`],[cite: 3]
        ["Tanggal Terakhir Diinput", item.tanggalRealtime],[cite: 3]
        ["Catatan Khusus", item.catatan || "-"][cite: 3]
    ];

    doc.autoTable({ startY: 28, head: [["Komponen Data", "Detail Keterangan"]], body: rows });[cite: 3]
    doc.save(`Absensi_${item.nama}.pdf`);[cite: 3]
}

function exportTotalPDF() {[cite: 3]
    if (dataRekap.length === 0) { alert("Tidak ada data untuk diekspor!"); return; }[cite: 3]
    const { jsPDF } = window.jspdf;[cite: 3]
    const doc = new jsPDF();[cite: 3]
    
    doc.setFont("Helvetica", "bold");[cite: 3]
    doc.setFontSize(14);[cite: 2, 3]
    doc.setTextColor(35, 74, 132);[cite: 3]
    doc.text("LAPORAN REKAP TOTAL KEHADIRAN", 14, 20);[cite: 3]
    
    const tableRows = [];[cite: 3]
    dataRekap.forEach(item => {
        tableRows.push([
            item.nama, item.hadir, item.tidakHadir,[cite: 3]
            item.hadir === TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir}/${TOTAL_PERTEMUAN}`,[cite: 3]
            item.tanggalRealtime, item.catatan || '-'[cite: 3]
        ]);
    });
    
    doc.autoTable({
        startY: 28,
        head: [["Nama Siswa", "Hadir", "Absen", "Rasio", "Tanggal Terbaru", "Catatan Terakhir"]],[cite: 3]
        body: tableRows,[cite: 3]
        theme: "striped"[cite: 3]
    });
    
    doc.save("Rekap_Total_Absensi_NSC.pdf");[cite: 3]
}

async function resetSemuaData() {[cite: 3]
    if (!confirm("⚠️ PERINGATAN KERAS!\nApakah Anda yakin ingin MENGHAPUS TOTAL semua data absensi siswa dari database cloud Supabase?\n\nData yang dihapus tidak bisa dikembalikan!")) return;[cite: 3]
    if (!confirm("Konfirmasi terakhir: Benar-benar ingin mengosongkan semua rekap data?")) return;[cite: 3]

    const btnReset = document.getElementById("btnResetAll");[cite: 3]
    if (btnReset) {[cite: 3]
        btnReset.disabled = true;[cite: 3]
        btnReset.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Mereset...';[cite: 3]
    }

    try {
        const { data: listSiswa, error: fetchError } = await supabaseClient[cite: 3]
            .from('absensinsc')[cite: 3]
            .select('absensi');[cite: 3]

        if (fetchError) throw fetchError;[cite: 3]

        if (listSiswa && listSiswa.length > 0) {[cite: 3]
            const listNama = listSiswa.map(s => s.absensi);[cite: 3]
            const { error: errorDeleteRekap } = await supabaseClient[cite: 3]
                .from('absensinsc')[cite: 3]
                .delete()[cite: 3]
                .in('absensi', listNama);[cite: 3]
            if (errorDeleteRekap) throw errorDeleteRekap;[cite: 3]
        }

        dataRekap = [];[cite: 3]
        try { localStorage.setItem("dataRekap", JSON.stringify(dataRekap)); } catch(e){}[cite: 3]
        renderTable();[cite: 3]
        alert("Database Absensi Berhasil Dikosongkan!");[cite: 3]
    } catch (err) {
        alert("Gagal mereset: " + err.message);[cite: 3]
    } finally {
        if (btnReset) {[cite: 3]
            btnReset.disabled = false;[cite: 3]
            btnReset.innerHTML = '<i class="fa fa-trash-can"></i> Reset';[cite: 3]
        }
    }
}

function keluarkanSiswa(nama) {[cite: 3]
    if(!confirm("Keluarkan siswa " + nama + " dari les renang?\n\nData absensi tetap tersimpan.")) return;[cite: 3]

    let siswaAktif = JSON.parse(localStorage.getItem("siswaAktif")) || [];[cite: 3]
    siswaAktif = siswaAktif.filter(s => s !== nama);[cite: 3]
    localStorage.setItem("siswaAktif", JSON.stringify(siswaAktif));[cite: 3]

    dataRekap = dataRekap.filter(x => x.nama !== nama);[cite: 3]
    localStorage.setItem("dataRekap", JSON.stringify(dataRekap));[cite: 3]
    renderTable();[cite: 3]
    alert(nama + " sudah dikeluarkan dari daftar siswa aktif.");[cite: 3]
}
