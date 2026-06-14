const TOTAL_PERTEMUAN = 12; // Total target pertemuan les

// Inisialisasi Supabase Client
const SUPABASE_URL = "https://mjfwgmhuengvfdagbcsk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZndgmWh1ZW5ndmZkYWdiY3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMDczMTMsImV4cCI6MjA5Njg4MzMxM30.NxZY9zHP9zQmHRsgpcGZyk3t7_xaGFFuTa3bYIAD384";
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

// BYPASS UTAMA YANG DIPANGGIL OLEH KLIK TOMBOL HTML
function eksekusiLoginBypass() {
    const emailEl = document.getElementById("loginEmail");
    const passwordEl = document.getElementById("loginPassword");
    
    if (!emailEl || !passwordEl) {
        alert("Komponen login di HTML tidak terbaca!");
        return;
    }

    const email = emailEl.value.trim().toLowerCase();
    const password = passwordEl.value;

    if (email === "nonaswimmingcourse@gmail.com" && password === "nonaswimmingcourse") {
        localStorage.setItem("isLoggedIn", "true");
        bukaAplikasiUtama();
    } else {
        alert("Akses ditolak! Akun atau Password salah.");
    }
}

function bukaAplikasiUtama() {
    const loginSection = document.getElementById("loginSection");
    const mainAppSection = document.getElementById("mainAppSection");
    
    if (loginSection) {
        loginSection.style.setProperty("display", "none", "important");
        loginSection.classList.add("hidden");
    }
    if (mainAppSection) {
        mainAppSection.style.setProperty("display", "block", "important");
        mainAppSection.classList.remove("hidden");
    }
    muatDataDariCloud();
}

document.addEventListener("DOMContentLoaded", function() {
    // Kunci session langsung jika sudah login sebelumnya
    if(localStorage.getItem("isLoggedIn") === "true") {
        bukaAplikasiUtama();
    }

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

    // Intercept jika user menekan tombol Enter di form agar tidak memicu reload halaman
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.onsubmit = function(e) {
            if(e) { e.preventDefault(); e.stopPropagation(); }
            eksekusiLoginBypass();
            return false;
        };
    }
    
    updateJamRealtime();
    setInterval(updateJamRealtime, 1000);
});

async function muatDataDariCloud() {
    const tbody = document.getElementById("tbody");
    try {
        if (tbody) {
            tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; color:#234a84;'><i class='fa fa-spinner fa-spin'></i> Menyinkronkan data terbaru...</td></tr>";
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
        console.error(e);
        dataRekap = JSON.parse(localStorage.getItem("dataRekap")) || [];
        renderTable();
    }
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById("loginPassword");
    const eyeIcon = document.getElementById("eyeIcon");
    if (passwordInput && passwordInput.type === "password") {
        passwordInput.type = "text";
        if (eyeIcon) eyeIcon.classList.replace("fa-eye", "fa-eye-slash");
    } else if (passwordInput) {
        passwordInput.type = "password";
        if (eyeIcon) eyeIcon.classList.replace("fa-eye-slash", "fa-eye");
    }
}

function handleLogout() {
    if(confirm("Apakah Anda yakin ingin keluar?")) {
        try { localStorage.removeItem("isLoggedIn"); } catch(e){}
        window.location.reload();
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
                        <button onclick="prosesDanKirimCloudPDF(${index})" class="btn-action btn-wa" id="btnWa-${index}"><i class="fab fa-whatsapp"></i></button>
                        <button class="btn-action btn-excel" onclick="exportSiswaExcel(${index})"><i class="fa fa-file-excel"></i></button>
                        <button class="btn-action btn-pdf" onclick="exportSiswaPDF(${index})"><i class="fa fa-file-pdf"></i></button>
                        <button class="btn-action btn-delete" id="btnDelete-${index}" onclick="deleteRow(${index})"><i class="fa fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
        });
    }
    tbody.innerHTML = html;
    const totalPertemuanText = document.getElementById("totalPertemuanText");
    if (totalPertemuanText) totalPertemuanText.innerText = `Total ${TOTAL_PERTEMUAN} Pertemuan Les Renang`;
}

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
        const { error: uploadError } = await supabaseClient.storage.from('laporan-pdf').upload(namaFileCloud, pdfBlob, { contentType: 'application/pdf', upsert: true });
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
        let pesanWA = `Halo Bapak/Ibu, berikut ringkasan laporan absensi resmi Ananda *${item.nama}* di *Nona Swimming Course*.\n\n✓ Total Kehadiran: *${item.hadir}* Pertemuan\n✓ Tidak Hadir: *${item.tidakHadir}* Pertemuan\n\n*Dokumen PDF resmi baru saja diunduh otomatis di perangkat Admin dan akan dikirimkan langsung oleh admin via chat.*`;
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
        alert(`Rekap data ${namaSiswa} bernilai 0. Siswa akan otomatis dihapus.`);
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
            }, { onConflict: "absensi" });

        if (error) throw error;
        dataRekap[index].hadir = baruHadir;
        dataRekap[index].tidakHadir = baruTidakHadir;
        dataRekap[index].catatan = catatanKetik;
        dataRekap[index].tanggalRealtime = formatTanggalIndonesia(waktuSekarangISO);
        renderTable();
        localStorage.setItem("dataRekap", JSON.stringify(dataRekap));
    } catch (err) { alert(err.message); }
}

async function deleteRow(index) {
    const namaSiswa = dataRekap[index].nama;
    if (!confirm(`Hapus data rekap ${namaSiswa}?`)) return;
    const btnDelete = document.getElementById(`btnDelete-${index}`);
    if(btnDelete) btnDelete.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
    try {
        const { error } = await supabaseClient.from('absensinsc').delete().eq('absensi', namaSiswa);
        if (error) throw error;
        dataRekap.splice(index, 1);
        localStorage.setItem("dataRekap", JSON.stringify(dataRekap));
        renderTable();
    } catch (err) { alert(err.message); }
}

async function simpan() {
    let nama = "";
    if (selectNamaControl) { nama = selectNamaControl.getValue(); }
    if (!nama) { nama = document.getElementById("nama").value; }
    if (!nama) { alert("Silakan pilih nama siswa!"); return; }

    const status = document.getElementById("status").value;
    const catatan = document.getElementById("catatan").value;
    const no_hp = document.getElementById("no_hp").value.trim();
    const btnSimpan = document.getElementById("btnSimpan");

    nama = nama.trim().toUpperCase();
    btnSimpan.disabled = true;
    btnSimpan.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Menyimpan...';

    const catatanTeks = catatan.trim() !== "" ? catatan.trim() : "Absensi tercatat";
    let siswaExist = dataRekap.find(s => s && s.nama === nama);
    let nHadir = status === "Hadir" ? 1 : 0;
    let nTidakHadir = status === "Tidak Hadir" ? 1 : 0;

    if (siswaExist) {
        nHadir = (siswaExist.hadir || 0) + (status === "Hadir" ? 1 : 0);
        nTidakHadir = (siswaExist.tidakHadir || 0) + (status === "Tidak Hadir" ? 1 : 0);
    }

    const waktuSekarangISO = new Date().toISOString();
    try {
        const { error: errorRekap } = await supabaseClient.from("absensinsc").upsert({
            absensi: nama, Hadir: nHadir, "Tidak Hadir": nTechnical_error || nTidakHadir.toString(),
            Catatan: catatanTeks, "Tanggal Terbaru": waktuSekarangISO, no_hp: no_hp || (siswaExist ? siswaExist.no_hp : "")
        }, { onConflict: "absensi" });

        if (errorRekap) throw errorRekap;
        await supabaseClient.from("log_harian").insert({ nama: nama, status: status, catatan: catatanTeks });

        if (siswaExist) {
            siswaExist.hadir = nHadir;
            siswaExist.tidakHadir = nTidakHadir;
            siswaExist.catatan = catatanTeks;
            siswaExist.tanggalRealtime = formatTanggalIndonesia(waktuSekarangISO);
            if(no_hp) siswaExist.no_hp = no_hp;
        } else {
            dataRekap.push({ nama: nama, hadir: nHadir, tidakHadir: nTidakHadir, catatan: catatanTeks, tanggalRealtime: formatTanggalIndonesia(waktuSekarangISO), no_hp: no_hp });
        }

        renderTable();
        localStorage.setItem("dataRekap", JSON.stringify(dataRekap));
        if (selectNamaControl) { selectNamaControl.clear(true); }
        document.getElementById("catatan").value = "";
        document.getElementById("no_hp").value = "";
        alert("Data berhasil disimpan!");
    } catch (err) { alert(err.message); }
    finally { btnSimpan.disabled = false; btnSimpan.innerHTML = '<i class="fa fa-plus-circle"></i> Simpan Data'; }
}

function showTab(tab, btn) {
    document.getElementById("input").classList.add("hidden");
    document.getElementById("rekap").classList.add("hidden");
    document.getElementById(tab).classList.remove("hidden");
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));
    btn.classList.add("active");
}

function prosesUnduhFile(blob, namaFile) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = namaFile; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 300);
}

function exportSiswaExcel(index) {
    const item = dataRekap[index];
    const worksheetData = [
        ["LAPORAN ABSENSI INDIVIDU SISWA"], ["Nona Swimming Course (NSC)"], [],
        ["Komponen", "Keterangan"], ["Nama Siswa", item.nama], [`Hadir: ${item.hadir}`, `Absen: ${item.tidakHadir}`]
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Absensi");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    prosesUnduhFile(new Blob([wbout], { type: 'application/octet-stream' }), `Absensi_${item.nama}.xlsx`);
}

function exportTotalExcel() {
    if (dataRekap.length === 0) { alert("Tidak ada data untuk diekspor!"); return; }
    const worksheetData = [["Nama Siswa", "Hadir", "Tidak Hadir", "Tanggal Terbaru", "Catatan"]];
    dataRekap.forEach(item => {
        worksheetData.push([item.nama, item.hadir, item.tidakHadir, item.tanggalRealtime, item.catatan || "-"]);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Total Absensi NSC");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    prosesUnduhFile(new Blob([wbout], { type: 'application/octet-stream' }), "Rekap_Total_Absensi_NSC.xlsx");
}

function exportSiswaPDF(index) {
    const item = dataRekap[index];
    const doc = new window.jspdf.jsPDF();
    doc.text(`Absensi: ${item.nama}`, 14, 20);
    doc.autoTable({ startY: 28, head: [["Hadir", "Tidak Hadir"]], body: [[item.hadir, item.tidakHadir]] });
    doc.save(`Absensi_${item.nama}.pdf`);
}

function exportTotalPDF() {
    const doc = new window.jspdf.jsPDF();
    const rows = dataRekap.map(x => [x.nama, x.hadir, x.tidakHadir, x.tanggalRealtime]);
    doc.autoTable({ head: [["Nama", "Hadir", "Absen", "Tanggal Terbaru"]], body: rows });
    doc.save("Total_Absensi.pdf");
}

async function resetSemuaData() {
    if (!confirm("Hapus total data cloud?")) return;
    try {
        await supabaseClient.from('absensinsc').delete().neq('absensi', 'placeholder');
        dataRekap = []; localStorage.removeItem("dataRekap"); renderTable();
    } catch (err) { alert(err.message); }
}
