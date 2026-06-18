/* NSC PWA Installer - Android WebAPK Logo Fix webapk-logo-v5 */

(function () {
  "use strict";

  const APP_SCOPE = "/absensi/";
  const SW_URL = "/absensi/service-worker.js";

  let deferredPrompt = null;

  const ua = navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  function createButton() {
    if (document.getElementById("nscPwaInstallButton")) return document.getElementById("nscPwaInstallButton");

    const style = document.createElement("style");
    style.textContent = `
      #nscPwaInstallButton {
        position:fixed; right:16px; bottom:16px; z-index:2147483647;
        border:0; border-radius:999px; padding:13px 18px;
        min-height:52px; background:linear-gradient(135deg,#234a84,#1a3763);
        color:#fff; font-weight:800; display:none; align-items:center; gap:10px;
        box-shadow:0 14px 30px rgba(15,23,42,.25);
        font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      }
      #nscPwaInstallButton img {
        width:28px; height:28px; border-radius:8px; object-fit:cover; background:#061c34;
      }
      @media(max-width:540px) {
        #nscPwaInstallButton { left:14px; right:14px; justify-content:center; }
      }
      .nsc-pwa-modal {
        position:fixed; inset:0; z-index:2147483646; display:none; place-items:center;
        background:rgba(15,23,42,.58); padding:18px;
        font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      }
      .nsc-pwa-card {
        width:min(94vw,430px); background:#fff; color:#0f172a; border-radius:22px;
        padding:24px; box-shadow:0 24px 60px rgba(15,23,42,.28);
      }
      .nsc-pwa-card h3 { margin:0 0 8px; color:#234a84; font-size:22px; }
      .nsc-pwa-card p { margin:0 0 14px; color:#64748b; line-height:1.55; }
      .nsc-pwa-card ol { margin:0; padding-left:20px; color:#334155; line-height:1.7; }
      .nsc-pwa-card button {
        margin-top:18px; border:0; border-radius:12px; padding:11px 15px;
        background:#234a84; color:#fff; font-weight:800;
      }
    `;
    document.head.appendChild(style);

    const button = document.createElement("button");
    button.id = "nscPwaInstallButton";
    button.type = "button";
    button.innerHTML = `<img src="/absensi/icons/icon-192x192.png?v=webapk-logo-v5" alt=""> <span>Download App</span>`;
    document.body.appendChild(button);

    button.addEventListener("click", async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        return;
      }
      showGuide();
    });

    return button;
  }

  function showInstallButton() {
    if (isStandalone) return;
    if (!isAndroid && !isIOS) return;
    const button = createButton();
    button.style.display = "inline-flex";
  }

  function showGuide() {
    let modal = document.getElementById("nscPwaGuide");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "nscPwaGuide";
      modal.className = "nsc-pwa-modal";
      modal.innerHTML = `
        <div class="nsc-pwa-card">
          <h3>Install Aplikasi NSC</h3>
          <p>Kalau Android masih menampilkan logo Chrome, berarti yang terpasang adalah shortcut biasa, bukan WebAPK.</p>
          <ol>
            <li>Buka halaman ini di <strong>Chrome Android</strong>.</li>
            <li>Tunggu 5 sampai 10 detik.</li>
            <li>Pilih menu <strong>titik tiga</strong>.</li>
            <li>Pilih <strong>Install app</strong>, bukan hanya Add to Home screen.</li>
            <li>Kalau menu Install app belum ada, buka <strong>/absensi/pwa-check.html</strong>.</li>
          </ol>
          <button type="button">Tutup</button>
        </div>
      `;
      document.body.appendChild(modal);
      modal.querySelector("button").addEventListener("click", () => modal.style.display = "none");
      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.style.display = "none";
      });
    }
    modal.style.display = "grid";
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.register(SW_URL, {
        scope: APP_SCOPE,
        updateViaCache: "none"
      });
      console.info("NSC service worker aktif:", registration.scope);
    } catch (error) {
      console.warn("Service worker gagal:", error);
    }
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    showInstallButton();
  });

  window.addEventListener("appinstalled", () => {
    const btn = document.getElementById("nscPwaInstallButton");
    if (btn) btn.style.display = "none";
    deferredPrompt = null;
  });

  document.addEventListener("DOMContentLoaded", async () => {
    await registerServiceWorker();
    setTimeout(showInstallButton, 1200);
    setTimeout(showInstallButton, 4000);
  });
})();
