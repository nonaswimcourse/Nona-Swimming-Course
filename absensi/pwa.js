/* NSC PWA Installer - Flat Icon Path flat-icon-v1 */

(function () {
  "use strict";

  let deferredPrompt = null;
  const isAndroid = /Android/i.test(navigator.userAgent || "");
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

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
    button.innerHTML = `<img src="/absensi/icon-192x192.png?v=flat-icon-v1" alt=""> <span>Download App</span>`;
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
    createButton().style.display = "inline-flex";
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
          <p>Jika prompt belum muncul, gunakan menu Chrome.</p>
          <ol>
            <li>Tekan titik tiga kanan atas.</li>
            <li>Pilih <strong>Install app</strong>.</li>
            <li>Jangan pilih Add to Home screen jika masih muncul logo Chrome.</li>
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
      const registration = await navigator.serviceWorker.register("/absensi/service-worker.js", {
        scope: "/absensi/",
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
