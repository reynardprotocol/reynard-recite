import './style.css';
import { loadDataRaw, saveDataRaw, openDataFile, createNewDataFile, clearMemory, getCurrentFileName } from './data.js';
import { generateAvatarSVG, shootParticles, getStatusVisual, generateRandomAvatar, calculateOldAvatarProps } from './utils.js';

// ==========================================
// 自定义弹窗工具函数（替代被浏览器拦截的 prompt / confirm）
// 为什么要这样做？
// 浏览器出于安全策略，有时会静默阻止 window.prompt() / window.confirm()，
// 导致函数直接返回 null，按钮点了像没反应一样。
// 解决方案：用我们自己的 HTML 弹窗模拟这两个功能。
// 这两个函数都返回 Promise（承诺对象），需要配合 await 使用。
// 比喻：就像点菜后服务员会来告诉你结果，await 就是"等服务员回来"的动作。
// ==========================================

// [001] 自定义输入框（替代 prompt）
// 用法：const val = await customPrompt("请输入名称：", "默认值");
// 返回：用户输入的字符串，如果点取消则返回 null
function customPrompt(message, defaultValue = '') {
    return new Promise((resolve) => {
        const overlay = document.getElementById('customPromptOverlay');
        const msgEl = document.getElementById('customPromptMessage');
        const inputEl = document.getElementById('customPromptInput');
        const okBtn = document.getElementById('customPromptOk');
        const cancelBtn = document.getElementById('customPromptCancel');

        msgEl.textContent = message;
        inputEl.value = defaultValue;
        overlay.classList.remove('hidden');
        // 自动聚焦到输入框，方便用户直接输入
        setTimeout(() => inputEl.focus(), 50);

        // 清理函数：关闭弹窗并移除事件监听，防止重复绑定
        function cleanup(result) {
            overlay.classList.add('hidden');
            // removeEventListener 需要引用同一个函数对象，所以用具名函数
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            inputEl.removeEventListener('keydown', onKeydown);
            resolve(result);
        }

        function onOk() { cleanup(inputEl.value.trim() || null); }
        function onCancel() { cleanup(null); }
        // 按 Enter 触发确认，按 Escape 触发取消，提升键盘操作体验
        function onKeydown(e) {
            if (e.key === 'Enter') onOk();
            if (e.key === 'Escape') onCancel();
        }

        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        inputEl.addEventListener('keydown', onKeydown);
    });
}

// [002] 自定义确认框（替代 confirm）
// 用法：const confirmed = await customConfirm("确定要删除吗？");
// 返回：布尔值，true 表示用户点了确认，false 表示点了取消
function customConfirm(message) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('customConfirmOverlay');
        const msgEl = document.getElementById('customConfirmMessage');
        const okBtn = document.getElementById('customConfirmOk');
        const cancelBtn = document.getElementById('customConfirmCancel');

        msgEl.textContent = message;
        overlay.classList.remove('hidden');

        function cleanup(result) {
            overlay.classList.add('hidden');
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            resolve(result);
        }

        function onOk() { cleanup(true); }
        function onCancel() { cleanup(false); }

        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
    });
}

let appData = { version: "1.0", classes: [] };
let currentClassId = null;
let draggedStudentId = null;
let draggedGroupId = null;
let currentMatrixStudentId = null;
let currentTab = 'personal';

function loadData() { appData = loadDataRaw(); }
function saveData() { saveDataRaw(appData); }

// ==========================================
// [007] 插卡机生命周期 (Card Machine Lifecycle)
// ==========================================

// 更新顶部的卡带状态指示器
function updateCardIndicator() {
    const fileName = getCurrentFileName();
    const indicator = document.getElementById('activeFileIndicator');
    const badge = document.getElementById('fileNameBadge');
    const ejectBtn = document.getElementById('ejectCardBtn');

    if (!indicator) return;

    if (fileName) {
        badge.textContent = fileName;
        indicator.classList.remove('hidden');
        indicator.classList.add('flex');
        ejectBtn.classList.remove('hidden');
        ejectBtn.classList.add('flex');
    } else {
        indicator.classList.add('hidden');
        indicator.classList.remove('flex');
        ejectBtn.classList.add('hidden');
        ejectBtn.classList.remove('flex');
    }
}

// 插入旧卡带
window.startupWithExisting = async function () {
    const data = await openDataFile();
    if (data) {
        if (!data.classes) { alert('数据格式不正确，缺少班级信息。'); return; }
        // [热迁移] 首次加载老数据时，把以前"算出来的头像"固化成"存下来的属性"
        migrateOldAvatars(data);
        appData = data;
        updateCardIndicator();
        window.switchView('lobby');
    }
};

// 锻造新卡带
window.startupWithNew = async function () {
    const data = await createNewDataFile();
    if (data) {
        appData = data;
        updateCardIndicator();
        window.switchView('lobby');
    }
};

// [009] 旧头像热迁移器
// 遍历所有学生，如果身上没有 .avatar 固定属性，就用旧算法算出来并永久保存
function migrateOldAvatars(data) {
    let migrated = false;
    if (data && data.classes) {
        data.classes.forEach(cls => {
            if (cls.students) {
                cls.students.forEach(stu => {
                    if (!stu.avatar) {
                        stu.avatar = calculateOldAvatarProps(stu);
                        migrated = true;
                    }
                });
            }
        });
    }
    if (migrated) saveDataRaw(data);
}

// 拔出卡带（退回启动大厅）
window.ejectCard = async function () {
    const confirm = await customConfirm("确定要拔出卡带吗？\n你的所有修改已经安全地自动保存在本地文件中了。");
    if (!confirm) return;

    clearMemory();
    appData = { version: "1.0", classes: [] };
    updateCardIndicator();
    window.switchView('startup');
};

// 视图切换调度
window.switchView = function (viewName) {
    const viewStartup = document.getElementById('view-startup');
    const viewLobby = document.getElementById('view-lobby');
    const viewSandbox = document.getElementById('view-sandbox');

    // 先全部隐藏
    viewStartup.classList.add('hidden-view');
    viewLobby.classList.add('hidden-view');
    viewSandbox.classList.add('hidden-view');

    if (viewName === 'startup') {
        viewStartup.classList.remove('hidden-view');
    } else if (viewName === 'lobby') {
        viewLobby.classList.remove('hidden-view');
        currentClassId = null;
        renderLobby();
    } else if (viewName === 'sandbox') {
        viewSandbox.classList.remove('hidden-view');
    }
};

function renderLobby() {
    const container = document.getElementById('classListContainer');
    container.innerHTML = '';
    const addCard = document.createElement('div');
    addCard.className = 'card-hover border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer text-slate-500 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/50 min-h-[160px]';
    addCard.onclick = createClass;
    addCard.innerHTML = `<svg class="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg><span class="font-medium">新建班级</span>`;
    container.appendChild(addCard);

    appData.classes.forEach(cls => {
        const stuCount = cls.students ? cls.students.length : 0;
        const classCard = document.createElement('div');
        classCard.className = 'card-hover bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between relative group min-h-[160px] cursor-pointer';
        classCard.onclick = (e) => { if (e.target.closest('.action-btn')) return; enterClass(cls.id); };
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

async function createClass() {
    const name = await customPrompt("请输入新班级名称：", "新班级");
    if (name && name.trim() !== "") {
        appData.classes.push({
            id: 'c_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            name: name.trim(),
            groups: [],
            students: [],
            // [001] 深拷贝一套默认列分组给新班级。
            // 为什么用深拷贝（structuredClone）？
            // 就像复印一份合同，A班和B班各拿一份纸，
            // A班在自己那份上改内容，B班的那份完全不受影响。
            // 如果用浅拷贝（直接赋值或展开运算符 [...]），
            // 两个班级实际上拿着「指向同一份合同的钥匙」，
            // 一方修改，另一方也会看到变化——这就是「幽灵污染」。
            colGroups: structuredClone([{ id: 'cg_default', name: '默认进度', cols: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'] }]),
            groupTasks: {}
        });
        saveData();
        renderLobby();
    }
}
window.renameClass = async function (id) {
    const cls = appData.classes.find(c => c.id === id);
    if (!cls) return;
    const newName = await customPrompt("修改班级名称：", cls.name);
    if (newName && newName.trim() !== "" && newName !== cls.name) { cls.name = newName.trim(); saveData(); renderLobby(); }
};
window.deleteClass = async function (id) {
    const cls = appData.classes.find(c => c.id === id);
    if (!cls) return;
    if (await customConfirm(`⚠️ 警告：确定要删除【${cls.name}】吗？\n删除后该班级的所有学生和背诵数据将丢失且不可恢复！`)) { appData.classes = appData.classes.filter(c => c.id !== id); saveData(); renderLobby(); }
};
function enterClass(id) { currentClassId = id; const cls = appData.classes.find(c => c.id === id); if (cls) { window.switchView('sandbox'); renderSandbox(); } }

function renderSandbox() {
    const cls = appData.classes.find(c => c.id === currentClassId);
    if (!cls) return;
    document.getElementById('currentClassNameDisplay').innerText = cls.name;
    const waitingRoom = document.getElementById('waitingRoom');
    const groupsContainer = document.getElementById('groupsContainer');
    waitingRoom.innerHTML = ''; groupsContainer.innerHTML = '';

    cls.groups.forEach(group => {
        const groupEl = document.createElement('div');
        groupEl.className = 'wood-desk p-8 rounded-xl flex flex-col items-center min-w-[260px] transition-transform relative';
        // 使整张桌子能接收拖放事件
        groupEl.ondragover = window.handleGroupDragOver;
        groupEl.ondrop = (e) => window.handleGroupDrop(e, group.id);

        // 标题行：拖放手柄 + 组名 + 齿轮按钮
        const titleEl = document.createElement('div');
        titleEl.className = 'flex items-center justify-between w-full mb-5 border-b-2 border-[#8b5a2b]/30 pb-2 z-10';

        // 拖放手柄 ❘❘
        const handleEl = document.createElement('div');
        handleEl.className = 'cursor-move text-[#a87240] hover:text-[#5a3a22] flex items-center justify-center p-1 mr-2 opacity-50 hover:opacity-100 transition-opacity';
        handleEl.innerHTML = '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/></svg>';
        handleEl.draggable = true;
        handleEl.ondragstart = (e) => window.handleGroupDragStart(e, group.id);
        handleEl.ondragend = window.handleGroupDragEnd;

        // 组名文字
        const nameEl = document.createElement('h4');
        nameEl.className = 'text-base font-bold text-[#5a3a22] flex-1 text-center';
        nameEl.innerText = group.name;

        // 齿轮设置按钮
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'text-[#a87240] hover:text-[#5a3a22] p-1 ml-2 transition-colors';
        settingsBtn.title = '设置';
        settingsBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>';
        settingsBtn.onclick = () => window.openGroupSettingsModal(group.id);

        titleEl.appendChild(handleEl);
        titleEl.appendChild(nameEl);
        titleEl.appendChild(settingsBtn);
        groupEl.appendChild(titleEl);

        const seatsContainer = document.createElement('div');
        seatsContainer.className = 'flex flex-wrap gap-5 justify-center max-w-[400px] z-10 relative';

        for (let i = 0; i < group.seatCount; i++) {
            const seatEl = document.createElement('div');
            seatEl.className = 'w-[4.5rem] h-[4.5rem] rounded-lg flex items-center justify-center border-2 border-dashed border-[#a87240] bg-[#fcf6f0] relative transition-colors hover:bg-[#f1dfce] shadow-inner';
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
        waitingRoom.innerHTML = '<div class="text-base text-slate-400 w-full text-center mt-4">暂无学生，请点击右上角导入名单</div>';
    } else {
        unassignedStudents.forEach((stu) => { waitingRoom.appendChild(createStudentAvatar(stu)); });
    }

    // 待机室自动折叠逻辑：当没有未分组学生时自动收起
    const body = document.getElementById('waitingRoomBody');
    const chevron = document.getElementById('waitingRoomChevron');
    if (unassignedStudents.length === 0) {
        body.style.maxHeight = '0';
        chevron.style.transform = 'rotate(-90deg)';
        waitingRoomExpanded = false;
    } else if (!waitingRoomExpanded && unassignedStudents.length > 0) {
        // 如果有新学生被退回待机室，自动展开
        body.style.maxHeight = '280px';
        chevron.style.transform = 'rotate(0deg)';
        waitingRoomExpanded = true;
    }
}

// [015] 待机室折叠/展开逻辑
let waitingRoomExpanded = true;
window.toggleWaitingRoom = function () {
    const body = document.getElementById('waitingRoomBody');
    const chevron = document.getElementById('waitingRoomChevron');
    waitingRoomExpanded = !waitingRoomExpanded;
    if (waitingRoomExpanded) {
        body.style.maxHeight = '280px';
        chevron.style.transform = 'rotate(0deg)';
    } else {
        body.style.maxHeight = '0';
        chevron.style.transform = 'rotate(-90deg)';
    }
};

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

    let crownHtml = stu.isLeader ? `<svg class="w-6 h-6 text-amber-500 absolute -top-5 left-1/2 transform -translate-x-1/2 drop-shadow-md z-30" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 9.707l2.147-2.146a1 1 0 011.53.111l1.5 2.25 1.5-2.25a1 1 0 011.53-.111l2.147 2.146a1 1 0 01.196 1.15l-2.071 5.178A2 2 0 0111.938 18H8.062a2 2 0 01-1.854-1.265L4.137 11.5a1 1 0 01.156-1.15z"></path></svg>` : '';
    const avatarImg = document.createElement('div');
    avatarImg.className = `w-14 h-14 rounded-full overflow-hidden bg-white shadow-sm group-hover:border-indigo-400 group-hover:shadow-md transition-all relative ${borderClass}`;
    avatarImg.innerHTML = typeof generateAvatarSVG === 'function' ? generateAvatarSVG(stu) : `<div class="w-full h-full flex items-center justify-center text-sm">${stu.name}</div>`;

    const nameLabel = document.createElement('span');
    nameLabel.className = `text-sm font-medium px-2 py-0.5 rounded-full transition-colors max-w-[5rem] truncate text-center ${stu.isLeader ? 'bg-amber-100 text-amber-700' : 'bg-[#fcf6f0] border border-[#dca06b]/50 text-[#8b5a2b] group-hover:bg-indigo-50 group-hover:text-indigo-700'}`;
    nameLabel.innerText = stu.name;

    avatarContainer.innerHTML = crownHtml;
    avatarContainer.appendChild(avatarImg);
    avatarContainer.appendChild(nameLabel);
    return avatarContainer;
}

function handleDragStart(e, studentId) { draggedStudentId = studentId; e.dataTransfer.effectAllowed = 'move'; setTimeout(() => e.target.classList.add('opacity-40'), 0); }
function handleDragEnd(e) { e.target.classList.remove('opacity-40'); draggedStudentId = null; }
window.handleDragOver = function (e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

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

window.handleDropOnWaitingRoom = function (e) {
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

window.createGroup = async function () {
    const cls = appData.classes.find(c => c.id === currentClassId);
    if (!cls) return;
    const groupName = await customPrompt("请输入小组名称（如：第一组）：", `第${cls.groups.length + 1}组`);
    if (!groupName) return;
    const seatCountStr = await customPrompt("请输入该小组的座位数量：", "6");
    if (!seatCountStr) return;
    const seatCount = parseInt(seatCountStr);
    if (isNaN(seatCount) || seatCount <= 0) { alert("请输入有效的座位数量！"); return; }
    cls.groups.push({ id: 'g_' + Date.now().toString(36), name: groupName, seatCount: seatCount });
    saveData(); renderSandbox();
};

// ==========================================
// 分组高级设置：重命名、改座位数、安全删除、拖放排序
// ==========================================

// [011] 打开分组设置弹窗
window.openGroupSettingsModal = function (groupId) {
    const cls = appData.classes.find(c => c.id === currentClassId);
    const group = cls.groups.find(g => g.id === groupId);
    if (!group) return;
    document.getElementById('gsGroupId').value = group.id;
    document.getElementById('gsGroupName').value = group.name;
    document.getElementById('gsSeatCount').value = group.seatCount;
    document.getElementById('modalOverlay').classList.remove('hidden-view');
    document.getElementById('groupSettingsModal').classList.remove('hidden-view');
};

// 关闭分组设置弹窗
window.closeGroupSettingsModal = function () {
    document.getElementById('modalOverlay').classList.add('hidden-view');
    document.getElementById('groupSettingsModal').classList.add('hidden-view');
};

// [012] 保存分组设置
window.saveGroupSettings = function () {
    const groupId = document.getElementById('gsGroupId').value;
    const name = document.getElementById('gsGroupName').value.trim();
    const seatCount = parseInt(document.getElementById('gsSeatCount').value);
    if (!name) { alert("分组名称不能为空！"); return; }
    if (isNaN(seatCount) || seatCount < 1) { alert("座位数必须至少为1！"); return; }
    const cls = appData.classes.find(c => c.id === currentClassId);
    if (!cls) return;
    const group = cls.groups.find(g => g.id === groupId);
    if (group) {
        group.name = name;
        group.seatCount = seatCount;
        // 如果座位数变少，超界的学生退回待机室
        cls.students.forEach(stu => {
            if (stu.groupId === group.id && stu.seatIndex >= seatCount) {
                stu.groupId = null;
                stu.seatIndex = null;
            }
        });
        saveData(); renderSandbox();
        window.closeGroupSettingsModal();
    }
};

// [013] 安全删除分组：学生退回待机室
window.deleteGroup = async function () {
    const groupId = document.getElementById('gsGroupId').value;
    const cls = appData.classes.find(c => c.id === currentClassId);
    if (!cls) return;
    const group = cls.groups.find(g => g.id === groupId);
    if (!group) return;
    if (await customConfirm(`确定要将【${group.name}】拆除吗？\n拆除后该组所有学生都会完好无损地退回【待机室】。`)) {
        cls.students.forEach(stu => {
            if (stu.groupId === group.id) { stu.groupId = null; stu.seatIndex = null; }
        });
        cls.groups = cls.groups.filter(g => g.id !== group.id);
        saveData(); renderSandbox();
        window.closeGroupSettingsModal();
    }
};

// [014] 分组拖放排序
window.handleGroupDragStart = function (e, groupId) {
    draggedGroupId = groupId;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
        const desk = e.target.closest('.wood-desk');
        if (desk) desk.classList.add('opacity-40');
    }, 0);
};
window.handleGroupDragEnd = function (e) {
    const desk = e.target.closest('.wood-desk');
    if (desk) desk.classList.remove('opacity-40');
    draggedGroupId = null;
};
window.handleGroupDragOver = function (e) {
    if (draggedGroupId) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
};
window.handleGroupDrop = function (e, targetGroupId) {
    if (!draggedGroupId) return;
    e.preventDefault();
    e.stopPropagation();
    if (draggedGroupId === targetGroupId) return;
    const cls = appData.classes.find(c => c.id === currentClassId);
    if (!cls) return;
    const fromIndex = cls.groups.findIndex(g => g.id === draggedGroupId);
    const toIndex = cls.groups.findIndex(g => g.id === targetGroupId);
    if (fromIndex > -1 && toIndex > -1) {
        const [movedGroup] = cls.groups.splice(fromIndex, 1);
        cls.groups.splice(toIndex, 0, movedGroup);
        saveData(); renderSandbox();
    }
};

window.handleTxtImport = function (event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const names = e.target.result.split(/\r?\n/).map(n => n.trim()).filter(n => n.length > 0);
        if (names.length === 0) return alert('未检测到有效名单，请检查 TXT 文件是否为空。');
        const cls = appData.classes.find(c => c.id === currentClassId);
        if (!cls) return;
        let nextIndex = cls.students.length > 0 ? Math.max(...cls.students.map(s => s.importIndex || 0)) + 1 : 0;
        names.forEach((name, index) => {
            cls.students.push({
                id: 's_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                name: name,
                groupId: null,
                isLeader: false,
                importIndex: nextIndex + index,
                records: {},
                avatar: generateRandomAvatar() // 新导入学生自动穿上莫兰迪色系
            });
        });
        saveData(); renderSandbox();
    };
    reader.readAsText(file);
    event.target.value = '';
};

window.toggleAddStudentMenu = function () { document.getElementById('addStudentMenu').classList.toggle('hidden-view'); };
document.addEventListener('click', function (event) {
    const container = document.getElementById('addStudentDropdownContainer');
    const menu = document.getElementById('addStudentMenu');
    if (container && menu && !container.contains(event.target)) menu.classList.add('hidden-view');
});

window.addSingleStudent = async function () {
    window.toggleAddStudentMenu();
    const name = await customPrompt("请输入插班生/新学生的姓名：");
    if (!name || name.trim() === '') return;
    const cls = appData.classes.find(c => c.id === currentClassId);
    if (!cls) return;
    let nextIndex = cls.students.length > 0 ? Math.max(...cls.students.map(s => s.importIndex || 0)) + 1 : 0;
    cls.students.push({
        id: 's_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        name: name.trim(),
        groupId: null,
        isLeader: false,
        importIndex: nextIndex,
        records: {},
        avatar: generateRandomAvatar() // 插班生自动穿上莫兰迪色系
    });
    saveData(); renderSandbox();
};

window.deleteCurrentStudent = async function () {
    if (!currentMatrixStudentId) return;
    const cls = appData.classes.find(c => c.id === currentClassId);
    const stu = cls.students.find(s => s.id === currentMatrixStudentId);
    if (!stu) return;
    if (await customConfirm(`⚠️ 危险警告：确定要将学生【${stu.name}】彻底开除吗？\n该操作将永久删除他的所有打卡分数、专属任务以及座位安排！`)) {
        cls.students = cls.students.filter(s => s.id !== currentMatrixStudentId);
        saveData(); window.closeModal();
    }
};

// ==========================================
// 打卡矩阵与设置逻辑 (升级版：深度解耦任务与分组)
// ==========================================

// [002] 底层中转站 1：获取「班级专属」列分组
// 修复前：所有班级共用 appData.colGroups（全局一份），是幽灵污染的核心病灶。
// 修复后：数据存在 cls.colGroups（每个班级各自持有一份），互不干扰。
// 函数现在需要接收 cls（当前班级对象）作为参数来定位正确的数据存储位置。
function getColGroups(cls) {
    if (!cls.colGroups) {
        // 数据迁移逻辑（一次性）：处理旧版本存储在全局的数据
        if (appData.colGroups && appData.colGroups.length > 0) {
            // structuredClone：相当于「复印全套文件」，生成一份与原件毫无关联的独立副本
            cls.colGroups = structuredClone(appData.colGroups);
        } else if (appData.globalCols && appData.globalCols.length > 0) {
            cls.colGroups = [{ id: 'cg_default', name: '默认进度', cols: structuredClone(appData.globalCols) }];
        } else {
            // 全新班级：直接初始化一套默认列分组
            cls.colGroups = [{ id: 'cg_default', name: '默认进度', cols: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'] }];
        }
        saveData();
    }
    return cls.colGroups;
}

// [003] 底层中转站 2：获取特定班级下、特定分组的统一任务
function getClassTasks(cls, groupId) {
    if (!cls.groupTasks) {
        cls.groupTasks = {};
        if (cls.tasks && cls.tasks.length > 0) {
            // 修复：原来用 [...cls.tasks] 是浅拷贝，像「配了一把钥匙」，
            // 两边同指一个数组。改用 structuredClone 确保任务数组完全独立。
            cls.groupTasks['cg_default'] = structuredClone(cls.tasks);
        } else {
            cls.groupTasks['cg_default'] = ['Module 1 单词', 'Module 1 课文', 'Module 2 单词', 'Module 2 课文'];
        }
        delete cls.tasks;
        saveData();
    }
    if (!cls.groupTasks[groupId]) cls.groupTasks[groupId] = [];
    return cls.groupTasks[groupId];
}

// 底层中转站 3：获取特定学生、特定分组的专属任务
function getStudentCustomTasks(stu, groupId) {
    if (!stu.groupCustomTasks) {
        stu.groupCustomTasks = {};
        if (stu.customTasks && stu.customTasks.length > 0) {
            stu.groupCustomTasks['cg_default'] = [...stu.customTasks];
        }
        delete stu.customTasks;
        saveData();
    }
    if (!stu.groupCustomTasks[groupId]) stu.groupCustomTasks[groupId] = [];
    return stu.groupCustomTasks[groupId];
}

window.openSettings = function () {
    renderSettingsModal();
    document.getElementById('modalOverlay').classList.remove('hidden-view');
    document.getElementById('settingsModal').classList.remove('hidden-view');
};

window.closeSettings = function () {
    document.getElementById('modalOverlay').classList.add('hidden-view');
    document.getElementById('settingsModal').classList.add('hidden-view');
    renderSandbox();
};

// [004] 渲染打卡设置界面
function renderSettingsModal() {
    const cls = appData.classes.find(c => c.id === currentClassId);
    const colsContainer = document.getElementById('settingsColsList');
    colsContainer.innerHTML = '';

    // 修复：传入 cls，读取该班级自己的 colGroups，而非全局数据
    getColGroups(cls).forEach(group => {
        const tasks = getClassTasks(cls, group.id);

        let groupHtml = `<div class="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-2 shadow-sm">
            <div class="flex justify-between items-center mb-4 pb-3 border-b border-slate-200">
                <span class="font-bold text-lg text-indigo-700">${group.name}</span>
                <button onclick="deleteColGroup('${group.id}')" class="text-xs text-red-400 hover:text-red-600 font-medium">删除整组</button>
            </div>
            
            <div class="mb-5">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm font-bold text-slate-600">横向进度列标 <span class="font-normal text-slate-400">(系统全局)</span></span>
                    <button onclick="addColToGroup('${group.id}')" class="text-xs text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-100/50 px-2 py-1 rounded">+ 添加列</button>
                </div>
                <div class="flex flex-wrap gap-2">`;
        group.cols.forEach(col => {
            groupHtml += `<div class="flex items-center bg-white rounded-md px-2 py-1 border border-slate-200 shadow-sm"><span class="text-sm font-medium text-slate-700 mr-2">${col}</span><button onclick="deleteGlobalCol('${group.id}', '${col}')" class="text-slate-400 hover:text-red-500 transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button></div>`;
        });
        if (group.cols.length === 0) groupHtml += `<span class="text-xs text-slate-400">暂无列标</span>`;
        groupHtml += `</div></div>

            <div>
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm font-bold text-slate-600">纵向学习任务 <span class="font-normal text-slate-400">(本班独立)</span></span>
                    <button onclick="addClassTask('${group.id}')" class="text-xs text-emerald-600 hover:text-emerald-800 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-100">+ 添任务</button>
                </div>
                <div class="space-y-2">`;
        tasks.forEach(task => {
            groupHtml += `<div class="flex items-center justify-between bg-white border border-slate-200 rounded-md p-2.5 hover:border-emerald-200 transition-colors"><span class="text-sm font-medium text-slate-700">${task}</span><button onclick="deleteClassTask('${group.id}', '${task}')" class="text-xs text-red-500 hover:text-red-700 font-medium">删除</button></div>`;
        });
        if (tasks.length === 0) groupHtml += `<span class="text-xs text-slate-400">暂无任务</span>`;
        groupHtml += `</div></div></div>`;
        colsContainer.innerHTML += groupHtml;
    });
}

window.addColGroup = async function () {
    const groupName = await customPrompt("请输入新分组名称 (如：U单元、期末复习)：");
    if (!groupName || groupName.trim() === '') return;
    const cls = appData.classes.find(c => c.id === currentClassId);
    // 修复：操作当前班级自己的 colGroups
    getColGroups(cls).push({ id: 'cg_' + Date.now().toString(36), name: groupName.trim(), cols: [] });
    saveData(); renderSettingsModal();
};

window.addColToGroup = async function (groupId) {
    const newCol = await customPrompt("请输入新的列标名称 (如：U1)：");
    if (!newCol || newCol.trim() === '') return;
    const cls = appData.classes.find(c => c.id === currentClassId);
    // 修复：在当前班级自己的 colGroups 里查找分组
    const group = getColGroups(cls).find(g => g.id === groupId);
    if (group.cols.includes(newCol.trim())) { alert("该组内列标已存在！"); return; }
    group.cols.push(newCol.trim());
    saveData(); renderSettingsModal();
};

// 增加任务时，必须指明要加到哪个分组里
window.addClassTask = async function (groupId) {
    const newTask = await customPrompt("请输入新的班级统一任务名称：");
    if (!newTask || newTask.trim() === '') return;
    const cls = appData.classes.find(c => c.id === currentClassId);
    const tasks = getClassTasks(cls, groupId);
    if (tasks.includes(newTask.trim())) { alert("任务在该分组内已存在！"); return; }
    tasks.push(newTask.trim());
    saveData(); renderSettingsModal();
};

window.deleteColGroup = async function (groupId) {
    const cls = appData.classes.find(c => c.id === currentClassId);
    const group = getColGroups(cls).find(g => g.id === groupId);
    if (await customConfirm(`确定删除大分组【${group.name}】及其内部所有列标和任务吗？`)) {
        // 修复：只删除当前班级的分组，不影响其他班级
        cls.colGroups = cls.colGroups.filter(g => g.id !== groupId);
        saveData(); renderSettingsModal();
    }
};

window.deleteGlobalCol = async function (groupId, colName) {
    // 修复：「删除列标」现在只影响当前班级，已改为「班级内删除」
    if (await customConfirm(`确定删除列标【${colName}】吗？（仅影响本班级）`)) {
        const cls = appData.classes.find(c => c.id === currentClassId);
        const group = getColGroups(cls).find(g => g.id === groupId);
        group.cols = group.cols.filter(c => c !== colName);
        saveData(); renderSettingsModal();
    }
};

window.deleteClassTask = async function (groupId, taskName) {
    if (await customConfirm(`确定删除任务【${taskName}】吗？`)) {
        const cls = appData.classes.find(c => c.id === currentClassId);
        cls.groupTasks[groupId] = cls.groupTasks[groupId].filter(t => t !== taskName);
        saveData(); renderSettingsModal();
    }
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
    document.getElementById('matrixStudentName').innerText = stu.name;
    document.getElementById('matrixAvatar').innerHTML = typeof generateAvatarSVG === 'function' ? generateAvatarSVG(stu) : '';
    renderMatrixTable(cls, stu);
    document.getElementById('modalOverlay').classList.remove('hidden-view');
    document.getElementById('matrixModal').classList.remove('hidden-view');
}

// [010] 换肤函数：点击头像后随机更换造型
window.changeStudentAvatar = async function () {
    if (!currentMatrixStudentId) return;
    const cls = appData.classes.find(c => c.id === currentClassId);
    if (!cls) return;
    const stu = cls.students.find(s => s.id === currentMatrixStudentId);
    if (!stu) return;

    if (await customConfirm(`确定要为学生【${stu.name}】随机生成一套新颜色的头像吗？`)) {
        stu.avatar = generateRandomAvatar();
        saveData();
        document.getElementById('matrixAvatar').innerHTML = generateAvatarSVG(stu);
        renderSandbox();
    }
};

// 渲染多张彻底隔离、支持独立滑动与首列冻结的打卡表格
// 渲染多张彻底隔离、支持独立滑动与首列冻结的打卡表格 (极致优化版)
function renderMatrixTable(cls, stu) {
    const container = document.getElementById('matrixTableContainer');
    container.innerHTML = '';

    // 修复：渲染矩阵表格时，读取该班级自己的 colGroups
    getColGroups(cls).forEach(group => {
        if (group.cols.length === 0) return;

        const groupTasks = getClassTasks(cls, group.id);
        const customTasks = getStudentCustomTasks(stu, group.id);
        const allTasks = [...groupTasks, ...customTasks];

        // 表头构建：将“+专属”优雅地融入组名旁边，并锁定 160px 宽度
        let thead = `<thead><tr class="bg-slate-100 border-b border-slate-200">
            <th class="p-3 font-bold text-indigo-700 whitespace-nowrap sticky left-0 z-20 bg-slate-100 shadow-[1px_0_0_0_#e2e8f0] w-[160px] min-w-[160px] max-w-[160px] rounded-tl-lg flex items-center justify-between">
                <span class="truncate">${group.name}</span>
                <button onclick="addCustomTask('${group.id}')" title="添加该组的专属任务" class="text-indigo-500 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-200 p-1 rounded transition ml-1 shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                </button>
            </th>`;

        group.cols.forEach(col => {
            thead += `<th class="p-3 text-center font-semibold text-slate-600 min-w-[4rem] whitespace-nowrap">${col}</th>`;
        });
        thead += `</tr></thead>`;

        // 表体构建
        let tbody = `<tbody>`;
        allTasks.forEach((task, rowIndex) => {
            if (!stu.records[task]) stu.records[task] = {};
            const isCustom = rowIndex >= groupTasks.length;

            // 首列：固定宽度，任务名称 + (专属标签) + (悬浮显示的删除按钮)
            tbody += `<tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                <td class="p-3 font-medium text-slate-700 sticky left-0 z-10 bg-white group-hover:bg-slate-50 shadow-[1px_0_0_0_#f1f5f9] w-[160px] min-w-[160px] max-w-[160px] transition-colors">
                    <div class="flex items-center justify-between w-full h-full">
                        <div class="flex items-center gap-1.5 overflow-hidden">
                            <span class="truncate text-sm" title="${task}">${task}</span>
                            ${isCustom ? '<span class="text-[9px] bg-indigo-100 text-indigo-600 px-1 py-0.5 rounded shrink-0 font-bold leading-none mt-0.5">专属</span>' : ''}
                        </div>
                        ${isCustom ? `<button onclick="deleteCustomTask('${group.id}', '${task}')" class="text-slate-300 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100 shrink-0" title="删除专属任务"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>` : ''}
                    </div>
                </td>`;

            // 星星打卡列
            group.cols.forEach(col => {
                const val = stu.records[task][col] || 0;
                tbody += `<td class="p-2 text-center whitespace-nowrap">
                    <button onclick="toggleRecord(event, '${task}', '${col}')" class="w-10 h-10 rounded-lg hover:bg-slate-200/50 flex items-center justify-center transition-colors mx-auto focus:outline-none">
                        ${getStatusVisual(val)}
                    </button>
                </td>`;
            });
            tbody += `</tr>`;
        });

        if (allTasks.length === 0) {
            tbody += `<tr><td colspan="${group.cols.length + 1}" class="p-8 text-center text-sm text-slate-400 bg-white">暂无任务记录</td></tr>`;
        }
        tbody += `</tbody>`;

        // 渲染表格容器
        container.innerHTML += `
            <div class="mb-8 bg-white shadow-[0_2px_4px_-1px_rgba(0,0,0,0.05)] rounded-xl border border-slate-200 overflow-hidden relative">
                <div class="overflow-x-auto custom-scrollbar">
                    <table class="w-full text-sm text-left border-collapse min-w-max">${thead}${tbody}</table>
                </div>
            </div>`;
    });

    if (container.innerHTML === '') container.innerHTML = `<div class="p-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">暂无进度，请先在右上角“打卡设置”中添加列分组</div>`;

    let currentScore = 0;
    Object.values(stu.records).forEach(row => { Object.values(row).forEach(val => { currentScore += parseFloat(val) || 0; }); });
    document.getElementById('matrixTotalScore').innerText = `${currentScore} 分`;
}

window.toggleRecord = function (event, task, col) {
    const cls = appData.classes.find(c => c.id === currentClassId);
    const stu = cls.students.find(s => s.id === currentMatrixStudentId);
    let val = stu.records[task][col] || 0;
    if (val === 0) val = 0.5; else if (val === 0.5) val = 1; else if (val === 1) val = 2; else val = 0;
    stu.records[task][col] = val;
    if (val === 2 && event) shootParticles(event.clientX, event.clientY);
    renderMatrixTable(cls, stu);
};

// 专属任务也实现了深度隔离
window.addCustomTask = async function (groupId) {
    const taskName = await customPrompt("请输入该组的专属附加任务名称：");
    if (!taskName || taskName.trim() === '') return;
    const cls = appData.classes.find(c => c.id === currentClassId);
    const stu = cls.students.find(s => s.id === currentMatrixStudentId);
    const customTasks = getStudentCustomTasks(stu, groupId);
    const groupTasks = getClassTasks(cls, groupId);

    if (!customTasks.includes(taskName.trim()) && !groupTasks.includes(taskName.trim())) {
        customTasks.push(taskName.trim()); saveData(); renderMatrixTable(cls, stu);
    } else { alert("该任务在当前分组中已存在！"); }
};

window.deleteCustomTask = async function (groupId, taskName) {
    if (!(await customConfirm(`确定删除专属任务【${taskName}】及其所有打卡记录吗？`))) return;
    const cls = appData.classes.find(c => c.id === currentClassId);
    const stu = cls.students.find(s => s.id === currentMatrixStudentId);
    stu.groupCustomTasks[groupId] = stu.groupCustomTasks[groupId].filter(t => t !== taskName);
    delete stu.records[taskName]; saveData(); renderMatrixTable(cls, stu);
};

window.closeModal = function () {
    document.getElementById('modalOverlay').classList.add('hidden-view');
    document.getElementById('matrixModal').classList.add('hidden-view');
    document.getElementById('leaderboardModal').classList.add('hidden-view');
    currentMatrixStudentId = null;
    calculateScores(); renderSandbox();
};

window.showLeaderboard = function () {
    calculateScores();
    document.getElementById('modalOverlay').classList.remove('hidden-view');
    document.getElementById('leaderboardModal').classList.remove('hidden-view');
    window.switchTab(currentTab);
};

window.switchTab = function (tab) {
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
        const rankBadge = index < 3 ? `<div class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-amber-100 text-amber-600' : index === 1 ? 'bg-slate-200 text-slate-600' : 'bg-orange-100 text-orange-700'}">${index + 1}</div>` : `<div class="w-6 h-6 text-center text-slate-400 font-medium text-sm">${index + 1}</div>`;
        html += `<div class="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"><div class="flex items-center gap-4">${rankBadge}<div class="w-10 h-10 rounded-full border border-slate-200 overflow-hidden shrink-0">${typeof generateAvatarSVG === 'function' ? generateAvatarSVG(stu) : ''}</div><div><h4 class="font-bold text-slate-700 flex items-center gap-2">${stu.name} ${stu.isLeader ? '<svg class="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 9.707l2.147-2.146a1 1 0 011.53.111l1.5 2.25 1.5-2.25a1 1 0 011.53-.111l2.147 2.146a1 1 0 01.196 1.15l-2.071 5.178A2 2 0 0111.938 18H8.062a2 2 0 01-1.854-1.265L4.137 11.5a1 1 0 01.156-1.15z"></path></svg>' : ''}</h4><span class="text-xs text-slate-500">${stu.groupId ? cls.groups.find(g => g.id === stu.groupId)?.name : '未分组'}</span></div></div><div class="text-lg font-bold text-indigo-600">${stu.totalScore || 0} <span class="text-xs font-normal text-slate-400">分</span></div></div>`;
    });
    if (sortedStudents.length === 0) html += `<div class="p-8 text-center text-slate-400">暂无数据</div>`;
    html += `</div>`;
    document.getElementById('leaderboardContent').innerHTML = html;
}

function renderGroupLeaderboard() {
    const cls = appData.classes.find(c => c.id === currentClassId);
    const sortedGroups = [...cls.groups].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    let html = `<div class="divide-y divide-slate-100 p-4 space-y-3">`;
    sortedGroups.forEach((group, index) => {
        html += `<div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between"><div class="flex items-center gap-4"><div class="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">${index + 1}</div><div><h4 class="font-bold text-slate-800">${group.name}</h4><p class="text-xs text-slate-500">共 ${group.seatCount} 个座位</p></div></div><div class="text-2xl font-black text-amber-500">${group.totalScore || 0} <span class="text-sm font-normal text-slate-400">总分</span></div></div>`;
    });
    if (sortedGroups.length === 0) html += `<div class="p-8 text-center text-slate-400">暂无小组数据，请先添加小组</div>`;
    html += `</div>`;
    document.getElementById('leaderboardContent').innerHTML = html;
}

// ==========================================
// [005] 跨班级任务模板同步功能
// 解决了之前「幽灵污染」版本无法实现的需求。
// 核心安全手段：structuredClone 深拷贝，确保 A 班 B 班数据完全独立，
// 就像"复印了一份崭新的菜单"，改了 B 班的菜单，A 班的不受影响。
// ==========================================

// 展示班级选择器弹窗
window.showClassSyncPicker = function () {
    const listEl = document.getElementById('classSyncList');
    listEl.innerHTML = '';

    // 过滤掉当前班级，只显示其他班级作为同步来源
    const otherClasses = appData.classes.filter(c => c.id !== currentClassId);

    if (otherClasses.length === 0) {
        // 没有其他班级时，给出友好提示
        listEl.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-slate-400">
                <svg class="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
                <p class="text-sm font-medium">暂无其他班级</p>
                <p class="text-xs mt-1">请先在大厅创建其他班级</p>
            </div>`;
    } else {
        otherClasses.forEach(cls => {
            // 统计该班级有多少个分组和任务，方便用户决策
            const colGroupCount = (cls.colGroups || []).length;
            const taskCount = Object.values(cls.groupTasks || {}).reduce((sum, arr) => sum + arr.length, 0);

            const card = document.createElement('button');
            card.className = 'w-full text-left p-4 border border-slate-200 rounded-xl hover:border-teal-400 hover:bg-teal-50/50 transition-all group';
            card.onclick = () => syncFromClass(cls.id);
            card.innerHTML = `
                <div class="flex items-center justify-between">
                    <div>
                        <p class="font-bold text-slate-800 group-hover:text-teal-700">${cls.name}</p>
                        <p class="text-xs text-slate-400 mt-1">${colGroupCount} 个分组 · ${taskCount} 项任务</p>
                    </div>
                    <svg class="w-5 h-5 text-slate-300 group-hover:text-teal-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </div>`;
            listEl.appendChild(card);
        });
    }

    document.getElementById('classSyncModal').classList.remove('hidden');
};

// 关闭班级选择器弹窗
window.closeClassSyncModal = function () {
    document.getElementById('classSyncModal').classList.add('hidden');
};

// 从指定班级同步分组与任务配置（深拷贝，零污染）
async function syncFromClass(sourceClassId) {
    const sourceClass = appData.classes.find(c => c.id === sourceClassId);
    const currentClass = appData.classes.find(c => c.id === currentClassId);
    if (!sourceClass || !currentClass) return;

    // 关闭选择弹窗，再弹确认框（避免两个弹窗叠加）
    window.closeClassSyncModal();

    const confirmed = await customConfirm(
        `确定要将【${sourceClass.name}】的分组与任务配置同步到当前班级吗？\n当前班级的分组和任务将被覆盖，学生打卡记录不受影响。`
    );
    if (!confirmed) return;

    // [006] 核心：用 structuredClone 深拷贝，确保数据完全独立
    // structuredClone 相当于"复印了一份崭新的文件"，
    // 两份文件从此互不影响，修改一份不会影响另一份。
    currentClass.colGroups = structuredClone(getColGroups(sourceClass));
    currentClass.groupTasks = structuredClone(sourceClass.groupTasks || {});

    saveData();
    renderSettingsModal(); // 刷新设置面板，让用户立刻看到同步结果
}

window.onload = () => {
    // 强制清理内存，进入插卡机启动页
    clearMemory();
    updateCardIndicator();
    window.switchView('startup');
};