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
    if (document.getElementById("nama")) {
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
    }

    checkLoginSession();
    muatDataDariCloud();
    
    updateJamRealtime();
    setInterval(updateJamRealtime, 1000);
});

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
    if (!passwordInput || !eyeIcon) return;

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
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const emailEl = document.getElementById("loginEmail");
    const passwordEl = document.getElementById("loginPassword");
    
    if (!emailEl || !passwordEl) {
        alert("Sistem Error: Elemen input login tidak ditemukan di HTML!");
        return false;
    }

    const email = emailEl.value.trim().toLowerCase();
    const password = passwordEl.value;

    if (!email || !password) {
        alert("Email dan Password wajib diisi!");
        return false;
    }

    try {
        let hashedInput = "";
        if (typeof generateSHA256 === "function") {
            hashedInput = await generateSHA256(password);
        }

        if (email === "nonaswimmingcourse@gmail.com" && hashedInput === "3d32f1b4eec6aac2520a664ae8b746e46f83d5baecf81e030e47a9db5c8c7c83") {
            
            localStorage.setItem("isLoggedIn", "true");
            
            const loginSection = document.getElementById("loginSection");
            const mainAppSection = document.getElementById("mainAppSection");
            
            if (loginSection) loginSection.classList.add("hidden");
            if (mainAppSection) mainAppSection.classList.remove("hidden");
            
            setTimeout(() => {
                if (typeof muatDataDariCloud === "function") {
                    muatDataDariCloud();
                }
            }, 200);

            return false;
            
        } else {
            alert("Akses ditolak! Email atau Password salah.");
        }
    } catch (err) {
        alert("Terjadi masalah sistem saat masuk: " + err.message);
    }
    return false;
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
    const tbody = document.getElementById("tbody");
    if (!tbody) return;

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

            let pesanWA = `Halo Bapak/Ibu, berikut laporan absensi Ananda *${item.nama}* di *Nona Swimming Course*.\n\nTotal Hadir: *${item.hadir}* Pertemuan\nTidak Hadir: *${item.tidakHadir}* Pertemuan\nStatus Target: *${item.hadir === TOTAL_PERTEMUAN ? "LENGKAP" : item.hadir + "/" + TOTAL_PERTEMUAN}*\nCatatan: _${item.catatan || '-'}_\n\nTerima kasih.`;
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
                        <a href="${linkWA}" target="_blank" class="btn-action btn-wa" title="Kirim Laporan Teks via WhatsApp">
                            <i class="fab fa-whatsapp"></i>
                        </a>
                        <button class="btn-action btn-pdf" title="Download PDF Harian Siswa" onclick="exportSiswaPDF(${index})">
                            <i class="fa fa-file-pdf"></i>
                        </button>
                        <button class="btn-action btn-wa-pdf" title="Kirim Dokumen PDF Asli ke WA Orang Tua" id="btnWaPdf-${index}" onclick="uploadDanKirimPdfWA(${index})">
                            <i class="fa fa-share-nodes"></i> Kirim PDF ke WA
                        </button>
                        <button class="btn-action btn-excel" title="Download Excel Harian Siswa" onclick="exportSiswaExcel(${index})">
                            <i class="fa fa-file-excel"></i>
                        </button>
                        <button class="btn-action btn-delete" title="Hapus Data Siswa" id="btnDelete-${index}" onclick="deleteRow(${index})">
                            <i class="fa fa-trash"></i>
                        </button>
                        <button class="btn-action btn-kick" title="Keluarkan Siswa" onclick="keluarkanSiswa('${item.nama}')">
                            <i class="fa fa-user-minus"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        });
    }
    tbody.innerHTML = html;
    
    const totalTextEl = document.getElementById("totalPertemuanText");
    if (totalTextEl) totalTextEl.innerText = `Total ${TOTAL_PERTEMUAN} Pertemuan Les Renang`;
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
                nama: namaSiswa,
                Hadir: baruHadir.toString(),
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
                Hadir: nHadir.toString(),
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
            siswaExist.tidakHadir = nTidakHadir; // FIX: typo nTailakHadir sudah diperbaiki
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
            item.nama, item.hadir, item.tidakHadir,
            item.hadir === TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir}/${TOTAL_PERTEMUAN}`,
            item.tanggalRealtime, item.catatan || "-"
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
    
    const img = new Image();
    img.src = 'Logo percobaan.png'; 

    img.onload = function() {
        const doc = new jsPDF();
        try {
            doc.addImage(img, "PNG", 14, 10, 18, 25);
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(35, 74, 132);
            doc.text("LAPORAN ABSENSI INDIVIDU SISWA", 38, 23); 
            
            doc.setFontSize(10);
            doc.setFont("Helvetica", "normal");
            doc.setTextColor(148, 163, 184);
            doc.text("Nona Swimming Course (NSC)", 38, 30);
            
            doc.setDrawColor(241, 245, 249);
            doc.line(14, 40, 196, 40);

            const rows = [
                ["Nama Siswa", item.nama],
                ["Total Kehadiran (Hadir)", `${item.hadir} Pertemuan`],
                ["Total Tidak Hadir", `${item.tidakHadir} Pertemuan`],
                ["Status Pertemuan", item.hadir === TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir}/${TOTAL_PERTEMUAN}`],
                ["Tanggal Terakhir Diinput", item.tanggalRealtime],
                ["Catatan Khusus", item.catatan || "-"]
            ];

            doc.autoTable({ 
                startY: 46, 
                head: [["Komponen Data", "Detail Keterangan"]], 
                body: rows, 
                theme: "striped",
                headStyles: { fillColor: [35, 74, 132], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 10 },
                styles: { textColor: [71, 85, 105], fontSize: 10, cellPadding: 4 },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: "auto" } }
            });
            doc.save(`Absensi_${item.nama}.pdf`);
        } catch(e) {
            console.error("Gagal memproses pembuatan PDF:", e);
            alert("Terjadi kesalahan saat menyusun layout PDF.");
        }
    };

    img.onerror = function() {
        const docBiasa = new jsPDF();
        docBiasa.setFont("Helvetica", "bold");
        docBiasa.setFontSize(14);
        docBiasa.setTextColor(35, 74, 132);
        docBiasa.text("LAPORAN ABSENSI INDIVIDU SISWA", 14, 20);
        
        const rowsFallback = [
            ["Nama Siswa", item.nama],
            ["Total Kehadiran (Hadir)", `${item.hadir} Pertemuan`],
            ["Total Tidak Hadir", `${item.tidakHadir} Pertemuan`],
            ["Status Pertemuan", item.hadir === TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir}/${TOTAL_PERTEMUAN}`],
            ["Tanggal Terakhir Diinput", item.tanggalRealtime],
            ["Catatan Khusus", item.catatan || "-"]
        ];

        docBiasa.autoTable({ startY: 28, head: [["Komponen Data", "Detail Keterangan"]], body: rowsFallback });
        docBiasa.save(`Absensi_${item.nama}.pdf`);
    };
}

function exportTotalPDF() {
    if (dataRekap.length === 0) { alert("Tidak ada data untuk diekspor!"); return; }
    const { jsPDF } = window.jspdf;
    
    const img = new Image();
    img.src = 'Logo percobaan.png'; 

    img.onload = function() {
        const doc = new jsPDF();
        try {
            doc.addImage(img, "PNG", 14, 10, 18, 25);
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(14); 
            doc.setTextColor(35, 74, 132);
            doc.text("LAPORAN REKAP TOTAL KEHADIRAN", 38, 23);
            
            doc.setFontSize(10);
            doc.setFont("Helvetica", "normal");
            doc.setTextColor(148, 163, 184);
            doc.text(`Nona Swimming Course - Total Target: ${TOTAL_PERTEMUAN} Pertemuan`, 38, 30);
            
            doc.setDrawColor(241, 245, 249);
            doc.line(14, 40, 196, 40);
            
            const tableRows = [];
            dataRekap.forEach(item => {
                tableRows.push([
                    item.nama, item.hadir, item.tidakHadir,
                    item.hadir === TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir}/${TOTAL_PERTEMUAN}`,
                    item.tanggalRealtime, item.catatan || '-'
                ]);
            });
            
            doc.autoTable({
                startY: 46,
                head: [["Nama Siswa", "Hadir", "Absen", "Rasio", "Tanggal Terbaru", "Catatan Terakhir"]],
                body: tableRows,
                theme: "striped",
                headStyles: { fillColor: [35, 74, 132], textColor: [255, 255, 255], fontStyle: "bold" },
                styles: { fontSize: 9, padding: 5, valign: "middle" },
                columnStyles: { 0: { fontStyle: "bold" }, 3: { halign: "center" } }
            });
            
            doc.save("Rekap_Total_Absensi_NSC.pdf");
        } catch(e) {
            console.error("Gagal memproses pembuatan PDF Total:", e);
            alert("Terjadi kesalahan saat menyusun layout PDF Total.");
        }
    };
    
    img.onerror = function() {
        const docBiasa = new jsPDF();
        docBiasa.setFont("Helvetica", "bold");
        docBiasa.setFontSize(14);
        docBiasa.setTextColor(35, 74, 132);
        docBiasa.text("LAPORAN REKAP TOTAL KEHADIRAN", 14, 20);
        
        const tableRowsFallback = [];
        dataRekap.forEach(item => {
            tableRowsFallback.push([
                item.nama, item.hadir, item.tidakHadir,
                item.hadir === TOTAL_PERTEMUAN ? "LENGKAP" : `${item.hadir}/${TOTAL_PERTEMUAN}`,
                item.tanggalRealtime, item.catatan || '-'
            ]);
        });

        docBiasa.autoTable({
            startY: 28,
            head: [["Nama Siswa", "Hadir", "Absen", "Rasio", "Tanggal Terbaru", "Catatan Terakhir"]],
            body: tableRowsFallback
        });
        docBiasa.save("Rekap_Total_Absensi_NSC.pdf");
    };
}

async function keluarkanSiswa(namaSiswa) {
    if (!confirm(`Apakah Anda yakin ingin mengeluarkan siswa ${namaSiswa} dari daftar aktif?`)) return;

    try {
        const index = dataRekap.findIndex(item => item.nama === namaSiswa);
        if (index === -1) {
            alert("Data siswa tidak ditemukan.");
            return;
        }

        const { error } = await supabaseClient
            .from('absensinsc')
            .delete()
            .eq('absensi', namaSiswa);

        if (error) throw error;

        dataRekap.splice(index, 1);
        localStorage.setItem("dataRekap", JSON.stringify(dataRekap));
        
        renderTable();
        alert(`Siswa ${namaSiswa} berhasil dikeluarkan dari sistem.`);
    } catch (err) {
        console.error("Gagal mengeluarkan siswa:", err);
        alert("Gagal mengeluarkan siswa dari Supabase: " + err.message);
    }
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
const fileName = `laporan_${id}.pdf`;

await supabase.storage
  .from("laporan-pdf")
  .upload(fileName, file);

await supabase
  .from("absensinsc")
  .update({
    pdf_path: fileName
  })
  .eq("id", id);
async function uploadDanKirimPdfWA(index) {
    const item = dataRekap[index];

    const tombol = document.getElementById(`btnWaPdf-${index}`);
    const teksAsli = tombol.innerHTML;

    tombol.disabled = true;
    tombol.innerHTML = "Mengirim...";

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFont("Helvetica", "bold");
        doc.text(`Laporan Absensi ${item.nama}`, 14, 20);

        const pdfBase64 = doc.output("datauristring").split(",")[1];

        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-pdf-wa`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "ApiKey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                nama: item.nama,
                no_hp: item.no_hp,
                htmlPdf: pdfBase64
            })
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error("Server Error: " + text);
        }

        const result = await res.json();

        if (!result || result.error) {
            throw new Error(result.error || "Gagal kirim WA");
        }

        alert("PDF berhasil dikirim ke WhatsApp");

    } catch (err) {
        console.error(err);
        alert("ERROR: " + err.message);

    } finally {
        tombol.disabled = false;
        tombol.innerHTML = teksAsli;
    }
}
