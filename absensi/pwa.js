/* PWA helper untuk Absensi NSC */

(function () {
    "use strict";

    let deferredInstallPrompt = null;

    const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;

    function $(id) {
        return document.getElementById(id);
    }

    function showElement(el) {
        if (el) el.classList.remove("hidden");
    }

    function hideElement(el) {
        if (el) el.classList.add("hidden");
    }

    function updateOnlineStatus() {
        const bar = $("pwaStatusBar");
        const text = $("pwaStatusText");
        if (!bar || !text) return;

        if (navigator.onLine) {
            text.innerHTML = '<i class="fa fa-wifi"></i> Koneksi aktif. Data dapat disinkronkan.';
            bar.classList.remove("offline");
            bar.classList.add("online");

            window.setTimeout(() => {
                if (navigator.onLine) hideElement(bar);
            }, 2200);
        } else {
            text.innerHTML = '<i class="fa fa-triangle-exclamation"></i> Anda sedang offline. Data cloud Supabase belum dapat disinkronkan.';
            bar.classList.remove("online");
            bar.classList.add("offline");
            showElement(bar);
        }
    }

    function setupInstallButton() {
        const installBtn = $("pwaInstallBtn");
        const closeBtn = $("pwaInstallCloseBtn");
        const installText = $("pwaInstallText");

        if (!installBtn) return;

        if (isStandalone) {
            hideElement(installBtn);
            return;
        }

        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

        if (isIOS && isSafari) {
            if (installText) {
                installText.textContent = "Install di iPhone: tekan Share, lalu pilih Add to Home Screen.";
            }
            showElement(installBtn);
        }

        installBtn.addEventListener("click", async function (event) {
            const target = event.target;
            if (target && target.id === "pwaInstallCloseBtn") {
                hideElement(installBtn);
                sessionStorage.setItem("nsc_pwa_install_dismissed", "1");
                return;
            }

            if (!deferredInstallPrompt) {
                if (isIOS) {
                    alert("Untuk iPhone: tekan tombol Share di Safari, lalu pilih Add to Home Screen.");
                }
                return;
            }

            deferredInstallPrompt.prompt();
            await deferredInstallPrompt.userChoice;
            deferredInstallPrompt = null;
            hideElement(installBtn);
        });

        if (closeBtn) {
            closeBtn.addEventListener("click", function (event) {
                event.stopPropagation();
                hideElement(installBtn);
                sessionStorage.setItem("nsc_pwa_install_dismissed", "1");
            });
        }
    }

    function showUpdateToast(registration) {
        const toast = $("pwaUpdateToast");
        const reloadBtn = $("pwaReloadBtn");
        const closeBtn = $("pwaUpdateCloseBtn");

        if (!toast) return;

        showElement(toast);

        if (reloadBtn) {
            reloadBtn.onclick = function () {
                if (registration.waiting) {
                    registration.waiting.postMessage({ type: "SKIP_WAITING" });
                }
                window.location.reload();
            };
        }

        if (closeBtn) {
            closeBtn.onclick = function () {
                hideElement(toast);
            };
        }
    }

    async function registerServiceWorker() {
        if (!("serviceWorker" in navigator)) return;

        try {
            const registration = await navigator.serviceWorker.register("./service-worker.js", {
                scope: "./"
            });

            registration.addEventListener("updatefound", function () {
                const newWorker = registration.installing;
                if (!newWorker) return;

                newWorker.addEventListener("statechange", function () {
                    if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                        showUpdateToast(registration);
                    }
                });
            });

            if (registration.waiting && navigator.serviceWorker.controller) {
                showUpdateToast(registration);
            }
        } catch (error) {
            console.warn("Registrasi PWA gagal:", error);
        }
    }

    window.addEventListener("beforeinstallprompt", function (event) {
        event.preventDefault();
        deferredInstallPrompt = event;

        if (sessionStorage.getItem("nsc_pwa_install_dismissed") !== "1") {
            showElement($("pwaInstallBtn"));
        }
    });

    window.addEventListener("appinstalled", function () {
        deferredInstallPrompt = null;
        hideElement($("pwaInstallBtn"));
    });

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    document.addEventListener("DOMContentLoaded", function () {
        setupInstallButton();
        updateOnlineStatus();
        registerServiceWorker();
    });
})();
