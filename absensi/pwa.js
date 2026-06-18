/* Absensi NSC PWA Installer
   Fokus utama: Android Chrome tetap menampilkan tombol Download App.
*/

(function () {
  "use strict";

  const APP_SCOPE = "/absensi/";
  const SW_URL = APP_SCOPE + "service-worker.js?v=20260618-android4";

  let deferredPrompt = null;
  let registrationRef = null;

  const ua = navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isChromeAndroid = isAndroid && /Chrome/i.test(ua) && !/Edg|OPR|Firefox/i.test(ua);
  const isSamsung = isAndroid && /SamsungBrowser/i.test(ua);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  function createInstallButton() {
    if (document.getElementById("nscPwaInstallButton")) return document.getElementById("nscPwaInstallButton");

    const button = document.createElement("button");
    button.id = "nscPwaInstallButton";
    button.type = "button";
    button.innerHTML = `
      <span class="nsc-pwa-icon">⬇</span>
      <span class="nsc-pwa-text">Download App</span>
      <span class="nsc-pwa-close" aria-label="Tutup">×</span>
    `;

    button.setAttribute("aria-label", "Download aplikasi Absensi NSC");
    button.style.cssText = [
      "position:fixed",
      "right:16px",
      "bottom:16px",
      "z-index:2147483647",
      "border:0",
      "border-radius:999px",
      "padding:13px 44px 13px 16px",
      "min-height:52px",
      "max-width:calc(100vw - 32px)",
      "background:linear-gradient(135deg,#234a84,#1a3763)",
      "color:#fff",
      "font-weight:800",
      "box-shadow:0 14px 30px rgba(15,23,42,.25)",
      "display:none",
      "align-items:center",
      "gap:10px",
      "font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
    ].join(";");

    const style = document.createElement("style");
    style.textContent = `
      #nscPwaInstallButton .nsc-pwa-icon{
        width:26px;height:26px;border-radius:999px;background:rgba(255,255,255,.16);
        display:grid;place-items:center;font-size:16px;line-height:1;
      }
      #nscPwaInstallButton .nsc-pwa-close{
        position:absolute;right:12px;top:50%;transform:translateY(-50%);
        width:24px;height:24px;border-radius:999px;display:grid;place-items:center;
        font-size:22px;line-height:1;color:rgba(255,255,255,.9);
      }
      #nscPwaInstallButton .nsc-pwa-close:hover{background:rgba(255,255,255,.16);}
      @media(max-width:540px){
        #nscPwaInstallButton{left:14px!important;right:14px!important;bottom:14px!important;justify-content:center!important;}
      }
      .nsc-pwa-modal{
        position:fixed;inset:0;z-index:2147483646;display:none;place-items:center;
        background:rgba(15,23,42,.56);padding:18px;
        font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      }
      .nsc-pwa-card{
        width:min(94vw,430px);background:#fff;color:#0f172a;border-radius:22px;
        padding:24px;box-shadow:0 24px 60px rgba(15,23,42,.28);
      }
      .nsc-pwa-card h3{margin:0 0 8px;color:#234a84;font-size:22px;line-height:1.2;}
      .nsc-pwa-card p{margin:0 0 14px;color:#64748b;line-height:1.55;}
      .nsc-pwa-card ol{margin:0;padding-left:20px;color:#334155;line-height:1.7;}
      .nsc-pwa-card button{
        margin-top:18px;border:0;border-radius:12px;padding:11px 15px;
        background:#234a84;color:#fff;font-weight:800;
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(button);

    button.addEventListener("click", async function (event) {
      if (event.target && event.target.classList.contains("nsc-pwa-close")) {
        button.style.display = "none";
        return;
      }

      if (deferredPrompt) {
        try {
          deferredPrompt.prompt();
          await deferredPrompt.userChoice;
        } catch (error) {
          console.warn("Prompt install gagal:", error);
        } finally {
          deferredPrompt = null;
        }
        return;
      }

      showManualInstallGuide();
    });

    return button;
  }

  function showButton(text) {
    if (isStandalone) return;
    const button = createInstallButton();
    const textEl = button.querySelector(".nsc-pwa-text");
    if (textEl) textEl.textContent = text || "Download App";
    button.style.display = "inline-flex";
  }

  function showManualInstallGuide() {
    let modal = document.getElementById("nscPwaManualModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "nscPwaManualModal";
      modal.className = "nsc-pwa-modal";
      modal.innerHTML = `
        <div class="nsc-pwa-card" role="dialog" aria-modal="true">
          <h3>Install Aplikasi Absensi NSC</h3>
          <p>Browser belum mengirim tombol install otomatis. Gunakan cara manual di Android.</p>
          <ol>
            <li>Buka halaman ini memakai <strong>Google Chrome Android</strong>.</li>
            <li>Tekan ikon <strong>titik tiga</strong> di kanan atas.</li>
            <li>Pilih <strong>Install app</strong> atau <strong>Add to Home screen</strong>.</li>
            <li>Tekan <strong>Install</strong>.</li>
          </ol>
          <button type="button" id="nscPwaModalOk">Saya Mengerti</button>
        </div>
      `;
      document.body.appendChild(modal);
      modal.addEventListener("click", function (event) {
        if (event.target === modal) modal.style.display = "none";
      });
      modal.querySelector("#nscPwaModalOk").addEventListener("click", function () {
        modal.style.display = "none";
      });
    }
    modal.style.display = "grid";
  }

  async function registerSW() {
    if (!("serviceWorker" in navigator)) {
      console.warn("Service worker tidak didukung browser ini.");
      return;
    }

    try {
      registrationRef = await navigator.serviceWorker.register(SW_URL, {
        scope: APP_SCOPE,
        updateViaCache: "none"
      });

      if (registrationRef.waiting && navigator.serviceWorker.controller) {
        registrationRef.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      registrationRef.addEventListener("updatefound", function () {
        const worker = registrationRef.installing;
        if (!worker) return;
        worker.addEventListener("statechange", function () {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            console.info("PWA update tersedia. Reload halaman untuk versi terbaru.");
          }
        });
      });

      console.info("NSC PWA service worker aktif:", registrationRef.scope);
    } catch (error) {
      console.warn("Registrasi service worker gagal:", error);
    }
  }

  function runDiagnostics() {
    window.__NSC_PWA__ = {
      isAndroid,
      isIOS,
      isChromeAndroid,
      isSamsung,
      isStandalone,
      hasBeforeInstallPrompt: Boolean(deferredPrompt),
      hasServiceWorker: "serviceWorker" in navigator,
      serviceWorkerScope: registrationRef ? registrationRef.scope : null,
      manifest: "/absensi/manifest.webmanifest"
    };
    console.info("NSC PWA diagnostics:", window.__NSC_PWA__);
  }

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    deferredPrompt = event;
    showButton("Download App");
    runDiagnostics();
  });

  window.addEventListener("appinstalled", function () {
    const button = document.getElementById("nscPwaInstallButton");
    if (button) button.style.display = "none";
    deferredPrompt = null;
  });

  document.addEventListener("DOMContentLoaded", async function () {
    await registerSW();

    // Android fix: tampilkan tombol walau beforeinstallprompt belum keluar.
    // Kalau eligible, klik tombol akan membuka prompt native.
    // Kalau belum eligible, klik tombol akan membuka panduan manual.
    if (!isStandalone && (isAndroid || isIOS || isChromeAndroid || isSamsung)) {
      window.setTimeout(() => showButton("Download App"), 700);
      window.setTimeout(() => showButton("Download App"), 2500);
    }

    runDiagnostics();
  });
})();
