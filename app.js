// --- 1. DOM (HTML) Elemanlarını Seçme ---
const taskForm = document.getElementById('task-form');
const taskTitleInput = document.getElementById('task-title');
const taskDescInput = document.getElementById('task-desc');
const taskPriorityInput = document.getElementById('task-priority');
const taskListContainer = document.getElementById('task-list');
const submitBtn = document.getElementById('submit-btn');

let isEditing = false;
let currentEditId = null;
let currentEditStatus = 0;

// --- 2. Sayfa Yüklendiğinde Görevleri Çek (GET) ---
document.addEventListener('DOMContentLoaded', loadTasks);

async function loadTasks() {
    taskListContainer.innerHTML = '<p class="loading-text">Görevler yükleniyor...</p>';
    const tasks = await getTasksFromAPI();

    if (tasks.length === 0) {
        taskListContainer.innerHTML = '<p class="loading-text">Henüz hiç görev yok. Yeni bir tane ekleyin!</p>';
        return;
    }

    taskListContainer.innerHTML = ''; 

    tasks.forEach(task => {
        const taskId = parseInt(task.id ?? task.Id);
        const taskTitle = task.title ?? task.Title ?? "Başlıksız";
        const taskDesc = task.description ?? task.Description ?? "";
        
        // Yeni kurşungeçirmez fonksiyonlarımızı çağırıyoruz
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

// --- 3. Form Gönderimi (Ekleme ve Düzenleme Ortak Yeri) ---
taskForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 
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
            alert("Görev eklenirken bir hata oluştu.");
        }
    }

    submitBtn.disabled = false;
});

// --- 4. Görev Düzenleme Modunu Başlatma ---
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

// --- 5. Görev Tamamlama (PUT) ---
async function completeTask(id, title, description, priority) {
    const updateData = { 
        id: id, 
        title: title, 
        description: description, 
        status: 2, 
        priority: priority 
    };
    const success = await updateTaskInAPI(id, updateData);
    if (success) await loadTasks();
}

// --- 6. Görev Silme (DELETE) ---
async function removeTask(id) {
    if (confirm("Bu görevi kalıcı olarak silmek istediğinize emin misiniz?")) {
        const success = await deleteTaskFromAPI(id);
        if (success) await loadTasks();
    }
}

// --- Yardımcı Araçlar: GELİŞMİŞ VERİ TEMİZLEME ---
function normalizeStatus(val) {
    if (val === null || val === undefined) return 0;
    
    // C#'tan gelen değeri kesin olarak metne çevirip tüm harflerini küçültüyoruz
    const s = String(val).toLowerCase().trim();
    
    // C# 'Completed' veya 'Done' gönderebilir, hepsini yakalıyoruz
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