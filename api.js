// Arka uç (Backend) API adresimiz
const API_URL = 'http://localhost:5072/api/tasks';

// 1. Görevleri Listeleme (GET)
async function getTasksFromAPI() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Görevler getirilemedi!");
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("GET Hatası:", error);
        return []; // Hata durumunda boş liste dön
    }
}

// 2. Yeni Görev Ekleme (POST)
async function addTaskToAPI(taskData) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // API'ye JSON gönderdiğimizi söylüyoruz
            },
            body: JSON.stringify(taskData) // JS objesini JSON string'e çeviriyoruz
        });
        
        if (!response.ok) throw new Error("Görev eklenemedi!");
        
        return await response.json();
    } catch (error) {
        console.error("POST Hatası:", error);
        return null;
    }
}

// 3. Görev Güncelleme (PUT)
async function updateTaskInAPI(id, taskData) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
        });
        
        if (!response.ok) throw new Error("Görev güncellenemedi!");
        
        // Backend PUT işleminde 200 OK ile güncel veriyi veya 204 No Content dönebilir.
        return true; 
    } catch (error) {
        console.error("PUT Hatası:", error);
        return false;
    }
}

// 4. Görev Silme (DELETE)
async function deleteTaskFromAPI(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error("Görev silinemedi!");
        
        return true;
    } catch (error) {
        console.error("DELETE Hatası:", error);
        return false;
    }
}