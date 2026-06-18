# NSC Android WebAPK Logo Fix

Masalah yang diperbaiki:
Android hanya membuat shortcut Chrome, sehingga icon muncul kotak dengan logo Chrome.
Paket ini membuat web memenuhi syarat PWA/WebAPK dan memakai logo NSC sebagai icon.

## File yang harus diupload ke folder /absensi/

Upload semua file ini:
- index.html
- style.css
- script.js
- pwa.js
- service-worker.js
- manifest.webmanifest
- offline.html
- pwa-check.html
- Logo percobaan.png
- apple-touch-icon.png
- apple-touch-icon-precomposed.png
- favicon-32x32.png
- favicon-16x16.png
- folder icons/

## Cara tes Android

1. Hapus shortcut/app lama dari Home Screen.
2. Buka Chrome Android.
3. Hapus data situs nonaswimmingcourse.pro.
4. Buka:
   https://nonaswimmingcourse.pro/absensi/?v=webapk-logo-v5
5. Tunggu 5 sampai 10 detik.
6. Tekan tombol Download App atau menu titik tiga.
7. Pilih Install app.
   Jangan hanya memilih Add to Home screen jika masih muncul sebagai shortcut Chrome.

## Cek PWA

Buka:
https://nonaswimmingcourse.pro/absensi/pwa-check.html?v=webapk-logo-v5

Status minimal yang harus OK:
- HTTPS
- Manifest Fetch
- Manifest Display
- Manifest Icons
- Icon 192
- Icon 512
- Maskable Icon
- SW Register

Jika status ini belum OK, Android akan tetap membuat shortcut Chrome.
