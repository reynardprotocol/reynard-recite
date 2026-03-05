import './style.css';
import { loadDataRaw, saveDataRaw } from './data.js';
import { generateAvatarSVG, shootParticles, getStatusVisual } from './utils.js';
// ==========================================
// 数据模型与状态管理 (Model)
// ==========================================
let appData = { version: "1.0", classes: [] };
let currentClassId = null;
let draggedStudentId = null;
let currentMatrixStudentId = null;
let currentTab = 'personal';

// 本地持久化封装
function loadData() {
    appData = loadDataRaw();
    renderLobby();
}

function saveData() {
    saveDataRaw(appData);
}

// 导出与导入
window.exportData = function() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `备份_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`);
    dlAnchorElem.click();
    dlAnchorElem.remove();
};

window.importData = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (importedData && importedData.classes) {
                appData = importedData;
                saveData();
                renderLobby();
                alert('数据导入成功！');
            } else { alert('数据格式不正确，缺少班级信息。'); }
        } catch (err) { alert('读取文件失败，请确保是合法的 JSON 文件。'); }
    };
    reader.readAsText(file);
    event.target.value = ''; 
};

// ==========================================
// 视图路由与大厅渲染
// ==========================================
window.switchView = function(viewName) {
    const viewLobby = document.getElementById('view-lobby');
    const viewSandbox = document.getElementById('view-sandbox');
    if (viewName === 'lobby') {
        viewLobby.classList.remove('hidden-view');
        viewSandbox.classList.add('hidden-view');
        currentClassId = null;
        renderLobby();
    } else if (viewName === 'sandbox') {
        viewLobby.classList.add('hidden-view');
        viewSandbox.classList.remove('hidden-view');
    }
};

function renderLobby() {
    const container = document.getElementById('classListContainer');
    container.innerHTML = '';

    const addCard = document.createElement('div');
    addCard.className = 'card-hover border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer text-slate-500 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/50 min-h-[160px]';
    addCard.onclick = createClass;
    addCard.innerHTML = `
        <svg class="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
        <span class="font-medium">新建班级</span>`;
    container.appendChild(addCard);

    appData.classes.forEach(cls => {
        const stuCount = cls.students ? cls.students.length : 0;
        const classCard = document.createElement('div');
        classCard.className = 'card-hover bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between relative group min-h-[160px] cursor-pointer';
        classCard.onclick = (e) => {
            if(e.target.closest('.action-btn')) return;
            enterClass(cls.id);
        };
        classCard.innerHTML = `
            <div>
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-xl font-bold text-slate-800 line-clamp-1" title="${cls.name}">${cls.name}</h3>
                    <div class="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 action-btn">
                        <button onclick="renameClass('${cls.id}')" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="重命名"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                        <button onclick="deleteClass('${cls.id}')" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="删除"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                    </div>
                </div>
                <p class="text-sm text-slate-500 flex items-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>${stuCount} 名学生</p>
            </div>
            <div class="mt-4 pt-4 border-t border-slate-100 text-sm text-indigo-600 font-medium group-hover:text-indigo-700 flex items-center gap-1">进入教室<svg class="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg></div>`;
        container.appendChild(classCard);
    });
}

function createClass() {
    const name = prompt("请输入新班级名称：", "新班级");
    if (name && name.trim() !== "") {
        appData.classes.push({ id: 'c_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5), name: name.trim(), tasks: [], groups: [], students: [] });
        saveData(); renderLobby();
    }
}

window.renameClass = function(id) {
    const cls = appData.classes.find(c => c.id === id);
    if (!cls) return;
    const newName = prompt("修改班级名称：", cls.name);
    if (newName && newName.trim() !== "" && newName !== cls.name) {
        cls.name = newName.trim(); saveData(); renderLobby();
    }
};

window.deleteClass = function(id) {
    const cls = appData.classes.find(c => c.id === id);
    if (!cls) return;
    if (confirm(`⚠️ 警告：确定要删除【${cls.name}】吗？\n删除后该班级的所有学生和背诵数据将丢失且不可恢复！`)) {
        appData.classes = appData.classes.filter(c => c.id !== id);
        saveData(); renderLobby();
    }
};

function enterClass(id) {
    currentClassId = id;
    const cls = appData.classes.find(c => c.id === id);
    if (cls) { window.switchView('sandbox'); renderSandbox(); }
}

// ==========================================
// 沙盘与等候室逻辑
// ==========================================
function renderSandbox() {
    const cls = appData.classes.find(c => c.id === currentClassId);
    if (!cls) return;

    document.getElementById('currentClassNameDisplay').innerText = cls.name;
    const waitingRoom = document.getElementById('waitingRoom');
    const groupsContainer = document.getElementById('groupsContainer');
    
    waitingRoom.innerHTML = ''; groupsContainer.innerHTML = '';

    cls.groups.forEach(group => {
        const groupEl = document.createElement('div');
        groupEl.className = 'wood-desk p-6 rounded-xl flex flex-col items-center min-w-[200px] transition-transform';
        const titleEl = document.createElement('h4');
        titleEl.className = 'text-sm font-bold text-[#5a3a22] mb-4 border-b-2 border-[#8b5a2b]/30 pb-1 z-10';
        titleEl.innerText = group.name;
        groupEl.appendChild(titleEl);

        const seatsContainer = document.createElement('div');
        seatsContainer.className = 'flex flex-wrap gap-4 justify-center max-w-[300px] z-10 relative';

        for (let i = 0; i < group.seatCount; i++) {
            const seatEl = document.createElement('div');
            seatEl.className = 'w-14 h-14 rounded-lg flex items-center justify-center border-2 border-dashed border-[#a87240] bg-[#fcf6f0] relative transition-colors hover:bg-[#f1dfce] shadow-inner';
            seatEl.ondragover = window.handleDragOver;
            seatEl.ondrop = (e) => handleDropOnSeat(e, group.id, i);

            const seatedStudent = cls.students.find(s => s.groupId === group.id && s.seatIndex === i);
            if (seatedStudent) seatEl.appendChild(createStudentAvatar(seatedStudent));
            seatsContainer.appendChild(seatEl);
        }
        groupEl.appendChild(seatsContainer);
        groupsContainer.appendChild(groupEl);
    });

    const unassignedStudents = cls.students.filter(s => !s.groupId);
    document.getElementById('waitingCount').innerText = `${unassignedStudents.length} 人`;
    if (unassignedStudents.length === 0 && cls.students.length === 0) {
        waitingRoom.innerHTML = '<div class="text-sm text-slate-400 w-full text-center mt-4">暂无学生，请点击右上角导入名单</div>';
    } else {
        unassignedStudents.forEach((stu) => { waitingRoom.appendChild(createStudentAvatar(stu)); });
    }
}

function createStudentAvatar(stu) {
    let score = 0;
    if (stu.records) { Object.values(stu.records).forEach(row => { Object.values(row).forEach(val => { score += parseFloat(val) || 0; }); }); }
    let borderClass = 'border-2 border-slate-200';
    if (score >= 15) borderClass = 'avatar-gold';
    else if (score >= 5) borderClass = 'avatar-silver';

    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'flex flex-col items-center gap-1 group cursor-grab relative z-20';
    avatarContainer.title = stu.name + " (双击切换组长身份)";
    avatarContainer.draggable = true;
    avatarContainer.ondragstart = (e) => handleDragStart(e, stu.id);
    avatarContainer.ondragend = handleDragEnd;

    let clickTimer = null;
    avatarContainer.onclick = (e) => {
        if (draggedStudentId) return; 
        if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; } 
        else { clickTimer = setTimeout(() => { openMatrix(stu.id); clickTimer = null; }, 250); }
    };
    avatarContainer.ondblclick = (e) => {
        if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
        toggleLeader(stu.id);
    };

    let crownHtml = stu.isLeader ? `<svg class="w-5 h-5 text-amber-500 absolute -top-4 left-1/2 transform -translate-x-1/2 drop-shadow-md z-30" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 9.707l2.147-2.146a1 1 0 011.53.111l1.5 2.25 1.5-2.25a1 1 0 011.53-.111l2.147 2.146a1 1 0 01.196 1.15l-2.071 5.178A2 2 0 0111.938 18H8.062a2 2 0 01-1.854-1.265L4.137 11.5a1 1 0 01.156-1.15z"></path></svg>` : '';
    const avatarImg = document.createElement('div');
    avatarImg.className = `w-12 h-12 rounded-full overflow-hidden bg-white shadow-sm group-hover:border-indigo-400 group-hover:shadow-md transition-all relative ${borderClass}`;
    avatarImg.innerHTML = typeof generateAvatarSVG === 'function' ? generateAvatarSVG(stu) : `<div class="w-full h-full flex items-center justify-center text-xs">${stu.name}</div>`;

    const nameLabel = document.createElement('span');
    nameLabel.className = `text-xs font-medium px-2 py-0.5 rounded-full transition-colors max-w-[4rem] truncate text-center ${stu.isLeader ? 'bg-amber-100 text-amber-700' : 'bg-[#fcf6f0] border border-[#dca06b]/50 text-[#8b5a2b] group-hover:bg-indigo-50 group-hover:text-indigo-700'}`;
    nameLabel.innerText = stu.name;

    avatarContainer.innerHTML = crownHtml;
    avatarContainer.appendChild(avatarImg);
    avatarContainer.appendChild(nameLabel);
    return avatarContainer;
}

// 拖拽控制
function handleDragStart(e, studentId) { draggedStudentId = studentId; e.dataTransfer.effectAllowed = 'move'; setTimeout(() => e.target.classList.add('opacity-40'), 0); }
function handleDragEnd(e) { e.target.classList.remove('opacity-40'); draggedStudentId = null; }
window.handleDragOver = function(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

function handleDropOnSeat(e, groupId, seatIndex) {
    e.preventDefault();
    if (!draggedStudentId) return;
    const cls = appData.classes.find(c => c.id === currentClassId);
    if (!cls) return;
    const occupied = cls.students.find(s => s.groupId === groupId && s.seatIndex === seatIndex);
    if (occupied && occupied.id !== draggedStudentId) { alert('该座位已经被占据，请先腾出空位！'); return; }
    const student = cls.students.find(s => s.id === draggedStudentId);
    if (student) { student.groupId = groupId; student.seatIndex = seatIndex; saveData(); renderSandbox(); }
}

window.handleDropOnWaitingRoom = function(e) {
    e.preventDefault();
    if (!draggedStudentId) return;
    const cls = appData.classes.find(c => c.id === currentClassId);
    const student = cls.students.find(s => s.id === draggedStudentId);
    if (student && student.groupId !== null) { student.groupId = null; student.seatIndex = null; saveData(); renderSandbox(); }
};

function toggleLeader(studentId) {
    const cls = appData.classes.find(c => c.id === currentClassId);
    const student = cls.students.find(s => s.id === studentId);
    if (student) { student.isLeader = !student.isLeader; saveData(); renderSandbox(); }
}

window.createGroup = function() {
    const cls = appData.classes.find(c => c.id === currentClassId);
    if (!cls) return;
    const groupName = prompt("请输入小组名称（如：第一组）：", `第${cls.groups.length + 1}组`);
    if (!groupName) return;
    const seatCount = parseInt(prompt("请输入该小组的座位数量：", "6"));
    if (isNaN(seatCount) || seatCount <= 0) return alert("请输入有效的座位数量！");
    cls.groups.push({ id: 'g_' + Date.now().toString(36), name: groupName, seatCount: seatCount });
    saveData(); renderSandbox();
};

window.handleTxtImport = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const names = e.target.result.split(/\r?\n/).map(n => n.trim()).filter(n => n.length > 0);
        if (names.length === 0) return alert('未检测到有效名单，请检查 TXT 文件是否为空。');
        const cls = appData.classes.find(c => c.id === currentClassId);
        if (!cls) return;
        names.forEach((name, index) => {
            cls.students.push({ id: 's_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5), name: name, groupId: null, isLeader: false, importIndex: index, records: {} });
        });
        saveData(); renderSandbox();
    };
    reader.readAsText(file);
    event.target.value = ''; 
};

window.toggleAddStudentMenu = function() { document.getElementById('addStudentMenu').classList.toggle('hidden-view'); };
document.addEventListener('click', function(event) {
    const container = document.getElementById('addStudentDropdownContainer');
    const menu = document.getElementById('addStudentMenu');
    if (container && menu && !container.contains(event.target)) menu.classList.add('hidden-view');
});

window.addSingleStudent = function() {
    window.toggleAddStudentMenu();
    const name = prompt("请输入插班生/新学生的姓名：");
    if (!name || name.trim() === '') return;
    const cls = appData.classes.find(c => c.id === currentClassId);
    if (!cls) return;
    cls.students.push({ id: 's_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5), name: name.trim(), groupId: null, isLeader: false, importIndex: cls.students.length, records: {} });
    saveData(); renderSandbox();
};

window.deleteCurrentStudent = function() {
    if (!currentMatrixStudentId) return;
    const cls = appData.classes.find(c => c.id === currentClassId);
    const stu = cls.students.find(s => s.id === currentMatrixStudentId);
    if (!stu) return;
    if (confirm(`⚠️ 危险警告：确定要将学生【${stu.name}】彻底开除吗？\n该操作将永久删除他的所有打卡分数、专属任务以及座位安排！`)) {
        cls.students = cls.students.filter(s => s.id !== currentMatrixStudentId);
        saveData(); window.closeModal(); 
    }
};

// ==========================================
// 打卡矩阵与设置逻辑
// ==========================================
function getGlobalCols() {
    if (!appData.globalCols || appData.globalCols.length === 0) { appData.globalCols = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6']; saveData(); }
    return appData.globalCols;
}

window.openSettings = function() {
    const cls = appData.classes.find(c => c.id === currentClassId);
    if (!cls.tasks || cls.tasks.length === 0) cls.tasks = ['Module 1 单词', 'Module 1 课文', 'Module 2 单词', 'Module 2 课文'];
    renderSettingsModal();
    document.getElementById('modalOverlay').classList.remove('hidden-view');
    document.getElementById('settingsModal').classList.remove('hidden-view');
};

window.closeSettings = function() {
    document.getElementById('modalOverlay').classList.add('hidden-view');
    document.getElementById('settingsModal').classList.add('hidden-view');
    renderSandbox();
};

function renderSettingsModal() {
    const cls = appData.classes.find(c => c.id === currentClassId);
    const colsContainer = document.getElementById('settingsColsList');
    const tasksContainer = document.getElementById('settingsTasksList');
    colsContainer.innerHTML = '';
    getGlobalCols().forEach(col => { colsContainer.innerHTML += `<div class="flex items-center bg-slate-100 rounded-lg px-3 py-1.5 border border-slate-200"><span class="text-sm font-medium text-slate-700 mr-2">${col}</span><button onclick="deleteGlobalCol('${col}')" class="text-slate-400 hover:text-red-500 transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button></div>`; });
    tasksContainer.innerHTML = '';
    cls.tasks.forEach(task => { tasksContainer.innerHTML += `<div class="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-3 hover:border-indigo-200 transition-colors"><span class="text-sm font-medium text-slate-700">${task}</span><button onclick="deleteClassTask('${task}')" class="text-sm text-red-500 hover:text-red-700 font-medium">删除</button></div>`; });
}

window.addGlobalCol = function() {
    const newCol = prompt("请输入新的列标名称 (如：Week1, M7)：");
    if (!newCol || newCol.trim() === '') return;
    if (getGlobalCols().includes(newCol.trim())) return alert("列标已存在！");
    appData.globalCols.push(newCol.trim()); saveData(); renderSettingsModal();
};

window.addClassTask = function() {
    const newTask = prompt("请输入新的班级统一任务名称：");
    const cls = appData.classes.find(c => c.id === currentClassId);
    if (!newTask || newTask.trim() === '') return;
    if (cls.tasks.includes(newTask.trim())) return alert("任务已存在！");
    cls.tasks.push(newTask.trim()); saveData(); renderSettingsModal();
};

function checkColHasData(colName) {
    for (let cls of appData.classes) for (let stu of cls.students) if (stu.records) for (let task in stu.records) if (stu.records[task][colName] > 0) return true;
    return false;
}
function checkTaskHasData(taskName) {
    const cls = appData.classes.find(c => c.id === currentClassId);
    for (let stu of cls.students) if (stu.records && stu.records[taskName]) for (let col in stu.records[taskName]) if (stu.records[taskName][col] > 0) return true;
    return false;
}

window.deleteGlobalCol = function(colName) {
    if (checkColHasData(colName)) return alert(`⚠️ 保护拦截：在【${colName}】列下已有学生产生打卡进度！\n请先清空相关学生的星星记录，然后再尝试删除此列。`);
    if (confirm(`确定删除列标【${colName}】吗？所有班级将同步移除该列。`)) { appData.globalCols = appData.globalCols.filter(c => c !== colName); saveData(); renderSettingsModal(); }
};

window.deleteClassTask = function(taskName) {
    if (checkTaskHasData(taskName)) return alert(`⚠️ 保护拦截：任务【${taskName}】下已有学生产生打卡进度！\n请先清空相关学生的星星记录，然后再尝试删除此任务。`);
    if (confirm(`确定删除任务【${taskName}】吗？`)) { const cls = appData.classes.find(c => c.id === currentClassId); cls.tasks = cls.tasks.filter(t => t !== taskName); saveData(); renderSettingsModal(); }
};

function calculateScores() {
    const cls = appData.classes.find(c => c.id === currentClassId);
    if (!cls) return;
    cls.groups.forEach(g => g.totalScore = 0);
    cls.students.forEach(stu => {
        let score = 0;
        if (stu.records) Object.values(stu.records).forEach(row => { Object.values(row).forEach(val => { score += parseFloat(val) || 0; }); });
        stu.totalScore = score;
        if (stu.groupId) { const group = cls.groups.find(g => g.id === stu.groupId); if (group) group.totalScore += score; }
    });
    saveData();
}

function openMatrix(studentId) {
    currentMatrixStudentId = studentId;
    const cls = appData.classes.find(c => c.id === currentClassId);
    const stu = cls.students.find(s => s.id === studentId);
    if (!stu.records) stu.records = {};
    if (!cls.tasks || cls.tasks.length === 0) cls.tasks = ['Module 1 单词', 'Module 1 课文', 'Module 2 单词', 'Module 2 课文'];
    document.getElementById('matrixStudentName').innerText = stu.name;
    document.getElementById('matrixAvatar').innerHTML = typeof generateAvatarSVG === 'function' ? generateAvatarSVG(stu) : '';
    renderMatrixTable(cls, stu);
    document.getElementById('modalOverlay').classList.remove('hidden-view');
    document.getElementById('matrixModal').classList.remove('hidden-view');
}

function renderMatrixTable(cls, stu) {
    const table = document.getElementById('matrixTable');
    let thead = `<thead><tr class="bg-slate-100 border-b border-slate-200"><th class="p-3 font-semibold w-1/4 rounded-tl-lg">学习任务</th>`;
    getGlobalCols().forEach(col => { thead += `<th class="p-3 text-center font-semibold text-slate-600">${col}</th>`; });
    thead += `<th class="p-3 w-10 rounded-tr-lg"></th></tr></thead>`;
    let tbody = `<tbody>`;
    const allTasks = [...cls.tasks];
    if (stu.customTasks) allTasks.push(...stu.customTasks);
    allTasks.forEach((task, rowIndex) => {
        if (!stu.records[task]) stu.records[task] = {};
        const isCustom = rowIndex >= cls.tasks.length;
        tbody += `<tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors"><td class="p-3 font-medium text-slate-700 flex items-center justify-between"><span>${task} ${isCustom ? '<span class="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded ml-2">专属</span>' : ''}</span></td>`;
        getGlobalCols().forEach(col => {
            const val = stu.records[task][col] || 0;
            tbody += `<td class="p-2 text-center"><button onclick="toggleRecord(event, '${task}', '${col}')" class="w-10 h-10 rounded-lg hover:bg-slate-200/50 flex items-center justify-center transition-colors mx-auto focus:outline-none">${getStatusVisual(val)}</button></td>`;
        });
        tbody += `<td class="p-3 text-center">${isCustom ? `<button onclick="deleteCustomTask('${task}')" class="text-slate-300 hover:text-red-500 transition-colors" title="删除专属任务"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>` : ''}</td></tr>`;
    });
    tbody += `</tbody>`;
    table.innerHTML = thead + tbody;
    let currentScore = 0;
    Object.values(stu.records).forEach(row => { Object.values(row).forEach(val => { currentScore += parseFloat(val) || 0; }); });
    document.getElementById('matrixTotalScore').innerText = `${currentScore} 分`;
}

window.toggleRecord = function(event, task, col) {
    const cls = appData.classes.find(c => c.id === currentClassId);
    const stu = cls.students.find(s => s.id === currentMatrixStudentId);
    let val = stu.records[task][col] || 0;
    if (val === 0) val = 0.5; else if (val === 0.5) val = 1; else if (val === 1) val = 2; else val = 0;
    stu.records[task][col] = val;
    if (val === 2 && event) shootParticles(event.clientX, event.clientY);
    renderMatrixTable(cls, stu);
};

window.addCustomTask = function() {
    const taskName = prompt("请输入学生的专属附加任务名称：");
    if (!taskName || taskName.trim() === '') return;
    const cls = appData.classes.find(c => c.id === currentClassId);
    const stu = cls.students.find(s => s.id === currentMatrixStudentId);
    if (!stu.customTasks) stu.customTasks = [];
    if (!stu.customTasks.includes(taskName.trim()) && !cls.tasks.includes(taskName.trim())) { stu.customTasks.push(taskName.trim()); renderMatrixTable(cls, stu); }
};

window.deleteCustomTask = function(taskName) {
    if(!confirm(`确定删除专属任务【${taskName}】及其所有打卡记录吗？`)) return;
    const cls = appData.classes.find(c => c.id === currentClassId);
    const stu = cls.students.find(s => s.id === currentMatrixStudentId);
    stu.customTasks = stu.customTasks.filter(t => t !== taskName);
    delete stu.records[taskName]; renderMatrixTable(cls, stu);
};

window.closeModal = function() {
    document.getElementById('modalOverlay').classList.add('hidden-view');
    document.getElementById('matrixModal').classList.add('hidden-view');
    document.getElementById('leaderboardModal').classList.add('hidden-view');
    currentMatrixStudentId = null;
    calculateScores(); renderSandbox();
};

window.showLeaderboard = function() {
    calculateScores();
    document.getElementById('modalOverlay').classList.remove('hidden-view');
    document.getElementById('leaderboardModal').classList.remove('hidden-view');
    window.switchTab(currentTab);
};

window.switchTab = function(tab) {
    currentTab = tab;
    const tabPersonal = document.getElementById('tab-personal');
    const tabGroup = document.getElementById('tab-group');
    if (tab === 'personal') {
        tabPersonal.className = "flex-1 py-3 text-sm font-bold text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30 transition-all";
        tabGroup.className = "flex-1 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-all";
        renderPersonalLeaderboard();
    } else {
        tabGroup.className = "flex-1 py-3 text-sm font-bold text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30 transition-all";
        tabPersonal.className = "flex-1 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-all";
        renderGroupLeaderboard();
    }
};

function renderPersonalLeaderboard() {
    const cls = appData.classes.find(c => c.id === currentClassId);
    const sortedStudents = [...cls.students].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    let html = `<div class="divide-y divide-slate-100">`;
    sortedStudents.forEach((stu, index) => {
        const rankBadge = index < 3 ? `<div class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm ${index===0?'bg-amber-100 text-amber-600':index===1?'bg-slate-200 text-slate-600':'bg-orange-100 text-orange-700'}">${index+1}</div>` : `<div class="w-6 h-6 text-center text-slate-400 font-medium text-sm">${index+1}</div>`;
        html += `<div class="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"><div class="flex items-center gap-4">${rankBadge}<div class="w-10 h-10 rounded-full border border-slate-200 overflow-hidden shrink-0">${typeof generateAvatarSVG === 'function' ? generateAvatarSVG(stu) : ''}</div><div><h4 class="font-bold text-slate-700 flex items-center gap-2">${stu.name} ${stu.isLeader ? '<svg class="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 9.707l2.147-2.146a1 1 0 011.53.111l1.5 2.25 1.5-2.25a1 1 0 011.53-.111l2.147 2.146a1 1 0 01.196 1.15l-2.071 5.178A2 2 0 0111.938 18H8.062a2 2 0 01-1.854-1.265L4.137 11.5a1 1 0 01.156-1.15z"></path></svg>' : ''}</h4><span class="text-xs text-slate-500">${stu.groupId ? cls.groups.find(g=>g.id===stu.groupId)?.name : '未分组'}</span></div></div><div class="text-lg font-bold text-indigo-600">${stu.totalScore || 0} <span class="text-xs font-normal text-slate-400">分</span></div></div>`;
    });
    if(sortedStudents.length === 0) html += `<div class="p-8 text-center text-slate-400">暂无数据</div>`;
    html += `</div>`;
    document.getElementById('leaderboardContent').innerHTML = html;
}

function renderGroupLeaderboard() {
    const cls = appData.classes.find(c => c.id === currentClassId);
    const sortedGroups = [...cls.groups].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    let html = `<div class="divide-y divide-slate-100 p-4 space-y-3">`;
    sortedGroups.forEach((group, index) => {
        html += `<div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between"><div class="flex items-center gap-4"><div class="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">${index+1}</div><div><h4 class="font-bold text-slate-800">${group.name}</h4><p class="text-xs text-slate-500">共 ${group.seatCount} 个座位</p></div></div><div class="text-2xl font-black text-amber-500">${group.totalScore || 0} <span class="text-sm font-normal text-slate-400">总分</span></div></div>`;
    });
    if(sortedGroups.length === 0) html += `<div class="p-8 text-center text-slate-400">暂无小组数据，请先添加小组</div>`;
    html += `</div>`;
    document.getElementById('leaderboardContent').innerHTML = html;
}

// 初始化挂载
window.onload = loadData;