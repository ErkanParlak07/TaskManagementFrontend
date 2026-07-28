
let currentPage = 1;
const rowsPerPage = 5; // Sayfa başına kaç kişi gösterileceğini burası belirliyor
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
            usersData = await response.json(); // Gerçek veriler API'den geldi
            
            // --- DUMMY VERİ TEST ALANI (Sayfalamayı test etmek için eklendi) ---
            for (let i = 100; i < 115; i++) {
                usersData.push({
                    id: i,
                    username: `TestKullanici_${i}`,
                    role: i % 3 === 0 ? 'Admin' : 'User', // Rastgele rol dağıtımı
                    isDeleted: false
                });
            }
            // ------------------------------------------------------------------

            currentPage = 1; 
            renderTable(); // Tabloyu 15 yeni sahte veriyle birlikte çiz
        }else {
            showToast("Erişim yetkiniz yok!", "error");
            window.location.href = 'index.html';
        }
    } catch (err) {
        console.error("Hata:", err);
    }
}


// Tabloyu ekrana basan fonksiyon (Sayfalama entegre edildi)
function renderTable() {
    const tbody = document.getElementById('admin-user-list');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Checkbox işaretli mi? (true/false)
    const showPassive = document.getElementById('show-inactive')?.checked || false;
    
    // Sadece checkbox'ın durumuna uyanları filtrele
    const filteredUsers = usersData.filter(u => u.isDeleted === showPassive);

    // --- SAYFALAMA HESAPLAMALARI ---
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    
    // Tüm filtrelenmiş listeyi değil, sadece o sayfaya ait olan kısmı al (slice)
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // filteredUsers YERİNE paginatedUsers üzerinde dönüyoruz
    paginatedUsers.forEach(user => {
        const row = document.createElement('tr');
        row.style.borderBottom = "1px solid #ddd"; // Satır altı çizgisi

        let actionButton = '';
        if (user.isDeleted) {
            actionButton = `<button type="button" onclick="toggleUser(${user.id})" class="btn-action" style="background-color: #28a745;">Aktif Et</button>`;
        } else {
            actionButton = `<button type="button" onclick="toggleUser(${user.id})" class="btn-action" style="background-color: #dc3545;">Pasif Et</button>`;
        }

        row.innerHTML = `
            <td style="padding: 10px;">${user.id}</td>
            <td style="padding: 10px; font-weight: bold;">${user.username}</td>
            <td style="padding: 10px;">${user.role}</td>
            <td style="padding: 10px; display: flex; gap: 8px; align-items: center; justify-content: flex-end;">
                <button type="button" class="btn-action" onclick="openEditModal(${user.id})" style="background-color: #007bff;">Düzenle</button>
                ${actionButton}
            </td>
        `;
        
        tbody.appendChild(row); // Satırı tabloya ekle
    });

    // Tabloyu çizdikten sonra altındaki sayfa numarası butonlarını oluştur
    setupPaginationButtons(filteredUsers.length);
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
    document.getElementById('UserManagement').style.display = 'block';
    document.getElementById('AdminDashboard').style.display = 'none';
    document.getElementsByClassName('tab-btn')[0].classList.add('active'); 
    document.getElementsByClassName('tab-btn')[1].classList.remove('active');

    const user = usersData ? usersData.find(u => u.id === id) : null;
    if (!user) return;

    // Eski Alanlar
    document.getElementById('edit-id').value = user.id;
    document.getElementById('edit-username').value = user.username || '';
    document.getElementById('edit-email').value = user.email || ''; 
    document.getElementById('edit-role').value = user.role || 'User';
    document.getElementById('edit-password').value = '';

    // Yeni Alanlar (Veritabanından geliyorsa doldur, yoksa boş bırak)
    if(document.getElementById('edit-fullname')) document.getElementById('edit-fullname').value = user.fullName || user.FullName || '';
    if(document.getElementById('edit-phone')) document.getElementById('edit-phone').value = user.phoneNumber || user.PhoneNumber || '';
    if(document.getElementById('edit-bio')) document.getElementById('edit-bio').value = user.biography || user.Biography || '';
    
    // Güvenlik gereği dosya seçicinin içi programatik olarak doldurulamaz, sıfırlıyoruz.
    if(document.getElementById('edit-photo-file')) document.getElementById('edit-photo-file').value = ''; 

    document.getElementById('edit-modal').style.display = 'flex';
}

// MODAL KAPATMA İŞLEMİ
function closeModal() {
    document.getElementById('edit-modal').style.display = 'none';
}

// 2. FORM GÖNDERME İŞLEMİ (FormData Formatında)
document.getElementById('edit-form')?.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    const id = document.getElementById('edit-id').value;
    const token = localStorage.getItem('jwtToken');
    
    // Fotoğraf yükleyebilmek için JSON yerine FormData kullanıyoruz
    const formData = new FormData();
    formData.append("Username", document.getElementById('edit-username').value);
    formData.append("Email", document.getElementById('edit-email').value);
    formData.append("Role", document.getElementById('edit-role').value);
    
    // Yeni eklediğimiz metin alanları
    formData.append("FullName", document.getElementById('edit-fullname').value);
    formData.append("PhoneNumber", document.getElementById('edit-phone').value);
    formData.append("Biography", document.getElementById('edit-bio').value);

    // Şifre girilmişse ekle
    const newPassword = document.getElementById('edit-password').value;
    if (newPassword) {
        formData.append("Password", newPassword);
    }

    // Dosya seçilmişse ekle
    const photoFile = document.getElementById('edit-photo-file').files[0];
    if (photoFile) {
        formData.append("ProfilePhoto", photoFile);
    }

    try {
        const response = await fetch(`${API_ADMIN_URL}/update-user/${id}`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`
                // DİKKAT: FormData kullandığımız için 'Content-Type': 'application/json' satırını sildik!
            },
            body: formData
        });

        if (response.ok) {
            closeModal(); 
            await loadUsers(); // Tabloyu yeni verilerle çiz
            showToast("Kullanıcı başarıyla güncellendi!", "success");
        } else {
            const errText = await response.text();
            showToast("Hata: " + errText, "error");
        }
    } catch (err) {
        console.error("Bağlantı Hatası:", err);
        showToast("Sunucuyla bağlantı kurulamadı.", "error");
    }});



function closeAssignTaskModal() {
    document.getElementById('assign-task-modal').style.display = 'none';
}

// FORMU GÖNDER VE GÖREVİ ATA
document.getElementById('assign-task-form')?.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    // ==========================================
    // İŞTE BÜYÜK DÜZELTME BURADA!
    // Gizli ve boş gelen input yerine, Görev Yönetimi sekmesinde
    // zaten seçmiş olduğumuz dropdown'un (açılır menünün) değerini alıyoruz!
    const userId = document.getElementById('task-user-select').value;
    // ==========================================

    if (!userId) {
        showToast("Lütfen görev atamak için üst menüden bir kullanıcı seçin.", "error");
        return;
    }

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
            body: JSON.stringify({ 
                title: taskTitle,
                description: taskDesc,
                priority: taskPriority
            }) 
        });

        if (response.ok) {
            showToast("Görev başarıyla atandı!", "success");
            closeAssignTaskModal();
            document.getElementById('assign-task-form').reset(); // Formu temizle
            await loadTasksForSelectedUser(); // Eklenen görevi anında tabloya yansıt
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
    paginateAdminTasks(1);
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
    const dueDateInput = document.getElementById('admin-task-duedate');
const dueDate = dueDateInput && dueDateInput.value ? dueDateInput.value : null;
    const isDone = document.getElementById('crud-task-status').value === "true";

    // DİKKAT: C# API'nin reddetmemesi için id ve userId verilerini de pakete ekliyoruz!
    const taskData = {
        id: taskId ? parseInt(taskId) : 0,
        userId: parseInt(userId),
        title: document.getElementById('crud-task-name').value,
        description: document.getElementById('crud-task-desc').value,
        priority: parseInt(document.getElementById('crud-task-priority').value),
        dueDate: dueDate,
        isCompleted: isDone,
        status: isDone ? 2 : 0 
    };
    console.log("API'ye Gönderilen Veri:", taskData);

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
// Sayfalama butonlarını dinamik oluşturan yeni fonksiyon
function setupPaginationButtons(totalItems) {
    const paginationContainer = document.getElementById('users-pagination');
    if (!paginationContainer) return; // HTML'de div unutulmuşsa hata vermesin
    
    paginationContainer.innerHTML = '';

    // Toplam kaç sayfa olacağını hesapla
    const totalPages = Math.ceil(totalItems / rowsPerPage);

    if (totalPages <= 1) return; // Tek sayfa varsa butonları göstermeye gerek yok

    // "Önceki" Butonu
    const prevBtn = document.createElement('button');
    prevBtn.innerText = 'Önceki';
    prevBtn.className = 'page-btn';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => { 
        currentPage--; 
        renderTable(); 
    };
    paginationContainer.appendChild(prevBtn);

    // Numaralı Butonlar (1, 2, 3...)
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.innerText = i;
        btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        btn.onclick = () => { 
            currentPage = i; 
            renderTable(); 
        };
        paginationContainer.appendChild(btn);
    }

    // "Sonraki" Butonu
    const nextBtn = document.createElement('button');
    nextBtn.innerText = 'Sonraki';
    nextBtn.className = 'page-btn';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => { 
        currentPage++; 
        renderTable(); 
    };
    paginationContainer.appendChild(nextBtn);
}


// Sayfa yüklendiğinde logları doğrudan çek
loadSecurityLogs();
// Sıralama durumu için global değişkenler

// SIRALAMA İÇİN GLOBAL DEĞİŞKENLER
let currentSortColumn = '';
let isSortAscending = true;

// Tabloyu Doğrudan HTML Üzerinden (DOM) Sıralayan Tam Korumalı Kod
function sortAdminTasks(columnName) {
    // 1. KRİTİK DÜZELTME: HTML'den 'Title' veya 'TITLE' gelse bile onu 'title' yapar
    const safeColumnName = columnName.toLowerCase();
    
    console.log("--- Sıralama Başladı ---");
    console.log("Orijinal Tıklanan Sütun:", columnName);
    console.log("İşleme Alınan Sütun:", safeColumnName);

    // İkon span'ını bul (id'si büyük veya küçük harfle yazılmış olabilir diye ikisine de bakıyoruz)
    const iconSpan = document.getElementById(`sort-icon-${safeColumnName}`) || document.getElementById(`sort-icon-${columnName}`);
    
    // Tabloyu ve içeriği bul
    const table = iconSpan ? iconSpan.closest('table') : document.querySelector('table');
    if (!table) return;

    const tbody = table.querySelector('tbody') || table;
    const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => row.querySelectorAll('td').length >= 2);
    
    if (rows.length === 0) return;

    // Yön Belirleme
    if (currentSortColumn === safeColumnName) {
        isSortAscending = !isSortAscending;
    } else {
        currentSortColumn = safeColumnName;
        isSortAscending = true;
    }

    
    const columnIndexMap = {
        'title': 0,        
        'description': 1,  
        'priority': 2,     
        'status': 3        
    };
    const colIndex = columnIndexMap[safeColumnName];

    if (colIndex === undefined) {
        console.error("HATA: Sütun eşleşmesi bulunamadı!");
        return;
    }

    // Sıralama İşlemi
    rows.sort((rowA, rowB) => {
        const tdsA = rowA.querySelectorAll('td');
        const tdsB = rowB.querySelectorAll('td');

       let valA = tdsA[colIndex] ? tdsA[colIndex].textContent.trim() : '';
       let valB = tdsB[colIndex] ? tdsB[colIndex].textContent.trim() : '';

        // Öncelik Mantığı (Yüksek > Orta > Düşük)
        if (safeColumnName === 'priority') {
            const pMap = { 'Düşük': 1, 'Orta': 2, 'Yüksek': 3 };
            valA = pMap[valA] || 0;
            valB = pMap[valB] || 0;
        }
        // Durum Mantığı (Tamamlandı > Devam Ediyor)
        else if (safeColumnName === 'status') {
            valA = (valA === 'Tamamlandı') ? 2 : 1;
            valB = (valB === 'Tamamlandı') ? 2 : 1;
        }
        // Metin Mantığı
        else {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }

        if (valA < valB) return isSortAscending ? -1 : 1;
        if (valA > valB) return isSortAscending ? 1 : -1;
        return 0;
        paginateAdminTasks(1);
    });

    // Sıralanmış satırları tabloya geri ekle (Gözle görülür değişiklik burada olur)
    rows.forEach(row => tbody.appendChild(row));
    console.log("Sıralama başarılı, tablo güncellendi!");

    // İkonları (Okları) Temizle
    const allIcons = ['title', 'description', 'priority', 'status', 'Title', 'Description', 'Priority', 'Status'];
    allIcons.forEach(id => {
        const el = document.getElementById(`sort-icon-${id}`);
        if(el) el.innerText = '';
    });
    
    // Doğru ikonu (Ok İşaretini) yerleştir
    const iconTarget = document.getElementById(`sort-icon-${safeColumnName}`) || document.getElementById(`sort-icon-${columnName}`);
    if (iconTarget) {
        iconTarget.innerText = isSortAscending ? ' ▲' : ' ▼';
    }
}
// SAYFALAMA İÇİN GLOBAL DEĞİŞKENLER
let currentTaskPage = 1;
const tasksPerPage = 5; // Bir sayfada kaç görev gösterileceğini buradan ayarlayabilirsin

// Sayfalama ve Satırları Gizleme/Gösterme İşlemi
function paginateAdminTasks(page = 1) {
    currentTaskPage = page;
    
    // Tabloyu ve satırları bul
    const iconSpan = document.getElementById('sort-icon-title');
    const table = iconSpan ? iconSpan.closest('table') : null;
    if (!table) return;

    const tbody = table.querySelector('tbody') || table;
    const allRows = Array.from(tbody.querySelectorAll('tr')).filter(row => row.querySelectorAll('td').length >= 2);
    
    if (allRows.length === 0) return;

    // Toplam sayfa sayısını hesapla
    const totalPages = Math.ceil(allRows.length / tasksPerPage);
    
    if (currentTaskPage < 1) currentTaskPage = 1;
    if (currentTaskPage > totalPages) currentTaskPage = totalPages;

    const startIndex = (currentTaskPage - 1) * tasksPerPage;
    const endIndex = startIndex + tasksPerPage;

    // Hangi satırların görünüp gizleneceğini ayarla
    allRows.forEach((row, index) => {
        if (index >= startIndex && index < endIndex) {
            row.style.display = ''; // Bu sayfadaki görevleri göster
        } else {
            row.style.display = 'none'; // Diğer sayfadaki görevleri gizle
        }
    });

    // Butonları çiz
    renderTaskPaginationButtons(totalPages);
}

// Butonları HTML'e Çizen Fonksiyon
function renderTaskPaginationButtons(totalPages) {
    const container = document.getElementById('task-pagination');
    if (!container) return;

    let html = '';
    
    // Önceki Butonu
    html += `<button onclick="paginateAdminTasks(${currentTaskPage - 1})" ${currentTaskPage === 1 ? 'disabled' : ''} style="padding: 8px 16px; border: 1px solid #e2e8f0; background: ${currentTaskPage === 1 ? '#f8fafc' : 'white'}; color: ${currentTaskPage === 1 ? '#94a3b8' : '#333'}; border-radius: 6px; cursor: ${currentTaskPage === 1 ? 'not-allowed' : 'pointer'}; font-weight: 500;">Önceki</button>`;

    // Sayfa Numaraları
    for (let i = 1; i <= totalPages; i++) {
        const isActive = i === currentTaskPage;
        html += `<button onclick="paginateAdminTasks(${i})" style="padding: 8px 16px; border: 1px solid ${isActive ? '#6c5ce7' : '#e2e8f0'}; background: ${isActive ? '#6c5ce7' : 'white'}; color: ${isActive ? 'white' : '#64748b'}; border-radius: 6px; cursor: pointer; font-weight: bold;">${i}</button>`;
    }

    // Sonraki Butonu
    html += `<button onclick="paginateAdminTasks(${currentTaskPage + 1})" ${currentTaskPage === totalPages ? 'disabled' : ''} style="padding: 8px 16px; border: 1px solid #e2e8f0; background: ${currentTaskPage === totalPages ? '#f8fafc' : 'white'}; color: ${currentTaskPage === totalPages ? '#94a3b8' : '#333'}; border-radius: 6px; cursor: ${currentTaskPage === totalPages ? 'not-allowed' : 'pointer'}; font-weight: 500;">Sonraki</button>`;

    container.innerHTML = html;
}






