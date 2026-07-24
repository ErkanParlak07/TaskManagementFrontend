
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
// --- GÜVENLİK DUVARI (Route Guard) ---
// Eğer tarayıcı kasasında (localStorage) token yoksa, hiç beklemeden login sayfasına at!
if (!localStorage.getItem('jwtToken')) {
    window.location.href = 'login.html';
}

// Çıkış Yap Butonu İşlemi
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('jwtToken'); // Kasadaki token'ı sil
            window.location.href = 'login.html'; // Giriş sayfasına yönlendir
        });
    }
});

// --- 1. DOM (HTML) Elemanlarını Seçme ---
const taskForm = document.getElementById('task-form');
const taskTitleInput = document.getElementById('task-title');
const taskDescInput = document.getElementById('task-desc');
const taskPriorityInput = document.getElementById('task-priority');
const taskListContainer = document.getElementById('task-list');
const submitBtn = document.getElementById('submit-btn');

// İstatistik Panosu (Dashboard) Elemanları
const statTotal = document.getElementById('stat-total');
const statCompleted = document.getElementById('stat-completed');
const statPending = document.getElementById('stat-pending');

// Arama ve Filtreleme Elemanları
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
// --- YARDIMCI DOĞRULAMA (VALIDATION) METOTLARI ---
function showError(inputElement, message) {
    clearError(inputElement); 
    inputElement.classList.add('is-invalid'); 
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback';
    errorDiv.innerText = message;
    
    // YENİ VE DÜZELTİLMİŞ KISIM: Hatayı en sona değil, tam olarak ilgili kutunun hemen altına ekle!
    inputElement.insertAdjacentElement('afterend', errorDiv);
}

function clearError(inputElement) {
    inputElement.classList.remove('is-invalid'); 
    
    // YENİ VE DÜZELTİLMİŞ KISIM: Sadece bu kutunun hemen altındaki elementi kontrol et, hata mesajıysa sil
    const nextElement = inputElement.nextElementSibling;
    if (nextElement && nextElement.classList.contains('invalid-feedback')) {
        nextElement.remove();
    }
}

let isEditing = false;
let currentEditId = null;
let currentEditStatus = 0;

// YENİ: API'den gelen orijinal veriyi hafızada tutacağımız dizi
let allTasks = []; 

// --- 2. Sayfa Yüklendiğinde Başlat ---
// --- 2. Sayfa Yüklendiğinde Başlat ---
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    
    searchInput.addEventListener('input', applyFilters);
    statusFilter.addEventListener('change', applyFilters);

    // Çıkış Yap Butonu Dinleyicisi
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('jwtToken');
            window.location.href = 'login.html';
        });
    }

    // Kullanıcı forma yazı yazarken hataları temizle
    taskTitleInput.addEventListener('input', () => clearError(taskTitleInput));
    taskDescInput.addEventListener('input', () => clearError(taskDescInput));
});

// Veriyi Çek (Sadece veritabanından veri almak için)
async function loadTasks() {
    taskListContainer.innerHTML = '<p class="loading-text">Görevler yükleniyor...</p>';
    
    // API'den veriyi alıp global dizimize kopyalıyoruz
    allTasks = await getTasksFromAPI();
    
    // Dashboard'u tüm görevlere göre güncelle
    updateDashboard(allTasks);

    // Ekrana doğrudan çizmek yerine, filtreleme fonksiyonuna paslıyoruz
    applyFilters(); 
}

// YENİ: Filtreleme Mantığı
function applyFilters() {
    // Kullanıcının aradığı metni küçük harfe çevir
    const searchTerm = searchInput.value.toLowerCase().trim();
    // Kullanıcının seçtiği durumu al (all, 0, 1, 2)
    const filterValue = statusFilter.value;

    // JavaScript 'filter' fonksiyonu ile diziyi süzüyoruz
    const filteredTasks = allTasks.filter(task => {
        const taskTitle = (task.title ?? task.Title ?? "").toLowerCase();
        const taskStatus = normalizeStatus(task.status ?? task.Status);
        
        // 1. Şart: Arama kutusundaki metin başlıkta geçiyor mu?
        const matchesSearch = taskTitle.includes(searchTerm);
        
        // 2. Şart: Dropdown menüden seçilen duruma uyuyor mu?
        let matchesStatus = true;
        if (filterValue !== "all") {
            // Dropdown'dan gelen değer String olduğu için sayıya çevirip (parseInt) kıyaslıyoruz
            matchesStatus = taskStatus === parseInt(filterValue); 
        }

        return matchesSearch && matchesStatus;
    });

    // Süzülmüş olan yeni diziyi ekrana çizmesi için gönderiyoruz
    renderTasks(filteredTasks);
}

// YENİ: Ekrana Çizme Mantığı (Eski loadTasks'ın HTML kısmı buraya taşındı)
function renderTasks(tasksToRender) {
    window.currentTasks = tasksToRender;
    if (tasksToRender.length === 0) {
        taskListContainer.innerHTML = '<p class="loading-text">Bu kritere uygun görev bulunamadı.</p>';
        return;
    }

    taskListContainer.innerHTML = ''; 

    tasksToRender.forEach(task => {
        const taskId = parseInt(task.id ?? task.Id);
        const taskTitle = task.title ?? task.Title ?? "Başlıksız";
        const taskDesc = task.description ?? task.Description ?? "";
        
        const taskStatus = normalizeStatus(task.status ?? task.Status);
        const taskPriority = normalizePriority(task.priority ?? task.Priority);

        const priorityInfo = getPriorityInfo(taskPriority);
        const statusInfo = getStatusInfo(taskStatus);

        const taskCard = document.createElement('div');
        taskCard.className = 'task-card';
        
        taskCard.innerHTML = `
            <div class="task-content">
                <h3>${taskTitle}</h3>
                <p>${taskDesc || 'Detay belirtilmemiş.'}</p>
                <div class="task-badges">
                    <span class="badge ${statusInfo.class}">${statusInfo.text}</span>
                    <span class="badge ${priorityInfo.class}">${priorityInfo.text}</span>
                </div>
            </div>
            <div class="task-actions">
                        ${taskStatus !== 2 ? `<button class="btn-action btn-update" onclick="completeTask(${task.id || task.Id})">Tamamla</button>` : ''}
                        <button class="btn-action btn-edit" onclick="editTask(${task.id || task.Id})">Düzenle</button>
                        <button class="btn-action btn-delete" onclick="removeTask(${task.id || task.Id})">Sil</button>
                    </div>
        `;

        if (taskStatus !== 2) {
            taskCard.querySelector('.btn-update').addEventListener('click', () => completeTask(taskId, taskTitle, taskDesc, taskPriority));
        }
        
        taskCard.querySelector('.btn-edit').addEventListener('click', () => editTask(taskId, taskTitle, taskDesc, taskPriority, taskStatus));
        taskCard.querySelector('.btn-delete').addEventListener('click', () => removeTask(taskId));

        taskListContainer.appendChild(taskCard);
    });
}

// --- 3. Form Gönderimi (Ekleme ve Düzenleme) ---
taskForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    // --- GÖREV DOĞRULAMA KONTROLLERİ ---
    let hasError = false;

    // Başlık 3 karakterden kısaysa hata ver
    if (taskTitleInput.value.trim().length < 3) {
        showError(taskTitleInput, "Görev başlığı en az 3 karakter olmalıdır.");
        hasError = true;
    } 

    // Açıklama 500 karakterden uzunsa hata ver
    if (taskDescInput.value.trim().length > 500) {
        showError(taskDescInput, "Açıklama en fazla 500 karakter olabilir.");
        hasError = true;
    }

    // Eğer hata varsa alt satırlara geçme ve API'ye istek gönderme!
    if (hasError) return; 
    // -----------------------------------
    submitBtn.disabled = true;

    if (isEditing) {
        submitBtn.innerText = "Güncelleniyor...";
        const updateData = {
            id: currentEditId, 
            title: taskTitleInput.value,
            description: taskDescInput.value,
            status: currentEditStatus,
            priority: parseInt(taskPriorityInput.value)
        };

        const success = await updateTaskInAPI(currentEditId, updateData);
        if (success) {
            resetForm();
            await loadTasks(); 
        } else {
            alert("Güncelleme başarısız oldu.");
        }
    } else {
        submitBtn.innerText = "Ekleniyor...";
        const createData = {
            title: taskTitleInput.value,
            description: taskDescInput.value,
            priority: parseInt(taskPriorityInput.value)
        };

        const createdTask = await addTaskToAPI(createData);
        if (createdTask) {
            resetForm(); 
            await loadTasks(); 
        } else {
            showToast("Görev işlemi sırasında bir hata oluştu.", "error");
        }
    }

    submitBtn.disabled = false;
});

function editTask(id, title, description, priority, status) {
    taskTitleInput.value = title;
    taskDescInput.value = description;
    taskPriorityInput.value = priority;
    isEditing = true;
    currentEditId = id;
    currentEditStatus = status;
    submitBtn.innerText = "Görevi Güncelle";
    submitBtn.style.backgroundColor = "var(--success)"; 
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    taskForm.reset();
    taskPriorityInput.value = "1";
    isEditing = false;
    currentEditId = null;
    currentEditStatus = 0;
    submitBtn.innerText = "Görevi Ekle";
    submitBtn.style.backgroundColor = "var(--primary)"; 
}

async function completeTask(id) {
    const token = localStorage.getItem('jwtToken');

    try {
        // Bulduğumuz 5072 portuyla, arka uca az önce yazdığımız özel kapıya gidiyoruz
        const response = await fetch(`http://localhost:5072/api/tasks/${id}/complete`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            // 1. Önce arka uçtan güncel listeyi çekip ekrana çizdiriyoruz
            if (typeof loadTasks === "function") {
                await loadTasks(); 
            }
            
            // 2. ÇÖZÜM BURASI: Güncel görev listesini (window.currentTasks) Dashboard'a parametre olarak gönderiyoruz!
            if (typeof updateDashboard === "function" && window.currentTasks) {
                updateDashboard(window.currentTasks); 
            } 
            
            if (typeof renderDashboard === "function" && window.currentTasks) {
                renderDashboard(window.currentTasks); 
            }

            if (typeof showToast === "function") showToast("Görev başarıyla tamamlandı!", "success");
        }else {
            console.error("API Hatası:", await response.text());
            if (typeof showToast === "function") showToast("Güncellenirken bir hata oluştu.", "error");
        }
    } catch (err) {
        console.error("Bağlantı Hatası:", err);
    }
}
async function removeTask(id) {
    // Modern onay penceresini çağırıyoruz
    const result = await Swal.fire({
        title: 'Emin misiniz?',
        text: "Bu görevi kalıcı olarak silmek üzeresiniz, geri dönüşü yoktur!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33', // Kırmızı silme butonu
        cancelButtonColor: '#3085d6', // Mavi iptal butonu
        confirmButtonText: 'Evet, Sil!',
        cancelButtonText: 'İptal',
        background: '#fff',
        borderRadius: '10px'
    });

    // Eğer kullanıcı "Evet, Sil!" butonuna tıkladıysa
    if (result.isConfirmed) {
        try {
            // Projendeki mevcut API silme fonksiyonunu çağırıyoruz
            const success = await deleteTaskFromAPI(id); 
            
            if (success) {
                // Listeyi ve panoyu (dashboard) güncelliyoruz
                if (typeof loadTasks === "function") await loadTasks();
                if (typeof updateDashboard === "function" && window.currentTasks) updateDashboard(window.currentTasks);
                if (typeof renderDashboard === "function" && window.currentTasks) renderDashboard(window.currentTasks);

                // Silme başarılı olduktan sonra çıkan küçük başarı animasyonu
                Swal.fire({
                    title: 'Silindi!',
                    text: 'Görev başarıyla silindi.',
                    icon: 'success',
                    timer: 1500, // 1.5 saniye sonra kendi kapanır
                    showConfirmButton: false
                });
            } else {
                Swal.fire('Hata!', 'Görev silinirken bir sorun oluştu.', 'error');
            }
        } catch (err) {
            console.error("Silme Hatası:", err);
            Swal.fire('Bağlantı Hatası!', 'Sunucuya ulaşılamadı.', 'error');
        }
    }
}

// --- İstatistik Panosu (Dashboard) ---
function updateDashboard(tasksArray) {
    const total = tasksArray.length;
    const completed = tasksArray.filter(task => {
        return normalizeStatus(task.status ?? task.Status) === 2;
    }).length;
    
    statTotal.innerText = total;
    statCompleted.innerText = completed;
    statPending.innerText = total - completed;
}

// --- Yardımcı Araçlar: Veri Temizleme ---
function normalizeStatus(val) {
    if (val === null || val === undefined) return 0;
    const s = String(val).toLowerCase().trim();
    if (s === '2' || s === 'done' || s === 'completed' || s === 'tamamlandı') return 2;
    if (s === '1' || s === 'inprogress' || s === 'in progress' || s === 'devam ediyor') return 1;
    return 0; 
}

function normalizePriority(val) {
    if (val === null || val === undefined) return 1;
    const s = String(val).toLowerCase().trim();
    if (s === '2' || s === 'high' || s === 'yüksek') return 2;
    if (s === '0' || s === 'low' || s === 'düşük') return 0;
    return 1; 
}

function getPriorityInfo(priorityValue) {
    switch (priorityValue) {
        case 0: return { text: 'Düşük Öncelik', class: 'badge-blue' };
        case 1: return { text: 'Orta Öncelik', class: 'badge-blue' };
        case 2: return { text: 'Yüksek Öncelik', class: 'badge-red' };
        default: return { text: 'Belirsiz', class: 'badge-blue' };
    }
}

function getStatusInfo(statusValue) {
    switch (statusValue) {
        case 0: return { text: 'Yapılacak', class: 'badge-blue' };
        case 1: return { text: 'Devam Ediyor', class: 'badge-blue' };
        case 2: return { text: 'Tamamlandı', class: 'badge-green' };
        default: return { text: 'Belirsiz', class: 'badge-blue' };
    }
    // YÖNETİCİ PANELİ YETKİ KONTROLÜ (Global Scope)
window.checkAdminAccess = function(event) {
    event.preventDefault(); 
    
    // Rolü okuma kısmı (Giriş yaparken nasıl kaydettiysen o geçerli olur)
    const userRole = localStorage.getItem('role') || localStorage.getItem('userRole'); 

    if (userRole === 'Admin') {
        window.location.href = 'admin.html';
    } else {
        // Eğer showToast ana sayfada çalışmazsa standart alert de kullanabiliriz:
        if (typeof showToast === "function") {
            showToast("Bu alana erişim yetkiniz bulunmamaktadır. Sadece yöneticiler giriş yapabilir.", "error");
        } else {
            alert("Bu alana erişim yetkiniz bulunmamaktadır. Sadece yöneticiler giriş yapabilir.");
        }
    }
};
}
// --- BİLDİRİM SİSTEMİ (DUMMY VERİLERLE TEST) ---

// İleride bu veriler API'den gelecek (örn: fetch('/api/notifications'))
let notifications = [
    { id: 1, message: "Admin sana 'Veritabanı Yedeklemesi' görevini atadı.", time: "5 dakika önce", isRead: false },
    { id: 2, message: "Admin 'Arayüz Tasarımı' görevini güncelledi.", time: "1 saat önce", isRead: false },
    { id: 3, message: "Admin sana 'Toplantı Notları' görevini atadı.", time: "Dün", isRead: true }
];

// Sayfa yüklendiğinde bildirimleri ekrana bas
document.addEventListener('DOMContentLoaded', () => {
    renderNotifications();
});

function renderNotifications() {
    const list = document.getElementById('notification-list');
    const badge = document.getElementById('notification-count');
    
    list.innerHTML = '';
    let unreadCount = 0;

    notifications.forEach(notif => {
        if (!notif.isRead) unreadCount++;

        const li = document.createElement('li');
        li.className = `notification-item ${notif.isRead ? '' : 'unread'}`;
        li.innerHTML = `
            <span>${notif.message}</span>
            <span class="notification-time">${notif.time}</span>
        `;
        list.appendChild(li);
    });

    // Okunmamış bildirim varsa sayacı göster, yoksa gizle
    if (unreadCount > 0) {
        badge.innerText = unreadCount;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

// Zile tıklandığında menüyü aç/kapat
function toggleNotifications() {
    const dropdown = document.getElementById('notification-dropdown');
    dropdown.classList.toggle('show');

    // Menü açıldığında bildirimleri "Okundu" olarak işaretle
    if (dropdown.classList.contains('show')) {
        notifications.forEach(n => n.isRead = true);
        
        // Sayacı gizlemek ve arka planları normale çevirmek için tekrar render et
        // (İsteğe bağlı olarak bu işlemi bir süre gecikmeyle de yapabilirsin)
        setTimeout(() => {
            renderNotifications();
        }, 1500); // 1.5 saniye sonra okundu işaretler
    }
}

// Menü dışına tıklandığında açılır pencereyi kapat
window.onclick = function(event) {
    if (!event.target.closest('.notification-container')) {
        const dropdown = document.getElementById('notification-dropdown');
        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    }

    // --- SIGNALR GERÇEK ZAMANLI BİLDİRİM SİSTEMİ ---

// 1. Bağlantıyı tanımla (Buradaki URL'yi kendi backend portuna göre güncellemelisin! Örn: https://localhost:7198)
const API_BASE_URL = "http://localhost:5072"; 
const connection = new signalR.HubConnectionBuilder()
    .withUrl(`${API_BASE_URL}/notificationHub`)
    .build();

// 2. Bağlantıyı başlat
connection.start()
    .then(() => console.log("SignalR'a başarıyla bağlanıldı! Canlı bildirimler aktif."))
    .catch(err => console.error("SignalR Bağlantı Hatası: ", err));

// 3. Backend'den gelen "ReceiveNotification" sinyalini dinle
connection.on("ReceiveNotification", function (message) {
    console.log("İŞTE YAKALADIM! Gelen mesaj:", message); // Konsola bunu yazdırıyor mu bakalım?
    alert("Yeni Bildirim: " + message); // Tarayıcıda doğrudan bir uyarı penceresi açsın
    
    // Gelen mesajı arayüzdeki (UI) kırmızı zile ve listeye yansıtacak fonksiyonu çağır
    showRealTimeNotification(message);
});
function showRealTimeNotification(message) {
    const list = document.getElementById('notification-list');
    const badge = document.getElementById('notification-count');
    
    if(!list || !badge) return; // Sayfada elementler yoksa hata verme

    // O anki saati al (Örn: 14:30)
    const now = new Date();
    const timeString = now.getHours().toString().padStart(2, '0') + ':' + 
                       now.getMinutes().toString().padStart(2, '0');

    // 1. Yeni bildirimi oluştur
    const li = document.createElement('li');
    li.className = 'notification-item unread';
    li.innerHTML = `
        <span>${message}</span>
        <span class="notification-time">${timeString}</span>
    `;

    // 2. Listede en üste ekle (prepend)
    list.prepend(li);

    // 3. Kırmızı sayacı güncelle ve görünür yap
    let currentCount = parseInt(badge.innerText) || 0;
    currentCount++;
    badge.innerText = currentCount;
    badge.style.display = 'block';
}




}