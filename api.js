const API_BASE_URL = 'http://localhost:5072/api/tasks'; // Portunun doğru olduğundan emin ol

// Tüm isteklere otomatik Token ekleyen yardımcı fonksiyon
function getHeaders() {
    const token = localStorage.getItem('jwtToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // Dijital anahtarımız burada (Bearer formatında)
    };
}

// Yetkisiz girişte (Token sahteyse veya süresi dolmuşsa) kullanıcıyı dışarı atma fonksiyonu
function handleUnauthorized(status) {
    if (status === 401) {
        alert("Oturumunuzun süresi dolmuş veya yetkisiz erişim. Lütfen tekrar giriş yapın.");
        localStorage.removeItem('jwtToken');
        window.location.href = 'login.html';
        return true; 
    }
    return false;
}

// GET - Tüm Görevleri Çek
async function getTasksFromAPI() {
    try {
        const response = await fetch(API_BASE_URL, { 
            method: 'GET', 
            headers: getHeaders() // Token'ı gönderiyoruz
        });
        
        if (handleUnauthorized(response.status)) return [];
        if (!response.ok) throw new Error('Sunucu hatası');
        
        return await response.json();
    } catch (error) {
        console.error('Görevler çekilirken hata:', error);
        return [];
    }
}

// POST - Yeni Görev Ekle
async function addTaskToAPI(taskData) {
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: getHeaders(), // Token'ı gönderiyoruz
            body: JSON.stringify(taskData)
        });
        
        if (handleUnauthorized(response.status)) return null;
        return await response.json();
    } catch (error) {
        console.error('Görev eklenirken hata:', error);
        return null;
    }
}

// PUT - Görevi Güncelle
async function updateTaskInAPI(id, taskData) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PUT',
            headers: getHeaders(), // Token'ı gönderiyoruz
            body: JSON.stringify(taskData)
        });
        
        if (handleUnauthorized(response.status)) return false;
        return response.ok;
    } catch (error) {
        console.error('Görev güncellenirken hata:', error);
        return false;
    }
}

// DELETE - Görev Sil
async function deleteTaskFromAPI(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE',
            headers: getHeaders() // Token'ı gönderiyoruz
        });
        
        if (handleUnauthorized(response.status)) return false;
        return response.ok;
    } catch (error) {
        console.error('Görev silinirken hata:', error);
        return false;
    }
}