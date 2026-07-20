const API_AUTH_URL = 'http://localhost:5072/api/auth';
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

// MODERN BİLDİRİM GÖSTERİCİ FONKSİYON
function showToast(message, type = 'error') {
    // 1. Bildirim kutusunu yarat
    const toast = document.createElement('div');
    toast.className = `modern-toast toast-${type}`;
    toast.innerText = message;
    
    // 2. Sayfaya ekle
    document.body.appendChild(toast);

    // 3. Görünür yap (Animasyonu başlat)
    setTimeout(() => toast.classList.add('show'), 10);

    // 4. 3 saniye sonra ekrandan sil
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300); // Animasyon bitince HTML'den de temizle
    }, 3000);
}

// --- 1. YARDIMCI METOTLAR (Hataları Ekrana Basma ve Silme) ---
function showError(inputElement, message) {
    clearError(inputElement); // Önce eski hatayı temizle
    inputElement.classList.add('is-invalid'); // Kutuyu kırmızı yap
    
    // Altına uyarı metnini (div) oluşturup ekle
    const errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback';
    errorDiv.innerText = message;
    inputElement.parentNode.appendChild(errorDiv);
}

function clearError(inputElement) {
    inputElement.classList.remove('is-invalid'); // Kırmızılığı kaldır
    const existingError = inputElement.parentNode.querySelector('.invalid-feedback');
    if (existingError) existingError.remove(); // Hata metnini sil
}

// --- 2. KAYIT OL (REGISTER) KONTROLLERİ ---
if (registerForm) {
    const usernameInput = document.getElementById('reg-username');
    const emailInput = document.getElementById('reg-email');
    const passwordInput = document.getElementById('reg-password');

    // Kullanıcı klavyeden harfe bastığı an kırmızılıkları temizle
    [usernameInput, emailInput, passwordInput].forEach(input => {
        input.addEventListener('input', () => clearError(input));
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        let hasError = false; // Başlangıçta hata yok varsayıyoruz

        // Kural 1: Kullanıcı adı en az 3 harf olmalı
        if (usernameInput.value.trim().length < 3) {
            showError(usernameInput, "Kullanıcı adı en az 3 karakter olmalıdır.");
            hasError = true;
        }

        // Kural 2: Şifre en az 6 karakter olmalı
        if (passwordInput.value.length < 6) {
            showError(passwordInput, "Şifre en az 6 karakter olmalıdır.");
            hasError = true;
        }

        // Eğer hasError true olduysa (hata varsa) alt satırlara inme, işlemi durdur!
        if (hasError) return; 

        // Hata yoksa API'ye kayıt isteğini at (Eski kodlarımızın aynısı)
        const submitBtn = document.getElementById('reg-submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerText = "Kayıt olunuyor...";

        try {
            const response = await fetch(`${API_AUTH_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: usernameInput.value.trim(),
                    email: emailInput.value.trim(),
                    password: passwordInput.value
                })
            });

            if (response.ok) {
                showToast("Kayıt başarılı! Giriş yapabilirsiniz.", "success");
                window.location.href = 'login.html';
            } else {
                showToast("Kayıt olurken bir hata oluştu.", "error");
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "Kayıt Ol";
        }
    });
}

// --- 3. GİRİŞ YAP (LOGIN) KONTROLLERİ ---
if (loginForm) {
    const usernameInput = document.getElementById('log-username');
    const passwordInput = document.getElementById('log-password');

    [usernameInput, passwordInput].forEach(input => {
        input.addEventListener('input', () => clearError(input));
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        let hasError = false;

        if (usernameInput.value.trim() === "") {
            showError(usernameInput, "Kullanıcı adı boş bırakılamaz.");
            hasError = true;
        }

        if (passwordInput.value === "") {
            showError(passwordInput, "Şifre boş bırakılamaz.");
            hasError = true;
        }

        if (hasError) return; // Hata varsa durdur

        const submitBtn = document.getElementById('log-submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerText = "Giriş yapılıyor...";

        try {
            const response = await fetch(`${API_AUTH_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: usernameInput.value.trim(),
                    password: passwordInput.value
                })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('jwtToken', data.token); // Token'ı kasaya koy
                window.location.href = 'index.html'; // İçeri al
            } else {
                showToast("Giriş Başarısız!", "error");
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "Giriş Yap";
        }
    });
}