// ==========================================
// 数据持久化层 (Data Persistence Layer) - Local First 架构
// ==========================================
// 【插卡机模式】
// 1. data.json 是数据本体（卡带）。
// 2. 必须先通过 openDataFile 或 createNewDataFile 挂载文件句柄 (FileHandle)。
// 3. 挂载后，所有的 saveDataRaw 都会静默自动存入这个 JSON 文件。
// 4. localStorage 仅作为运行时的内存缓冲，页面刷新即清空。
// ==========================================

const STORAGE_KEY = 'recitation_sandbox_data';

// 全局文件句柄，用于实现静默自动保存 (Auto-save)
export let activeFileHandle = null;

// ==========================================
// [001] 初始化与内存缓冲
// ==========================================

// 初始化彻底清空本地缓存，强制用户进入“插卡”流程
export function clearMemory() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('current_file_name');
    activeFileHandle = null;
}

// 从内存读取（必须是在挂载卡带之后）
export function loadDataRaw() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error("解析内存数据失败", e);
        }
    }
    // 这个默认返回值其实用不到，因为插卡机模式下必然会有数据
    return { version: "1.0", classes: [] };
}

// 保存数据：同时写入内存与物理文件（静默存盘）
export async function saveDataRaw(appData) {
    // 1. 立即更新内存缓冲
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));

    // 2. 如果已装载卡带，静默将修改写入物理 .json 文件
    // 不需要弹任何提示！这就是 File System Access API 最强大的威力。
    if (activeFileHandle) {
        try {
            const writable = await activeFileHandle.createWritable();
            await writable.write(JSON.stringify(appData, null, 2));
            await writable.close();
            // console.log('💾 已静默自动保存至本地文件');
        } catch (e) {
            console.error('自动保存失败！可能是浏览器回收了权限', e);
            // 权限丢失时不阻断程序，至少内存里还有最新数据
        }
    }
}

// ==========================================
// [002] 插入卡带 (读取已有 JSON)
// ==========================================
export async function openDataFile() {
    if (!window.showOpenFilePicker) {
        alert('❌ 浏览器不支持此功能，请使用最新 Chrome 或 Edge。');
        return null;
    }

    try {
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{ description: '背诵沙盘卡带', accept: { 'application/json': ['.json'] } }],
            multiple: false
        });

        const file = await fileHandle.getFile();
        const text = await file.text();
        const data = JSON.parse(text);

        // 挂载成功！
        activeFileHandle = fileHandle;
        localStorage.setItem('current_file_name', file.name);

        // 立即同步到内存
        saveDataRaw(data);
        return data;
    } catch (e) {
        if (e.name !== 'AbortError') { alert('读取卡带失败，文件可能已损坏。'); }
        return null;
    }
}

// ==========================================
// [003] 锻造新卡卡带 (新建空 JSON)
// ==========================================
export async function createNewDataFile() {
    if (!window.showSaveFilePicker) {
        alert('❌ 浏览器不支持此功能，请使用最新 Chrome 或 Edge。');
        return null;
    }

    try {
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: `新建背诵沙盘_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`,
            types: [{ description: '背诵沙盘卡带', accept: { 'application/json': ['.json'] } }]
        });

        // 挂载成功！
        activeFileHandle = fileHandle;
        localStorage.setItem('current_file_name', fileHandle.name);

        // 初始化一份空白数据
        const initialData = { version: "1.0", classes: [] };

        // 调用 saveDataRaw 会同时写入内存并生成物理文件！
        await saveDataRaw(initialData);

        return initialData;
    } catch (e) {
        if (e.name !== 'AbortError') { alert('创建新卡带失败。'); }
        return null;
    }
}

// ==========================================
// 辅助函数
// ==========================================
export function getCurrentFileName() {
    return localStorage.getItem('current_file_name') || null;
}