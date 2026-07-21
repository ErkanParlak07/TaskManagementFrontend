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
    document.getElementById('show-inactive')?.addEventListener('change', renderTable);
    
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
    const tbody = document.getElementById('admin-user-list');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    // Checkbox işaretli mi? (true/false)
    const showPassive = document.getElementById('show-inactive')?.checked || false;

    // Sadece checkbox'ın durumuna uyanları filtrele
    const filteredUsers = usersData.filter(u => u.isDeleted === showPassive);

    filteredUsers.forEach(user => {
        const row = document.createElement('tr');
        row.style.borderBottom = "1px solid #ddd"; // Satır altı çizgisi
        
        let actionButton = '';
        if (user.isDeleted) {
            actionButton = `<button type="button" onclick="toggleUser(${user.id})" class="btn-action" style="background-color: #28a745;">Aktif Et</button>`;
        } else {
            actionButton = `<button type="button" onclick="toggleUser(${user.id})" class="btn-action" style="background-color: #d9534f;">Pasif Et</button>`;
        }

        row.innerHTML = `
            <td style="padding: 10px;">${user.id}</td>
            <td style="padding: 10px; font-weight: bold;">${user.username}</td>
            <td style="padding: 10px;">${user.role}</td>
            <td style="padding: 10px; display: flex; gap: 8px; align-items: center;">
                
               
                <button type="button" onclick="openEditModal(${user.id})" class="btn-action" style="background-color: #007bff;">Düzenle</button>
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
// 1. MODAL AÇMA İŞLEMİ (Verileri forma doldurur)
function openEditModal(id) {
    // Görünümü kesin olarak Kullanıcı Yönetimi sekmesinde sabitle
    document.getElementById('UserManagement').style.display = 'block';
    document.getElementById('AdminDashboard').style.display = 'none';
    document.getElementsByClassName('tab-btn')[0].classList.add('active'); // Kullanıcı Yönetimi butonunu aktif yap
    document.getElementsByClassName('tab-btn')[1].classList.remove('active');

    const user = usersData ? usersData.find(u => u.id === id) : null;
    if (!user) return;

    // Formdaki kutucukları kullanıcının mevcut bilgileriyle doldur
    document.getElementById('edit-id').value = user.id;
    document.getElementById('edit-username').value = user.username;
    document.getElementById('edit-email').value = user.email || ''; 
    document.getElementById('edit-role').value = user.role;
    document.getElementById('edit-password').value = '';

    // HATA ÇÖZÜLDÜ: 'modal' değişkeni yerine doğrudan ID kullanıyoruz
    document.getElementById('edit-modal').style.display = 'flex';
}

// MODAL KAPATMA İŞLEMİ
function closeModal() {
    document.getElementById('edit-modal').style.display = 'none';
}

// FORM GÖNDERME İŞLEMİ (Veritabanına kaydetme)
document.getElementById('edit-form')?.addEventListener('submit', async (e) => {
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



function closeAssignTaskModal() {
    document.getElementById('assign-task-modal').style.display = 'none';
}

// FORMU GÖNDER VE GÖREVİ ATA
document.getElementById('assign-task-form')?.addEventListener('submit', async (e) => {
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
   

}); 

// Güvenlik loglarını API'den çeken ana fonksiyon (En Güncel Hata Avcısı Versiyonu)
async function loadSecurityLogs() {
    const token = localStorage.getItem('jwtToken');
    const recentTbody = document.getElementById('recent-logins-list');
    const failedTbody = document.getElementById('failed-logins-list');
    
    try {
        const response = await fetch(`${API_ADMIN_URL}/logs`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            renderLogsToTable(data.recentLogins, 'recent-logins-list', 'status-success');
            renderLogsToTable(data.failedLogins, 'failed-logins-list', 'status-danger');
        } else {
            const errorText = await response.text();
            const errMsg = `<tr><td colspan="3" style="text-align: center; color: #dc2626; font-weight: bold;">Backend Hatası: ${response.status} <br> C# API bu isteği reddetti.</td></tr>`;
            if (recentTbody) recentTbody.innerHTML = errMsg;
            if (failedTbody) failedTbody.innerHTML = errMsg;
            console.error("API Hata Kodu:", response.status, errorText);
        }
    } catch (error) {
        const errMsg = `<tr><td colspan="3" style="text-align: center; color: #dc2626; font-weight: bold;">Sunucuya Bağlanılamadı! <br> C# terminalinde 'dotnet run' çalışıyor mu?</td></tr>`;
        if (recentTbody) recentTbody.innerHTML = errMsg;
        if (failedTbody) failedTbody.innerHTML = errMsg;
        console.error("Bağlantı Hatası:", error);
    }
}

// Gelen JSON dizisini HTML satırlarına çeviren yardımcı fonksiyon
function renderLogsToTable(logs, elementId, badgeClass) {
    const tbody = document.getElementById(elementId);
    
    if (!tbody) return; 

    tbody.innerHTML = ''; 

    if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #94a3b8;">Henüz kayıt bulunmuyor.</td></tr>';
        return;
    }

    logs.forEach(log => {
        const dateObj = new Date(log.attemptDate);
        const dateStr = dateObj.toLocaleDateString('tr-TR') + ' ' + dateObj.toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'});

        tbody.innerHTML += `
            <tr>
                <td><strong>${log.username}</strong></td>
                <td>${dateStr}</td>
                <td><span class="status-badge ${badgeClass}">${log.errorMessage}</span></td>
            </tr>
        `;
        
    });
    
}
// ==========================================
// YENİ EKLENEN 3. SEKME: GÖREV YÖNETİMİ CRUD
// ==========================================

// 1. Sekmeye tıklandığında Select kutusunu kullanıcılara doldurur
function refreshTaskUsers() {
    const select = document.getElementById('task-user-select');
    // Globaldeki usersData dizisi boşsa hiçbir şey yapma (Zaten API'den çekilmiş olmalı)
    if (!usersData || usersData.length === 0) return; 

    select.innerHTML = '<option value="">-- İşlem Yapılacak Kullanıcıyı Seçin --</option>';
    
    // Sadece silinmemiş (aktif) kullanıcıları listeye ekle
    usersData.filter(u => !u.isDeleted).forEach(user => {
        select.innerHTML += `<option value="${user.id}">${user.username} (${user.role})</option>`;
    });
}

// 2. Select'ten kullanıcı seçildiğinde görevlerini tabloya çeker
async function loadTasksForSelectedUser() {
    const userId = document.getElementById('task-user-select').value;
    const btnCreate = document.getElementById('btn-create-task');
    const tbody = document.getElementById('task-management-list');

    // Seçim iptal edildiyse
    if (!userId) {
        btnCreate.disabled = true;
        btnCreate.style.cursor = 'not-allowed';
        btnCreate.style.opacity = '0.5';
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 30px;">Kayıtları görmek için lütfen üstten kullanıcı seçin.</td></tr>';
        return;
    }

    // Seçim yapıldıysa "Görev Ekle" butonunu aktif et
    btnCreate.disabled = false;
    btnCreate.style.cursor = 'pointer';
    btnCreate.style.opacity = '1';

    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Görevler Yükleniyor...</td></tr>';
    
    const token = localStorage.getItem('jwtToken');
    try {
        const response = await fetch(`${API_ADMIN_URL}/user-tasks/${userId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const tasks = await response.json();
            tbody.innerHTML = '';
            
            if (tasks.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 20px;">Bu kullanıcıya ait görev bulunmuyor.</td></tr>';
                return;
            }

            tasks.forEach(task => {
                // Verileri güvenli hale getirme (Büyük küçük harf hassasiyeti vb.)
                const id = task.id || task.Id;
                const title = task.title || task.Title;
                const desc = (task.description || task.Description || '').replace(/'/g, "\\'"); // Tırnak hatasını önlemek için escape
                const prio = task.priority !== undefined ? task.priority : task.Priority;
                const isDone = task.isCompleted === true || task.IsCompleted === true || task.isCompleted === "true";

                // Öncelik Görünümü
                let prioBadge = prio === 2 ? `<span class="status-badge status-danger">Yüksek</span>` 
                              : prio === 1 ? `<span class="status-badge" style="background:#fef08a; color:#854d0e;">Orta</span>` 
                              : `<span class="status-badge status-success">Düşük</span>`;
                
                // Durum Görünümü
                let statusBadge = isDone ? `<span class="status-badge status-success">Tamamlandı</span>` 
                                         : `<span class="status-badge" style="background:#e2e8f0; color:#475569;">Devam Ediyor</span>`;

                tbody.innerHTML += `
                    <tr>
                        <td style="padding:12px; font-weight:bold;">${title}</td>
                        <td style="padding:12px; font-size:13px;">${desc}</td>
                        <td style="padding:12px;">${prioBadge}</td>
                        <td style="padding:12px;">${statusBadge}</td>
                        <td style="padding:12px; text-align:right;">
                            <button type="button" onclick="openCrudTaskModal(${id}, '${title}', '${desc}', ${prio}, ${isDone})" style="padding:6px 12px; background:#3b82f6; color:white; border:none; border-radius:4px; cursor:pointer; margin-right:5px;">Düzenle</button>
                            <button type="button" onclick="deleteTask(${id})" style="padding:6px 12px; background:#ef4444; color:white; border:none; border-radius:4px; cursor:pointer;">Sil</button>
                        </td>
                    </tr>
                `;
            });
        }
    } catch (err) {
        console.error("Hata:", err);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #dc2626;">Bağlantı hatası oluştu.</td></tr>';
    }
}

// 3. Ekleme ve Güncelleme Modalını Açar
function openCrudTaskModal(id = null, title = '', desc = '', prio = 1, isDone = false) {
    
    // Verileri HTML kutucuklarına doldur
    document.getElementById('crud-task-id').value = id || '';
    document.getElementById('crud-task-name').value = title;
    document.getElementById('crud-task-desc').value = desc;
    document.getElementById('crud-task-priority').value = prio;
    document.getElementById('crud-task-status').value = isDone ? "true" : "false";

    // Modal başlığını ID durumuna göre değiştir
    document.getElementById('crud-task-title').innerText = id ? 'Görevi Düzenle' : 'Yeni Görev Ekle';
    
    // Yeni görev ekleniyorsa Durum alanını gizle, düzenleniyorsa göster
    const statusContainer = document.getElementById('status-container');
    if (statusContainer) {
        statusContainer.style.display = id ? 'block' : 'none';
    }

    // Modalı ekranda göster
    document.getElementById('crud-task-modal').style.display = 'flex';
}

// 4. Form Gönderimi (Yeni Görev POST veya Mevcut Görev PUT)
document.getElementById('crud-task-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('jwtToken');
    const userId = document.getElementById('task-user-select').value;
    const taskId = document.getElementById('crud-task-id').value;
    
    const isDone = document.getElementById('crud-task-status').value === "true";

    // DİKKAT: C# API'nin reddetmemesi için id ve userId verilerini de pakete ekliyoruz!
    const taskData = {
        id: taskId ? parseInt(taskId) : 0,
        userId: parseInt(userId),
        title: document.getElementById('crud-task-name').value,
        description: document.getElementById('crud-task-desc').value,
        priority: parseInt(document.getElementById('crud-task-priority').value),
        isCompleted: isDone,
        status: isDone ? 2 : 0 
    };

    try {
        let response;
        if (taskId) {
            // GÜNCELLEME İŞLEMİ (PUT)
            response = await fetch(`${API_ADMIN_URL}/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });
        } else {
            // YENİ EKLEME İŞLEMİ (POST)
            response = await fetch(`${API_ADMIN_URL}/user-tasks/${userId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });
        }

        if (response.ok) {
            showToast(taskId ? "Görev başarıyla güncellendi!" : "Yeni görev eklendi!", "success");
            document.getElementById('crud-task-modal').style.display = 'none';
            await loadTasksForSelectedUser(); // Tabloyu tazele
        } else {
            // Hatanın ne olduğunu C#'tan çekip ekrana yazdırıyoruz
            const errorText = await response.text();
            console.error("C# API Hatası:", errorText);
            showToast("Hata: " + (errorText || response.status + " Kodu Döndü"), "error");
        }
    } catch (err) {
        showToast("Sunucu ile iletişim kurulamadı.", "error");
    }
});

// 5. Görev Silme (DELETE) - Modern Onay Pencereli
async function deleteTask(taskId) {
    // Tarayıcının sıkıcı uyarısı yerine modern SweetAlert2 uyarısı
    const result = await Swal.fire({
        title: 'Emin misiniz?',
        text: "Bu görevi tamamen silmek üzeresiniz, bu işlem geri alınamaz!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444', // Silme işlemine uygun kırmızı
        cancelButtonColor: '#64748b',  // İptal için nötr gri
        confirmButtonText: 'Evet, Sil!',
        cancelButtonText: 'İptal',
        background: '#ffffff',
        color: '#1e293b',
        borderRadius: '8px'
    });

    // Eğer kullanıcı "İptal" butonuna basarsa (veya pencereyi kapatırsa) işlemi durdur
    if (!result.isConfirmed) {
        return; 
    }

    // Kullanıcı "Evet, Sil!" dediyse silme işlemine devam et
    const token = localStorage.getItem('jwtToken');
    try {
        const response = await fetch(`${API_ADMIN_URL}/tasks/${taskId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            // Silme işlemi başarılıysa küçük bir başarı bildirimi göster
            Swal.fire({
                title: 'Silindi!',
                text: 'Görev başarıyla sistemden kaldırıldı.',
                icon: 'success',
                timer: 1500, // 1.5 saniye sonra kendi kendine kapanır
                showConfirmButton: false
            });
            await loadTasksForSelectedUser(); // Tabloyu tazele
        } else {
            const errorText = await response.text();
            console.error("Silme Hatası:", errorText);
            Swal.fire('Hata!', "Silinemedi! Hata: " + (errorText || response.status), 'error');
        }
    } catch (err) {
        Swal.fire('Bağlantı Hatası!', "Sunucu ile iletişim kurulamadı.", 'error');
    }
}


// Sayfa yüklendiğinde logları doğrudan çek
loadSecurityLogs();





