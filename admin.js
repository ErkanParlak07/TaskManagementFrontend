const API_ADMIN_URL = 'http://localhost:5072/api/admin';
let usersData = []; // Veritabanından gelen tüm listeyi burada tutacağız
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

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Checkbox'a tıklanınca tabloyu yeniden çizecek olay dinleyicisi
    document.getElementById('show-passive-chk').addEventListener('change', renderTable);
    
    // Sayfa açıldığında verileri yükle
    await loadUsers();
});

// API'den kullanıcıları çeken fonksiyon
async function loadUsers() {
    const token = localStorage.getItem('jwtToken');
    try {
        const response = await fetch(`${API_ADMIN_URL}/users`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            usersData = await response.json();
            renderTable(); // Veri gelince tabloyu çiz
        } else {
            showToast("Erişim yetkiniz yok!", "error");
            window.location.href = 'index.html';
        }
    } catch (err) {
        console.error("Hata:", err);
    }
}

// Tabloyu ekrana basan fonksiyon
function renderTable() {
    const tbody = document.getElementById('user-list');
    tbody.innerHTML = '';
    
    // Checkbox işaretli mi? (true/false)
    const showPassive = document.getElementById('show-passive-chk').checked;

    // Sadece checkbox'ın durumuna uyanları filtrele
    const filteredUsers = usersData.filter(u => u.isDeleted === showPassive);

    filteredUsers.forEach(user => {
        const row = document.createElement('tr');
        row.style.borderBottom = "1px solid #ddd"; // Satır altı çizgisi
        
        let actionButton = '';
        if (user.isDeleted) {
            actionButton = `<button onclick="toggleUser(${user.id})" class="btn-action" style="background-color: #28a745;">Aktif Et</button>`;
        } else {
            actionButton = `<button onclick="toggleUser(${user.id})" class="btn-action" style="background-color: #d9534f;">Pasif Et</button>`;
        }

        row.innerHTML = `
            <td style="padding: 10px;">${user.id}</td>
            <td style="padding: 10px; font-weight: bold;">${user.username}</td>
            <td style="padding: 10px;">${user.role}</td>
            <td style="padding: 10px; display: flex; gap: 8px; align-items: center;">
                <button onclick="openAssignTaskModal(${user.id}, '${user.username}')" class="btn-action" style="background-color: #ffc107; color: black; font-weight: bold;">Görev Ata</button>
                <button onclick="openTasksModal(${user.id}, '${user.username}')" class="btn-action" style="background-color: #17a2b8;">Görevler</button>
                <button onclick="openEditModal(${user.id})" class="btn-action" style="background-color: #007bff;">Düzenle</button>
                ${actionButton}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Butona tıklandığında durumu değiştiren fonksiyon
async function toggleUser(id) {
    const token = localStorage.getItem('jwtToken');
    
    const response = await fetch(`${API_ADMIN_URL}/toggle-status/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
        await loadUsers(); // Başarılıysa tabloyu güncelle
    } else {
        showToast("İşlem başarısız oldu.", "error");
    }
}
// MODAL AÇMA İŞLEMİ (Verileri forma doldurur)
function openEditModal(id) {
    // Tıklanan kullanıcıyı listemizden bul
    const user = usersData.find(u => u.id === id);
    if (!user) return;

    // Formdaki kutucukları kullanıcının mevcut bilgileriyle doldur
    document.getElementById('edit-id').value = user.id;
    document.getElementById('edit-username').value = user.username;
    document.getElementById('edit-email').value = user.email || ''; 
    document.getElementById('edit-role').value = user.role;
    document.getElementById('edit-password').value = '';

    // Modalı görünür yap
    document.getElementById('edit-modal').style.display = 'flex';
}

// MODAL KAPATMA İŞLEMİ
function closeModal() {
    document.getElementById('edit-modal').style.display = 'none';
}

// FORM GÖNDERME İŞLEMİ (Veritabanına kaydetme)
document.getElementById('edit-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // Sayfanın yenilenmesini engelle
    
    const id = document.getElementById('edit-id').value;
    const updatedData = {
        username: document.getElementById('edit-username').value,
        email: document.getElementById('edit-email').value,
        role: document.getElementById('edit-role').value,
        password: document.getElementById('edit-password').value
    };

    const token = localStorage.getItem('jwtToken');
    
    try {
        const response = await fetch(`${API_ADMIN_URL}/update-user/${id}`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' // API'ye JSON gönderdiğimizi söylüyoruz
            },
            body: JSON.stringify(updatedData)
        });

        if (response.ok) {
            closeModal(); // Modalı kapat
            await loadUsers(); // Tabloyu yeni verilerle tekrar çiz
            showToast("Kullanıcı bilgileri başarıyla güncellendi!", "success");
        } else {
            showToast("Güncelleme işlemi başarısız oldu.", "error");
        }
    } catch (err) {
        console.error("Hata:", err);
    }
});
// GÖREVLER MODALINI AÇMA VE VERİLERİ ÇEKME
async function openTasksModal(userId, username) {
    // 1. Modalı görünür yap ve başlığı ayarla
    document.getElementById('tasks-modal-title').innerText = `${username} Adlı Kişinin Görevleri`;
    const tasksList = document.getElementById('user-tasks-list');
    tasksList.innerHTML = '<li style="text-align: center; color: #888;">Görevler yükleniyor...</li>';
    document.getElementById('tasks-modal').style.display = 'flex';

    const token = localStorage.getItem('jwtToken');

    try {
        // 2. API'den o kullanıcının görevlerini çek
        const response = await fetch(`${API_ADMIN_URL}/user-tasks/${userId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const tasks = await response.json();
            tasksList.innerHTML = ''; // Yükleniyor yazısını temizle

            // 3. Görevleri ekrana çiz
            if (tasks.length === 0) {
                tasksList.innerHTML = '<li style="text-align: center; color: #888;">Bu kullanıcının henüz bir görevi yok.</li>';
                return;
            }

           // Görevleri listelemek için HTML oluşturma kısmı
        const tasksListContainer = document.getElementById('user-tasks-list'); // HTML'deki kendi container ID'n neyse onunla eşleştiğinden emin ol (örn: tasksList, user-tasks-list vb.)
        tasksListContainer.innerHTML = ''; // Önce listeyi temizle

        if (tasks.length === 0) {
            tasksListContainer.innerHTML = '<p style="text-align: center; color: #777; margin-top: 20px;">Bu kullanıcıya ait görev bulunmuyor.</p>';
        } else {
            tasks.forEach(task => {
                // YENİ: C# ve JS büyük/küçük harf uyuşmazlığını çözen garantili okuma yöntemi
                // Hem mantıksal True hem de yazı olarak gelen "true" ihtimallerini zırhlıyoruz
                const isDone = task.isCompleted === true || task.IsCompleted === true || task.isCompleted === "true" || task.isCompleted === "True";
                const prio = task.priority !== undefined ? task.priority : task.Priority;
                const desc = task.description || task.Description;
                const title = task.title || task.Title;

                // 1. Öncelik Değerini Renkli Rozetlere (Badge) Çevirme
                let priorityText = "Belirsiz";
                let priorityColor = "#6c757d"; 
                
                if (prio === 2) { priorityText = "Yüksek"; priorityColor = "#dc3545"; } 
                else if (prio === 1) { priorityText = "Orta"; priorityColor = "#ffc107"; } 
                else if (prio === 0) { priorityText = "Düşük"; priorityColor = "#28a745"; } 

                // 2. Tamamlanma Durumuna Göre Stil Ayarları (Yeşil Çizgi Eklendi)
                // text-decoration-color: #28a745 yazının üstünü doğrudan yeşil renkle çizer
                let titleStyle = isDone 
                    ? "text-decoration: line-through; text-decoration-color: #28a745; text-decoration-thickness: 2px; color: #999;" 
                    : "color: #333;";
                let statusText = isDone ? "(Tamamlandı)" : "(Devam Ediyor)";
                let statusColor = isDone ? "#28a745" : "#333";

                // 3. Detay (Açıklama) Metni Kontrolü
                let descriptionHtml = desc 
                    ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #666; line-height: 1.4;">${desc}</p>` 
                    : `<p style="margin: 8px 0 0 0; font-size: 13px; color: #aaa; font-style: italic;">Detay eklenmemiş.</p>`;

                // 4. Yeni ve Şık "Görev Kartı" Tasarımı
                let taskCard = `
                    <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin-bottom: 12px; background-color: #fafafa; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                        
                        <!-- Üst Kısım: Başlık ve Durum -->
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
                            <strong style="${titleStyle} font-size: 16px; flex: 1;">${title}</strong>
                            <span style="color: ${statusColor}; font-size: 12px; font-weight: bold; margin-left: 10px;">${statusText}</span>
                        </div>
                        
                        <!-- Alt Kısım: Açıklama ve Öncelik Rozeti -->
                        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 10px;">
                            <div style="flex: 1; padding-right: 15px;">
                                ${descriptionHtml}
                            </div>
                            <div style="background-color: ${priorityColor}; color: ${prio === 1 ? 'black' : 'white'}; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; white-space: nowrap;">
                                ${priorityText} Öncelik
                            </div>
                        </div>

                    </div>
                `;
                
                tasksListContainer.innerHTML += taskCard;
            });
        }

        } else {
            tasksList.innerHTML = '<li style="color: #d9534f;">Görevler alınırken bir hata oluştu.</li>';
            showToast("Kullanıcının görevleri çekilemedi.", "error");
        }
    } catch (err) {
        console.error("Hata:", err);
        tasksList.innerHTML = '<li style="color: #d9534f;">Bağlantı hatası oluştu.</li>';
    }
}

// GÖREVLER MODALINI KAPATMA
function closeTasksModal() {
    document.getElementById('tasks-modal').style.display = 'none';
    
}// GÖREV ATAMA MODALINI AÇ/KAPAT
function openAssignTaskModal(userId, username) {
    document.getElementById('assign-task-userid').value = userId;
    document.getElementById('assign-task-title').innerText = `${username} İçin Yeni Görev`;
    
    // Tüm kutuları sıfırla
    document.getElementById('assign-task-name').value = '';
    document.getElementById('assign-task-desc').value = '';
    document.getElementById('assign-task-priority').value = '1'; // Orta önceliği varsayılan yap
    
    document.getElementById('assign-task-modal').style.display = 'flex';
}

function closeAssignTaskModal() {
    document.getElementById('assign-task-modal').style.display = 'none';
}

// FORMU GÖNDER VE GÖREVİ ATA
document.getElementById('assign-task-form').addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    const userId = document.getElementById('assign-task-userid').value;
    const taskTitle = document.getElementById('assign-task-name').value;
    const taskDesc = document.getElementById('assign-task-desc').value;
    const taskPriority = parseInt(document.getElementById('assign-task-priority').value);
    
    const token = localStorage.getItem('jwtToken');

    try {
        const response = await fetch(`${API_ADMIN_URL}/user-tasks/${userId}`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' 
            },
            // Güncellenen DTO'ya uygun olarak gönderiyoruz:
            body: JSON.stringify({ 
                title: taskTitle,
                description: taskDesc,
                priority: taskPriority
            }) 
        });

        if (response.ok) {
            showToast("Görev başarıyla atandı!", "success");
            closeAssignTaskModal();
        } else {
            showToast("Görev atanırken bir hata oluştu.", "error");
        }
    } catch (err) {
        console.error("Hata:", err);
        showToast("Sunucuya bağlanılamadı.", "error");
    }
})