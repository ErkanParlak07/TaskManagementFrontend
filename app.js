
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
                ${taskStatus !== 2 ? `<button class="btn-action btn-update">Tamamla</button>` : ''}
                <button class="btn-action btn-edit">Düzenle</button>
                <button class="btn-action btn-delete">Sil</button>
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

async function completeTask(id, title, description, priority) {
    const updateData = { 
        id: id, title: title, description: description, status: 2, priority: priority 
    };
    const success = await updateTaskInAPI(id, updateData);
    if (success) await loadTasks();
}

async function removeTask(id) {
    if (confirm("Bu görevi kalıcı olarak silmek istediğinize emin misiniz?")) {
        const success = await deleteTaskFromAPI(id);
        if (success) await loadTasks();
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
}