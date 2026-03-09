// ==========================================
// 程序化 SVG 捏脸引擎 (Avatar Generator) - 莫兰迪色系升级版
// ==========================================

// [001] 莫兰迪色系调色板：低饱和度、高级感
// 比喻：以前的颜色像小孩的蜡笔（鲜艳刺眼），
// 现在换成大画家的水粉颜料（雾霾蓝、灰绿、奶茶色等），看起来更有品位。
const MorandiSkinColors = ['#E8D5C4', '#F0DDD1', '#DECCBA', '#F2E0D0', '#E6CFBE', '#D4BFA8', '#F5E6D8'];
const MorandiShirtColors = ['#A8B5B2', '#B8A9C2', '#C4B7A6', '#9EB3B0', '#B5C4C1', '#C2AFA0', '#8EA7A4', '#BCA9B5', '#A3B5A6', '#C0ADA0', '#9CAAA1', '#B0A090'];

// [002] 旧版调色板（只在迁移旧数据时使用，保证老头像长相不变）
const OldSkinColors = ['#FFDFC4', '#F0D5BE', '#EECEB3', '#E1B899', '#C58C66', '#8D5524', '#FCD7B8'];
const OldShirtColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FDCB6E', '#6C5CE7', '#A8E6CF', '#DCEDC1', '#FFD3B6', '#FFAAA5', '#FF8B94', '#D4A5A5'];

export const AvatarConfig = {
    eyeTypes: ['normal', 'happy', 'calm'],
    mouthTypes: ['smile', 'neutral', 'open']
};

// [003] 哈希函数：把学生姓名变成一个稳定的数字指纹
// 同一个名字每次算出的哈希值完全一致，所以同一个学生的头像不会每次刷新都变脸
export function generateAvatarHash(name, index) {
    const seedStr = `${name}_${name ? name.length : 0}_${index}`;
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
        hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
        hash |= 0; // 将浮点数截断为32位整数（位运算中的自动截断特性）
    }
    return Math.abs(hash);
}

// [004] 渲染眼睛的 SVG 路径
export function renderEyes(type) {
    const color = "#333333";
    switch (type) {
        case 'happy': return `<path d="M 38 40 Q 42 36 46 40 M 54 40 Q 58 36 62 40" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
        case 'calm': return `<line x1="40" y1="40" x2="45" y2="40" stroke="${color}" stroke-width="2" stroke-linecap="round"/><line x1="55" y1="40" x2="60" y2="40" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;
        case 'normal':
        default: return `<circle cx="42" cy="40" r="2.5" fill="${color}"/><circle cx="58" cy="40" r="2.5" fill="${color}"/>`;
    }
}

// [005] 渲染嘴巴的 SVG 路径
export function renderMouth(type) {
    const color = "#333333";
    switch (type) {
        case 'open': return `<ellipse cx="50" cy="52" rx="4" ry="5" fill="#e67e22"/>`;
        case 'neutral': return `<line x1="46" y1="52" x2="54" y2="52" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;
        case 'smile':
        default: return `<path d="M 45 50 Q 50 56 55 50" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    }
}

// [006] 核心渲染函数：根据 student 对象生成完整的 SVG 头像
// 升级后支持两种模式：
//   模式A：如果 student.avatar 存在，直接使用固定属性渲染（新版 / 已迁移的数据）
//   模式B：如果 student.avatar 不存在，用旧算法实时计算（兼容未迁移的残留数据）
export function generateAvatarSVG(student) {
    let skinColor, shirtColor, eyeType, mouthType;

    if (student.avatar) {
        // 模式A：从固定属性中直接读取
        skinColor = student.avatar.skinColor;
        shirtColor = student.avatar.shirtColor;
        eyeType = student.avatar.eyeType;
        mouthType = student.avatar.mouthType;
    } else {
        // 模式B：兼容旧数据 - 使用旧调色板 + 哈希算法实时计算
        const props = calculateOldAvatarProps(student);
        skinColor = props.skinColor;
        shirtColor = props.shirtColor;
        eyeType = props.eyeType;
        mouthType = props.mouthType;
    }

    return `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-sm">
            <rect x="20" y="65" width="60" height="40" rx="15" fill="${shirtColor}" />
            <circle cx="50" cy="40" r="24" fill="${skinColor}" />
            ${renderEyes(eyeType)}
            ${renderMouth(mouthType)}
        </svg>
    `;
}

// [007] 随机生成一套全新的莫兰迪色系头像属性
// 用途：新学生入学 / 用户点击换肤时调用
export function generateRandomAvatar() {
    return {
        skinColor: MorandiSkinColors[Math.floor(Math.random() * MorandiSkinColors.length)],
        shirtColor: MorandiShirtColors[Math.floor(Math.random() * MorandiShirtColors.length)],
        eyeType: AvatarConfig.eyeTypes[Math.floor(Math.random() * AvatarConfig.eyeTypes.length)],
        mouthType: AvatarConfig.mouthTypes[Math.floor(Math.random() * AvatarConfig.mouthTypes.length)]
    };
}

// [008] 用旧算法计算老数据的头像属性（保证老学生不变脸）
// 原理：用原来那套高饱和颜色 + 哈希算法，算出和以前完全一样的结果
export function calculateOldAvatarProps(student) {
    const hash = generateAvatarHash(student.name, student.importIndex || 0);
    return {
        skinColor: OldSkinColors[hash % OldSkinColors.length],
        shirtColor: OldShirtColors[(hash >> 2) % OldShirtColors.length],
        eyeType: AvatarConfig.eyeTypes[(hash >> 4) % AvatarConfig.eyeTypes.length],
        mouthType: AvatarConfig.mouthTypes[(hash >> 5) % AvatarConfig.mouthTypes.length]
    };
}

// ==========================================
// 粒子特效与 SVG 常量
// ==========================================
export function shootParticles(x, y) {
    const colors = ['#FBBF24', '#F87171', '#34D399', '#60A5FA', '#A78BFA'];
    for (let i = 0; i < 25; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        const size = Math.random() * 6 + 4;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 80 + 30;
        particle.style.setProperty('--tx', Math.cos(angle) * distance + 'px');
        particle.style.setProperty('--ty', Math.sin(angle) * distance + 'px');
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 800);
    }
}

export const FULL_STAR_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' fill='%23FBBF24'/%3E%3C/svg%3E`;
export const HALF_STAR_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cdefs%3E%3CclipPath id='half'%3E%3Crect x='0' y='0' width='12' height='24'/%3E%3C/clipPath%3E%3C/defs%3E%3Cpath d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' fill='%23E2E8F0'/%3E%3Cpath d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' fill='%23FBBF24' clip-path='url(%23half)'/%3E%3C/svg%3E`;
export const EMPTY_STAR_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' fill='%23E2E8F0'/%3E%3C/svg%3E`;

export function getStatusVisual(val) {
    if (val === 0.5) return `<img src="${HALF_STAR_SVG}" class="w-5 h-5 mx-auto drop-shadow-sm" />`;
    if (val === 1) return `<img src="${FULL_STAR_SVG}" class="w-5 h-5 mx-auto drop-shadow-sm" />`;
    if (val === 2) return `<span class="text-green-500 font-black text-lg drop-shadow-sm">✔</span>`;
    return `<img src="${EMPTY_STAR_SVG}" class="w-5 h-5 mx-auto" />`;
}