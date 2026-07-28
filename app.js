// --- GLOBAL DEĞİŞKENLER (Dosyanın en üstünde mutlaka olmalıdır) ---
let currentPage = 1;
const itemsPerPage = 5; 
let allTasks = []; 
let isEditing = false;
let currentEditId = null;
let currentEditStatus = 0;
let calendar = null;

// --- MODERN BİLDİRİM GÖSTERİCİ FONKSİYON ---
function showToast(message, type = 'error') {
    const toast = document.createElement('div');
    toast.className = `modern-toast toast-${type}`;
    toast.innerText = message;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- GÜVENLİK DUVARI (Route Guard) ---
if (!localStorage.getItem('jwtToken')) {
    window.location.href = 'login.html';
}

// --- 1. DOM (HTML) Elemanlarını Seçme ---
const taskForm = document.getElementById('task-form');
const taskTitleInput = document.getElementById('task-title');
const taskDescInput = document.getElementById('task-desc');
const taskPriorityInput = document.getElementById('task-priority');
const taskListContainer = document.getElementById('task-list');
const submitBtn = document.getElementById('submit-btn');

const statTotal = document.getElementById('stat-total');
const statCompleted = document.getElementById('stat-completed');
const statPending = document.getElementById('stat-pending');

const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');

// --- 2. Sayfa Yüklendiğinde Başlat ---
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    initCalendar(); // Takvimi de burada başlatıyoruz
    
    if(searchInput) searchInput.addEventListener('input', applyFilters);
    if(statusFilter) statusFilter.addEventListener('change', applyFilters);

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('jwtToken');
            window.location.href = 'login.html';
        });
    }

    if(taskTitleInput) taskTitleInput.addEventListener('input', () => clearError(taskTitleInput));
    if(taskDescInput) taskDescInput.addEventListener('input', () => clearError(taskDescInput));
    // --- TAKVİME OTOMATİK KAYDIRMA (AUTO SCROLL) ---
    const dueDateInputForScroll = document.getElementById('task-duedate');
    const calendarElement = document.getElementById('calendar');
    
    if (dueDateInputForScroll && calendarElement) {
        dueDateInputForScroll.addEventListener('change', function() {
            // Eğer inputtan bir tarih seçildiyse (boşaltılmadıysa) takvime kaydır
            if (this.value) { 
                calendarElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }
});

// --- YARDIMCI DOĞRULAMA (VALIDATION) METOTLARI ---
function showError(inputElement, message) {
    clearError(inputElement); 
    inputElement.classList.add('is-invalid'); 
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback';
    errorDiv.innerText = message;
    
    inputElement.insertAdjacentElement('afterend', errorDiv);
}

function clearError(inputElement) {
    inputElement.classList.remove('is-invalid'); 
    const nextElement = inputElement.nextElementSibling;
    if (nextElement && nextElement.classList.contains('invalid-feedback')) {
        nextElement.remove();
    }
}

// --- VERİ ÇEKME VE LİSTELEME MANTIĞI ---
async function loadTasks() {
    taskListContainer.innerHTML = '<p class="loading-text">Görevler yükleniyor...</p>';
    
    try {
        const data = await getTasksFromAPI();
        allTasks = Array.isArray(data) ? data : []; 
        
        updateCalendarEvents(allTasks);
        updateDashboard(allTasks);
        applyFilters(); 
    } catch (err) {
        console.error("Görevler yüklenirken kritik hata:", err);
        taskListContainer.innerHTML = '<p class="loading-text" style="color: red;">Görevler yüklenemedi. Lütfen sayfayı yenileyin veya tekrar giriş yapın.</p>';
    }
}

function applyFilters() {
    currentPage = 1; 
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const filterValue = statusFilter ? statusFilter.value : 'all';

    const filteredTasks = allTasks.filter(task => {
        const taskTitle = (task.title ?? task.Title ?? "").toLowerCase();
        const taskStatus = normalizeStatus(task.status ?? task.Status);
        
        const matchesSearch = taskTitle.includes(searchTerm);
        let matchesStatus = true;
        if (filterValue !== "all") {
            matchesStatus = taskStatus === parseInt(filterValue); 
        }

        return matchesSearch && matchesStatus;
    });

    renderTasks(filteredTasks);
}

function renderTasks(tasksToRender) {
    window.currentTasks = tasksToRender;
    if (tasksToRender.length === 0) {
        taskListContainer.innerHTML = '<p class="loading-text">Bu kritere uygun görev bulunamadı.</p>';
        removePaginationControls();
        return;
    }

    const totalPages = Math.ceil(tasksToRender.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTasks = tasksToRender.slice(startIndex, endIndex);

    taskListContainer.innerHTML = ''; 

    paginatedTasks.forEach(task => {
        const taskId = parseInt(task.id ?? task.Id);
        const taskTitle = task.title ?? task.Title ?? "Başlıksız";
        const taskDesc = task.description ?? task.Description ?? "";
        
        const taskStatus = normalizeStatus(task.status ?? task.Status);
        const taskPriority = normalizePriority(task.priority ?? task.Priority);
        
        // EKLENDİ: Tarih verisini alıyoruz
        const taskDueDate = task.dueDate ?? task.DueDate;

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
            taskCard.querySelector('.btn-update').addEventListener('click', () => completeTask(taskId));
        }
        
        // EKLENDİ: Düzenle fonksiyonuna taskDueDate gönderiliyor
        taskCard.querySelector('.btn-edit').addEventListener('click', () => {
            editTask(taskId, taskTitle, taskDesc, taskPriority, taskStatus, taskDueDate);
        });
        
        taskCard.querySelector('.btn-delete').addEventListener('click', () => removeTask(taskId));

        taskListContainer.appendChild(taskCard);
    });

    renderPaginationControls(totalPages);
}

// --- SAYFALAMA (PAGINATION) MANTIĞI ---
function renderPaginationControls(totalPages) {
    let paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'pagination-container';
        paginationContainer.style.display = 'flex';
        paginationContainer.style.justifyContent = 'center';
        paginationContainer.style.alignItems = 'center';
        paginationContainer.style.gap = '8px';
        paginationContainer.style.marginTop = '20px';
        taskListContainer.after(paginationContainer);
    }

    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let html = `
        <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} style="padding: 6px 14px; border: 1px solid #cbd5e1; background: white; color: #334155; border-radius: 6px; cursor: pointer; font-weight: 500;">Önceki</button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        html += `
            <button onclick="changePage(${i})" style="padding: 6px 12px; border: 1px solid ${i === currentPage ? '#6c5ce7' : '#cbd5e1'}; background: ${i === currentPage ? '#6c5ce7' : 'white'}; color: ${i === currentPage ? 'white' : '#334155'}; border-radius: 6px; cursor: pointer; font-weight: bold;">${i}</button>
        `;
    }

    html += `
        <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} style="padding: 6px 14px; border: 1px solid #cbd5e1; background: white; color: #334155; border-radius: 6px; cursor: pointer; font-weight: 500;">Sonraki</button>
    `;

    paginationContainer.innerHTML = html;
}

function removePaginationControls() {
    const paginationContainer = document.getElementById('pagination-container');
    if (paginationContainer) paginationContainer.innerHTML = '';
}

window.changePage = function(page) {
    currentPage = page;
    renderTasks(window.currentTasks);
    taskListContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

// --- 3. FORM GÖNDERİMİ (EKLEME VE DÜZENLEME) ---
if (taskForm) {
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        let hasError = false;

        const dueDateInput = document.getElementById('task-duedate');
        const dueDate = dueDateInput && dueDateInput.value ? dueDateInput.value : null;

        if (taskTitleInput.value.trim().length < 3) {
            showError(taskTitleInput, "Görev başlığı en az 3 karakter olmalıdır.");
            hasError = true;
        } 

        if (taskDescInput.value.trim().length > 500) {
            showError(taskDescInput, "Açıklama en fazla 500 karakter olabilir.");
            hasError = true;
        }

        if (hasError) return; 
        
        submitBtn.disabled = true;

        if (isEditing) {
            submitBtn.innerText = "Güncelleniyor...";
            const updateData = {
                id: currentEditId, 
                title: taskTitleInput.value,
                description: taskDescInput.value,
                status: currentEditStatus,
                priority: parseInt(taskPriorityInput.value),
                dueDate: dueDate // EKSİK OLAN KISIM EKLENDİ
            };

            const success = await updateTaskInAPI(currentEditId, updateData);
            if (success) {
                resetForm();
                await loadTasks(); 
            } else {
                if (typeof showToast === "function") showToast("Güncelleme başarısız oldu.", "error");
            }
        } else {
            submitBtn.innerText = "Ekleniyor...";
            const createData = {
                title: taskTitleInput.value,
                description: taskDescInput.value,
                priority: parseInt(taskPriorityInput.value),
                dueDate: dueDate // EKSİK OLAN KISIM EKLENDİ
            };

            const createdTask = await addTaskToAPI(createData);
            if (createdTask) {
                resetForm(); 
                await loadTasks(); 
            } else {
                if (typeof showToast === "function") showToast("Görev işlemi sırasında bir hata oluştu.", "error");
            }
        }

        submitBtn.disabled = false;
    });
}

function editTask(id, title, description, priority, status, dueDate) {
    taskTitleInput.value = title;
    taskDescInput.value = description;
    taskPriorityInput.value = priority;
    
    // Formdaki tarih kutusuna var olan tarihi doldur
    const dueDateInput = document.getElementById('task-duedate');
    if(dueDateInput && dueDate) {
        dueDateInput.value = dueDate.split('T')[0];
    } else if (dueDateInput) {
        dueDateInput.value = '';
    }

    isEditing = true;
    currentEditId = id;
    currentEditStatus = status;
    submitBtn.innerText = "Görevi Güncelle";
    submitBtn.style.backgroundColor = "var(--success)"; 
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    if(taskForm) taskForm.reset();
    if(taskPriorityInput) taskPriorityInput.value = "1";
    
    const dueDateInput = document.getElementById('task-duedate');
    if(dueDateInput) dueDateInput.value = '';

    isEditing = false;
    currentEditId = null;
    currentEditStatus = 0;
    if(submitBtn) {
        submitBtn.innerText = "Görevi Ekle";
        submitBtn.style.backgroundColor = "var(--primary)"; 
    }
}

// --- CRUD OPERASYONLARI YARDIMCILARI ---
async function completeTask(id) {
    const token = localStorage.getItem('jwtToken');
    try {
        const response = await fetch(`http://localhost:5072/api/tasks/${id}/complete`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            if (typeof loadTasks === "function") await loadTasks(); 
            if (typeof showToast === "function") showToast("Görev başarıyla tamamlandı!", "success");
        } else {
            console.error("API Hatası:", await response.text());
            if (typeof showToast === "function") showToast("Güncellenirken bir hata oluştu.", "error");
        }
    } catch (err) {
        console.error("Bağlantı Hatası:", err);
    }
}

async function removeTask(id) {
    const result = await Swal.fire({
        title: 'Emin misiniz?',
        text: "Bu görevi kalıcı olarak silmek üzeresiniz, geri dönüşü yoktur!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33', 
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Evet, Sil!',
        cancelButtonText: 'İptal',
        background: '#fff',
        borderRadius: '10px'
    });

    if (result.isConfirmed) {
        try {
            const success = await deleteTaskFromAPI(id); 
            if (success) {
                if (typeof loadTasks === "function") await loadTasks();
                Swal.fire({
                    title: 'Silindi!',
                    text: 'Görev başarıyla silindi.',
                    icon: 'success',
                    timer: 1500,
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

// --- İSTATİSTİK (DASHBOARD) PANOSU ---
function updateDashboard(tasksArray) {
    const total = tasksArray.length;
    const completed = tasksArray.filter(task => {
        return normalizeStatus(task.status ?? task.Status) === 2;
    }).length;
    
    if(statTotal) statTotal.innerText = total;
    if(statCompleted) statCompleted.innerText = completed;
    if(statPending) statPending.innerText = total - completed;
}

// --- YARDIMCI ARAÇLAR: VERİ TEMİZLEME VE GÖRÜNÜM ---
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

// YÖNETİCİ PANELİ YETKİ KONTROLÜ (Kusursuz JWT Versiyonu)
window.checkAdminAccess = function(event) {
    if(event) event.preventDefault(); 
    
    let isAdmin = false;
    const token = localStorage.getItem('jwtToken'); 

    if (token) {
        try {
            // JWT Token'ın orta kısmını (payload) şifreden çözüyoruz
            const payload = JSON.parse(atob(token.split('.')[1]));
            
            // C#'ın JWT içine koyduğu standart rol etiketini yakalıyoruz
            const role = payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || payload.role || payload.Role || "";
            
            // Büyük/küçük harf duyarlılığını ortadan kaldırarak kontrol ediyoruz
            if (role.toLowerCase() === 'admin') {
                isAdmin = true;
            }
        } catch (err) {
            console.error("Token çözümlenemedi:", err);
        }
    }

    if (isAdmin) {
        window.location.href = 'admin.html';
    } else {
        if (typeof showToast === "function") {
            showToast("Bu alana erişim yetkiniz bulunmamaktadır. Sadece yöneticiler giriş yapabilir.", "error");
        } else {
            alert("Bu alana erişim yetkiniz bulunmamaktadır. Sadece yöneticiler giriş yapabilir.");
        }
    }
};

// --- HTTP POLLING BİLDİRİM SİSTEMİ ---
async function fetchNotifications() {
    const token = localStorage.getItem('jwtToken');
    if (!token) return;

    try {
        const response = await fetch('http://localhost:5072/api/tasks/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const notifications = await response.json();
            
            const badge = document.getElementById('notification-count');
            const notificationList = document.getElementById('notification-list');
            
            const unreadCount = notifications.filter(n => !(n.isRead ?? n.IsRead)).length;
            
            if (unreadCount > 0 && badge) {
                badge.innerText = unreadCount;
                badge.style.display = 'inline-block';
            } else if (badge) {
                badge.style.display = 'none';
            }

            if (notificationList) {
                notificationList.style.maxHeight = "320px";
                notificationList.style.overflowY = "auto";
                notificationList.innerHTML = ''; 
                
                if (notifications.length === 0) {
                    notificationList.innerHTML = '<li style="padding: 15px; text-align: center; color: #888; list-style:none;">Bildirim bulunmuyor.</li>';
                    return;
                }

                notifications.forEach(notif => {
                    const newItem = document.createElement('li');
                    const isRead = notif.isRead ?? notif.IsRead;
                    
                    newItem.style.padding = "12px 15px";
                    newItem.style.borderBottom = "1px solid #f1f5f9";
                    newItem.style.fontSize = "14px";
                    newItem.style.color = "#334155";
                    newItem.style.display = "flex";
                    newItem.style.alignItems = "start";
                    newItem.style.gap = "10px";
                    newItem.style.listStyleType = "none";
                    
                    if (!isRead) {
                        newItem.style.backgroundColor = "#f8fafc"; 
                    }
                    
                    const msgText = notif.message || notif.Message || "Yeni bir bildiriminiz var.";
                    
                    newItem.innerHTML = `
                        <span style="font-size: 16px;">🔔</span>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #1e293b; margin-bottom: 3px;">Sistem Bildirimi</div>
                            <div style="font-size: 13px;">${msgText}</div>
                        </div>
                    `;  
                    notificationList.appendChild(newItem);
                });
            }
        }
    } catch (err) {
        console.error("Bildirimler kontrol edilemedi:", err);
    }
}

setInterval(fetchNotifications, 3000);
fetchNotifications(); 

window.toggleNotifications = async function(event) {
    if (event) event.stopPropagation(); 
    
    const notificationMenu = document.getElementById('notification-dropdown'); 
    
    if (notificationMenu) {
        const currentDisplay = window.getComputedStyle(notificationMenu).display;
        
        if (currentDisplay === 'none' || notificationMenu.style.display === 'none' || notificationMenu.style.display === '') {
            notificationMenu.style.setProperty('display', 'block', 'important');
            notificationMenu.style.setProperty('visibility', 'visible', 'important');
            notificationMenu.style.setProperty('opacity', '1', 'important');
            
            const badge = document.getElementById('notification-count');
            if(badge) {
                badge.innerText = '0';
                badge.style.display = 'none';
            }

            const token = localStorage.getItem('jwtToken');
            if (token) {
                try {
                    await fetch('http://localhost:5072/api/tasks/notifications/mark-as-read', {
                        method: 'PUT',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                } catch (err) {
                    console.error("Okundu olarak işaretlenemedi:", err);
                }
            }
        } else {
            notificationMenu.style.setProperty('display', 'none', 'important');
        }
    }
};

document.addEventListener('click', function(event) {
    const notifMenu = document.getElementById('notification-dropdown');
    const bellBtn = document.getElementById('notification-bell');
    
    if (notifMenu && notifMenu.style.display === 'block') {
        if (!notifMenu.contains(event.target) && (!bellBtn || !bellBtn.contains(event.target))) {
            notifMenu.style.display = 'none';
        }
    }
});

// --- TAKVİM (FULLCALENDAR) SİSTEMİ ---
function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'tr',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek'
        },
        events: [] 
    });
    calendar.render();
}

function updateCalendarEvents(tasks) {
    if (!calendar) return;

    calendar.getEvents().forEach(event => event.remove());

    tasks.forEach(task => {
        const dueDate = task.dueDate ?? task.DueDate;

        if (dueDate) {
            const status = task.status ?? task.Status;
            let color = '#f59e0b'; 
            if (status === 2) color = '#10b981'; 
            else if (status === 1) color = '#3b82f6'; 

            calendar.addEvent({
                title: task.title ?? task.Title,
                start: dueDate.split('T')[0],
                backgroundColor: color,
                borderColor: color
            });
        }
    });
}
// --- EXCEL'E AKTARMA (SHEETJS) SİSTEMİ ---
function exportCompletedTasksToExcel() {
    // 1. Sadece tamamlanmış (status === 2) görevleri filtrele
    const completedTasks = allTasks.filter(task => normalizeStatus(task.status ?? task.Status) === 2);

    // 2. Eğer tamamlanmış görev yoksa kullanıcıyı uyar ve işlemi iptal et
    if (completedTasks.length === 0) {
        if (typeof showToast === "function") {
            showToast("Dışa aktarılacak tamamlanmış görev bulunamadı.", "error");
        } else {
            alert("Dışa aktarılacak tamamlanmış görev bulunamadı.");
        }
        return;
    }

    // 3. Verileri Excel tablosu için temiz ve Türkçe bir formata (JSON) dönüştür
    const excelData = completedTasks.map(task => {
        return {
            "Görev Başlığı": task.title ?? task.Title,
            "Açıklama": task.description ?? task.Description ?? "Belirtilmemiş",
            "Öncelik Durumu": getPriorityInfo(normalizePriority(task.priority ?? task.Priority)).text,
            "Son Tarih": task.dueDate ?? task.DueDate ? (task.dueDate ?? task.DueDate).split('T')[0] : "Tarih Yok"
        };
    });

    // 4. Excel çalışma kitabı (Workbook) ve sayfası (Worksheet) oluştur
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tamamlanan Görevler");

    // 5. Dosyayı indir
    XLSX.writeFile(workbook, "Tamamlanan_Gorevler.xlsx");
    
    if (typeof showToast === "function") showToast("Excel dosyası başarıyla indirildi!", "success");
}

// Butona tıklama olayını dinleme (DOM yüklendiğinde çalışması için)
document.addEventListener('DOMContentLoaded', () => {
    const exportBtn = document.getElementById('export-excel-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportCompletedTasksToExcel);
    }
});