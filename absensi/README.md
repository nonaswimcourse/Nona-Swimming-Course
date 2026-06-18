# NSC PWA Flat Icon Fix

Masalah pada screenshot:
Manifest OK, tetapi icon 192, icon 512, dan maskable icon masih 404 karena file berada di path /absensi/icons/.

Solusi paket ini:
Tidak memakai folder icons. Semua icon diletakkan langsung di folder /absensi/.

## Upload ke GitHub

Masuk ke folder absensi, lalu upload semua isi folder ini langsung ke sana.

Struktur yang benar:

absensi/
  index.html
  style.css
  script.js
  manifest.webmanifest
  service-worker.js
  pwa.js
  offline.html
  pwa-check.html
  icon-192x192.png
  icon-512x512.png
  maskable-icon-512x512.png
  apple-touch-icon.png
  apple-touch-icon-precomposed.png
  favicon-32x32.png
  favicon-16x16.png
  Logo percobaan.png

## Cek setelah upload

Buka:
https://nonaswimmingcourse.pro/absensi/icon-192x192.png
https://nonaswimmingcourse.pro/absensi/icon-512x512.png
https://nonaswimmingcourse.pro/absensi/maskable-icon-512x512.png
https://nonaswimmingcourse.pro/absensi/pwa-check.html?v=flat-icon-v1

Semua icon harus OK.

## Install ulang Android

1. Hapus shortcut lama.
2. Hapus data situs Chrome.
3. Buka https://nonaswimmingcourse.pro/absensi/?v=flat-icon-v1
4. Pilih Install app.
