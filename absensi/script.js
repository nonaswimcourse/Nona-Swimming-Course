// LOGIN AKUN DENGAN PERLINDUNGAN KODE SHA-256 (PASSWORD: Rombel007@)
async function handleLogin(event) {
    if (event) event.preventDefault(); 
    
    const emailEl = document.getElementById("loginEmail");
    const passwordEl = document.getElementById("loginPassword");
    
    if (!emailEl || !passwordEl) return;

    const email = emailEl.value.trim().toLowerCase();
    const password = passwordEl.value;

    const passwordHashed = await generateSHA256(password);

    if (email === "nonaswimmingcourse@gmail.com" && passwordHashed === "8ca7d3d753239e25d2cbf790696eb6782dbf2d5930e38676d6540026a2675661") {
        try { localStorage.setItem("isLoggedIn", "true"); } catch(e){}
        
        const loginSection = document.getElementById("loginSection");
        const mainAppSection = document.getElementById("mainAppSection");
        
        if (loginSection) loginSection.classList.add("hidden");
        if (mainAppSection) mainAppSection.classList.remove("hidden");
        
        muatDataDariCloud();
    } else {
        alert("Akses ditolak! Email atau Password salah.");
    }
}
