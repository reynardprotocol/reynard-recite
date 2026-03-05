const STORAGE_KEY = 'recitation_sandbox_data';

export function loadDataRaw() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error("解析本地数据失败", e);
        }
    }
    return { version: "1.0", classes: [] };
}

export function saveDataRaw(appData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}