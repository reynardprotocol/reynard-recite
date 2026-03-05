// ==========================================
// 程序化 SVG 捏脸引擎 (Avatar Generator)
// ==========================================
export const AvatarConfig = {
    skinColors: ['#FFDFC4', '#F0D5BE', '#EECEB3', '#E1B899', '#C58C66', '#8D5524', '#FCD7B8'],
    shirtColors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FDCB6E', '#6C5CE7', '#A8E6CF', '#DCEDC1', '#FFD3B6', '#FFAAA5', '#FF8B94', '#D4A5A5'],
    eyeTypes: ['normal', 'happy', 'calm'],
    mouthTypes: ['smile', 'neutral', 'open']
};

export function generateAvatarHash(name, index) {
    const seedStr = `${name}_${name.length}_${index}`;
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
        hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
        hash |= 0; 
    }
    return Math.abs(hash);
}

export function renderEyes(type, skinColor) {
    const color = "#333333";
    switch(type) {
        case 'happy': return `<path d="M 38 40 Q 42 36 46 40 M 54 40 Q 58 36 62 40" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
        case 'calm': return `<line x1="40" y1="40" x2="45" y2="40" stroke="${color}" stroke-width="2" stroke-linecap="round"/><line x1="55" y1="40" x2="60" y2="40" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;
        case 'normal':
        default: return `<circle cx="42" cy="40" r="2.5" fill="${color}"/><circle cx="58" cy="40" r="2.5" fill="${color}"/>`;
    }
}

export function renderMouth(type) {
    const color = "#333333";
    switch(type) {
        case 'open': return `<ellipse cx="50" cy="52" rx="4" ry="5" fill="#e67e22"/>`;
        case 'neutral': return `<line x1="46" y1="52" x2="54" y2="52" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;
        case 'smile':
        default: return `<path d="M 45 50 Q 50 56 55 50" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    }
}

export function generateAvatarSVG(student) {
    const hash = generateAvatarHash(student.name, student.importIndex || 0);
    const skinColor = AvatarConfig.skinColors[hash % AvatarConfig.skinColors.length];
    const shirtColor = AvatarConfig.shirtColors[(hash >> 2) % AvatarConfig.shirtColors.length];
    const eyeType = AvatarConfig.eyeTypes[(hash >> 4) % AvatarConfig.eyeTypes.length];
    const mouthType = AvatarConfig.mouthTypes[(hash >> 5) % AvatarConfig.mouthTypes.length];
    
    return `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-sm">
            <rect x="20" y="65" width="60" height="40" rx="15" fill="${shirtColor}" />
            <circle cx="50" cy="40" r="24" fill="${skinColor}" />
            ${renderEyes(eyeType, skinColor)}
            ${renderMouth(mouthType)}
        </svg>
    `;
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