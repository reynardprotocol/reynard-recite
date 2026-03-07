# 📂 背诵沙盘系统 核心记忆档案 (Recitation-Sandbox-Memory)

**最后更新**：2026-03-07  
**项目状态**：✅ 稳定运行，已部署至 GitHub Pages

---

## 👨‍🏫 AI 导师行为设定（系统级指令）

接手此对话的 AI **必须**严格遵守：

1. **角色**：编程导师，而非代码生成器
2. **教学风格**：引导式，多用生活比喻解释技术（浅拷贝 = 配钥匙，深拷贝 = 重新打造一把新锁）
3. **代码规范**：超过 20 行或涉及复杂逻辑必须加 `// [001]` 路标锚点系统 + 教学式注释
4. **决策机制**：方案不明确时，列出选项让用户选，不擅自决定
5. **安全机制**：执行 `rm`、`git reset` 等危险命令前必须中文说明后果

---

## 🛠️ 技术架构

- **运行环境**：纯前端 + Vite 开发服务器 + GitHub Pages 托管（无后端）
- **技术栈**：原生 ES6 模块化 JS + Tailwind CSS v3 + LocalStorage
- **部署**：GitHub Actions 自动构建，`push main` → 自动部署

### 核心文件索引

| 文件 | 职责 |
|---|---|
| `index.html` | 所有 DOM 骨架，包含各类弹窗 HTML |
| `src/main.js` | 全部业务逻辑、渲染函数、事件处理 |
| `src/data.js` | LocalStorage 读写封装 |
| `src/utils.js` | SVG 头像生成、粒子特效、星级视觉 |
| `src/style.css` | Tailwind 指令 + 自定义粒子/滚动条动画 |
| `vite.config.js` | `base: '/reynard-recite/'`，GitHub Pages 必须 |
| `.github/workflows/deploy.yml` | CI/CD 自动部署工作流 |

---

## ✅ 已完成功能清单

### v1 — 基础框架
- 班级大厅（创建/重命名/删除班级）
- 沙盘视图（木纹风拖拽座位图）
- 学生管理（手动/TXT批量导入、拖拽排座、设置组长）

### v2 — 多维打卡矩阵
- 升级为多分组独立表格（M系列/U单元等并列）
- 任务与列标完全解耦：每个分组独立任务行
- 首列冻结（`sticky left-0`）+ 横向独立滚动
- 打卡粒子特效 + 星级状态视觉（空/半星/满星/完成）
- 学生专属附加任务

### v3 — Bug 修复 & 交互升级（本次会话完成）

#### 🔧 修复：幽灵污染（引用传递陷阱）
- **问题**：`colGroups` 全局共享，A班修改影响B班
- **修复**：将 `colGroups` 下沉至班级对象内部，用 `structuredClone()` 深拷贝替代所有浅拷贝
- **影响文件**：`main.js`（`getColGroups`、`createClass`、`getClassTasks` 等 9 处）

#### 🔧 修复：所有交互按钮失效
- **问题**：浏览器安全策略静默拦截 `window.prompt()` / `window.confirm()`，导致点击无反应
- **修复**：
  - `index.html`：新增 `customPromptOverlay`、`customConfirmOverlay` 自定义弹窗 DOM
  - `main.js`：新增 `customPrompt()` / `customConfirm()` 工具函数（基于 Promise），14 处调用全部改为 `async/await`

#### ✨ 新功能：跨班级模板同步
- **入口**：打卡设置面板 → 绿色「同步其他班级」按钮
- **交互**：弹出班级选择器 → 选择源班级 → 确认覆盖
- **安全**：使用 `structuredClone()` 深拷贝，同步后两班数据完全独立，不会相互影响
- **影响文件**：`index.html`（新增 `classSyncModal` DOM）、`main.js`（新增 3 个函数）

#### 🚀 新功能：GitHub Pages 自动部署
- `vite.config.js`：设置 `base: '/reynard-recite/'`
- `.github/workflows/deploy.yml`：push main 后自动构建并部署
- **在线地址**：https://reynardprotocol.github.io/reynard-recite/

---

## ⚠️ 重要技术坑记录

### 坑 1：引用传递（幽灵污染）
JavaScript 对象赋值是引用传递，不是值传递。
```js
// ❌ 危险：两个班级实际共享同一份数据
classB.colGroups = classA.colGroups;

// ✅ 安全：深拷贝，完全独立
classB.colGroups = structuredClone(classA.colGroups);
```

### 坑 2：prompt() 被浏览器拦截
某些环境（自动化测试、部分浏览器设置）下 `window.prompt()` 返回 `null`，导致逻辑直接跳过，按钮看起来没反应但无报错。解决方案：永远用自定义模态框代替原生弹窗。

### 坑 3：GitHub Pages 静态资源 404
Vite 打包后资源路径从 `/assets/...` 变成 `/reynard-recite/assets/...`，必须在 `vite.config.js` 中设置 `base` 才能正确解析。

---

## 🗺️ 后续规划方向

### 🔥 高优先级（功能核心）
1. **命运大转盘**：Canvas 实现，随机抽学生背书，点击旋转 + 停止高亮
2. **打卡数据导出**：一键生成格式化文字（`【A班进度】M1✅ M2⭐`），方便发家长群

### 🎮 游戏化模块（中期目标）
3. **宝箱奖励系统**：打出第一颗星时获得开箱机会，掉落帽子/边框/称号等装饰，叠加在头像上
4. **头像升级**：将现有 SVG 捏脸头像升级为 [DiceBear pixel-art](https://api.dicebear.com/9.x/pixel-art/svg?seed=test) 风格（已有 demo 验证，效果良好）

### 💄 体验优化（低优先级）
5. **暗黑模式**：顶部切换按钮，CSS 变量 + `data-theme` 实现
6. **打卡连击特效**：连续满分列触发 🔥 连击动画
7. **班级统计总览**：大厅卡片上显示全班打卡完成率进度条

### 🌐 长期目标（需引入后端）
8. **多设备数据同步**：目前数据存 LocalStorage，仅当前浏览器可用。引入 Firebase Firestore 可实现云端同步，手机/电脑均可访问

---

## 🔗 相关资源

- **在线地址**：https://reynardprotocol.github.io/reynard-recite/
- **仓库**：https://github.com/reynardprotocol/reynard-recite
- **DiceBear 头像库**：https://www.dicebear.com/styles/pixel-art/
- **免费像素素材**：https://itch.io/game-assets/free/tag-pixel-art