# NSC Absensi PWA - File Siap Push ke GitHub

Paket ini sudah menyesuaikan file GitHub yang diberikan:

- index.html
- script.js
- style.css

## File baru

Tambahkan file berikut ke repository:

- manifest.webmanifest
- service-worker.js
- pwa.js
- offline.html
- folder icons/

## File yang sudah direvisi

Ganti file lama dengan file berikut:

- index.html
- style.css

`script.js` tidak diubah agar logika Supabase, PDF, Excel, WhatsApp, dan rekap tetap aman.

## Cara pasang di GitHub

1. Upload semua isi folder ini ke root project atau folder yang sama dengan `index.html`.
2. Commit perubahan.
3. Push ke GitHub.
4. Tunggu deploy selesai.
5. Buka website melalui HTTPS.
6. Tes di Chrome DevTools > Application > Manifest.
7. Tes di Chrome DevTools > Application > Service Workers.
8. Jalankan Lighthouse kategori PWA.

## Catatan penting

- PWA hanya membuat aplikasi bisa di-install dan memberi fallback offline.
- Sinkronisasi data tetap butuh internet karena aplikasi memakai Supabase.
- Service worker tidak melakukan cache terhadap request Supabase Auth, Storage, atau Edge Function.
- Jika ada update besar, ubah versi di service-worker.js:

const CACHE_VERSION = "nsc-absensi-pwa-v1.0.1";
