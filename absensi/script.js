const TOTAL_PERTEMUAN = 12;

// Inisialisasi Supabase Client
const SUPABASE_URL = "https://mjfwgmhuengvfdagbcsk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZndnbWh1ZW5ndmZkYWdiY3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMDczMTMsImV4cCI6MjA5Njg4MzMxM30.NxZY9zHP9zQmHRsgpcGZyk3t7_xaGFFuTa3bYIAD384";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let dataRekap = [];
let selectNamaControl;

const namaHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

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

    checkLoginSession();
    muatDataDariCloud();
    
    updateJamRealtime();
    setInterval(updateJamRealtime, 1000);
});

// MEMUAT DATA DARI SUPABASE (Disinkronkan dengan Gambar Tabel Database)
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
                    tidakHadir: parseInt(item["Tidak Hadir"]) || 0,
                    catatan: item.Catatan || "",
                    no_hp: item.no_hp || "",
                    tanggalRealtime: formatTanggalIndonesia(rawDateSource),
                    rawDate: rawDateSource
                };
            });
        } else {
            dataRekap = [];
        }
        
        localStorage.setItem("dataRekap", JSON.stringify(dataRekap));
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
    if (event) event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value.trim();

    if (
        email === "nonaswimmingcourse@gmail.com" &&
        password === "Rombel007@"
    ) {
        localStorage.setItem("isLoggedIn", "true");
        document.getElementById("loginSection").classList.add("hidden");
        document.getElementById("mainAppSection").classList.remove("hidden");
        muatDataDariCloud();
        alert("Login berhasil");
    } else {
        alert("Akses ditolak! Email atau Password salah.");
    }
}


function handleLogout() {
    if(confirm("Apakah Anda yakin ingin keluar?")) {
        localStorage.removeItem("isLoggedIn"); 
        window.location.reload();
    }
}

function checkLoginSession() {
    if(localStorage.getItem("isLoggedIn") === "true") {
        if(document.getElementById("loginSection")) document.getElementById("loginSection").classList.add("hidden");
        if(document.getElementById("mainAppSection")) document.getElementById("mainAppSection").classList.remove("hidden");
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

            let nomorWA = item.no_hp || ""; 
            if (nomorWA.startsWith('0')) {
                nomorWA = '62' + nomorWA.slice(1);
            }

            let pesanWA = `Halo Bapak/Ibu, berikut laporan absensi Ananda *${item.nama}* di *Nona Swimming Course*.

Total Hadir: *${item.hadir}* Pertemuan
Tidak Hadir: *${item.tidakHadir}* Pertemuan
Status Target: *${item.hadir === TOTAL_PERTEMUAN ? "LENGKAP" : item.hadir + "/" + TOTAL_PERTEMUAN}*
Catatan: _${item.catatan || '-'}_

Terima kasih.`;
            let linkWA = `https://api.whatsapp.com/send?phone=${nomorWA}&text=${encodeURIComponent(pesanWA)}`;

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
                        <a href="${linkWA}" target="_blank" class="btn-action btn-wa" title="Kirim Laporan ke WhatsApp Orang Tua">
                            <i class="fab fa-whatsapp"></i>
                        </a>
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
                nama: namaSiswa, // Menjamin kolom 'nama' ikut terisi aman
                Hadir: baruHadir.toString(), // Diubah ke String sesuai struktur DB Anda
                "Tidak Hadir": baruTidakHadir.toString(),
                Catatan: catatanKetik,
                "Tanggal Terbaru": waktuSekarangISO,
                no_hp: targetSiswa.no_hp
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
        localStorage.setItem("dataRekap", JSON.stringify(dataRekap));
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
        localStorage.setItem("dataRekap", JSON.stringify(dataRekap));
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
    const nomorHpInput = document.getElementById("no_hp").value.trim();
    const btnSimpan = document.getElementById("btnSimpan");

    nama = nama.trim().toUpperCase();
    btnSimpan.disabled = true;
    btnSimpan.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Menyimpan...';

    const catatanTeks = catatan.trim() !== "" ? catatan.trim() : "Absensi tercatat";
    if (!Array.isArray(dataRekap)) { dataRekap = []; }

    let siswaExist = dataRekap.find(s => s && s.nama === nama);
    let nHadir = status === "Hadir" ? 1 : 0;
    let nTidakHadir = status === "Tidak Hadir" ? 1 : 0;
    let noHpFinal = nomorHpInput !== "" ? nomorHpInput : (siswaExist ? siswaExist.no_hp : "");

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
                nama: nama,
                Hadir: nHadir.toString(), // Diubah ke String agar sesuai dengan tipe text di DB
                "Tidak Hadir": nTidakHadir.toString(),
                Catatan: catatanTeks,
                "Tanggal Terbaru": waktuSekarangISO,
                no_hp: noHpFinal
            }, {
                onConflict: "absensi"
            });

        if (errorRekap) throw errorRekap;

        const realtimeSekarang = formatTanggalIndonesia(waktuSekarangISO);

        if (siswaExist) {
            siswaExist.hadir = nHadir;
            siswaExist.tidakHadir = nTidakHadir;
            siswaExist.catatan = catatanTeks;
            siswaExist.tanggalRealtime = realtimeSekarang;
            siswaExist.rawDate = waktuSekarangISO;
            siswaExist.no_hp = noHpFinal;
        } else {
            dataRekap.push({
                nama: nama, hadir: nHadir, tidakHadir: nTidakHadir,
                catatan: catatanTeks, tanggalRealtime: realtimeSekarang, rawDate: waktuSekarangISO, no_hp: noHpFinal
            });
        }

        renderTable();
        localStorage.setItem("dataRekap", JSON.stringify(dataRekap));

        if (selectNamaControl) { selectNamaControl.clear(true); } 
        else { document.getElementById("nama").value = ""; }

        document.getElementById("catatan").value = "";
        document.getElementById("no_hp").value = "";
        alert("Data berhasil disimpan ke Rekap Cloud!");
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

function exportTotalExcel() {
    if (dataRekap.length === 0) { alert("Tidak ada data untuk diekspor!"); return; }
    const worksheetData = [
        ["LAPORAN REKAP TOTAL KEHADIRAN SISWA"],
        ["Nona Swimming Course (NSC)"],
        [],
        ["Nama Siswa", "Hadir", "Tidak Hadir", "Rasio", "Tanggal Terbaru", "Catatan Terakhir"]
    ];
    
    dataRekap.forEach(item => {
        worksheetData.push([
            item.nama,
            item.hadir,
            item.tidakHadir,
            item.hadir === TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir}/${TOTAL_PERTEMUAN}`,
            item.tanggalRealtime,
            item.catatan || "-"
        ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Total Absensi");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    prosesUnduhFile(blob, "Rekap_Total_Absensi_NSC.xlsx");
}

function exportSiswaPDF(index) {
    const item = dataRekap[index];
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(35, 74, 132);
    doc.text("LAPORAN ABSENSI INDIVIDU SISWA", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("Helvetica", "normal");
    doc.text("Nona Swimming Course (NSC)", 14, 26);

    const rows = [
        ["Nama Siswa", item.nama],
        ["Total Kehadiran (Hadir)", `${item.hadir} Pertemuan`],
        ["Total Tidak Hadir", `${item.tidakHadir} Pertemuan`],
        ["Status Pertemuan", item.hadir === TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir}/${TOTAL_PERTEMUAN}`],
        ["Tanggal Terakhir Diinput", item.tanggalRealtime],
        ["Catatan Khusus", item.catatan || "-"]
    ];

    doc.autoTable({ 
        startY: 32, 
        head: [["Komponen Data", "Detail Keterangan"]], 
        body: rows, 
        theme: "striped",
        headStyles: { fillColor: [35, 74, 132] }
    });
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
    
    doc.setFontSize(10);
    doc.setFont("Helvetica", "normal");
    doc.text(`Nona Swimming Course - Total Target: ${TOTAL_PERTEMUAN} Pertemuan`, 14, 26);
    
    const tableRows = [];
    dataRekap.forEach(item => {
        tableRows.push([
            item.nama, item.hadir, item.tidakHadir,
            item.hadir === TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir}/${TOTAL_PERTEMUAN}`,
            item.tanggalRealtime, item.catatan || '-'
        ]);
    });
    
    doc.autoTable({
        startY: 32,
        head: [["Nama Siswa", "Hadir", "Absen", "Rasio", "Tanggal Terbaru", "Catatan Terakhir"]],
        body: tableRows,
        theme: "striped",
        headStyles: { fillColor: [35, 74, 132] }
    });
    
    doc.save("Rekap_Total_Absensi_NSC.pdf");
}

async function resetSemuaData() {
    if (!confirm("Apakah Anda yakin ingin menghapus total semua data dari database cloud Supabase?")) return;
    if (!confirm("Konfirmasi terakhir: Data yang dihapus tidak bisa dikembalikan!")) return;

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
        localStorage.setItem("dataRekap", JSON.stringify(dataRekap));
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

    dataRekap = dataRekap.filter(x => x.nama !== nama);
    localStorage.setItem("dataRekap", JSON.stringify(dataRekap));
    renderTable();
    alert(nama + " sudah dikeluarkan dari daftar siswa aktif.");
}
