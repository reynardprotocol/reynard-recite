# 📖 背诵沙盘 (Reynard Recite)

> 一款面向教师的课堂背诵管理工具。通过班级沙盘、多维打卡矩阵和数据可视化，帮助教师高效追踪学生的背诵进度。

🌐 **在线访问**：[https://reynardprotocol.github.io/reynard-recite/](https://reynardprotocol.github.io/reynard-recite/)

---

## ✨ 当前功能一览

### 🏫 班级沙盘
- 班级大厅：创建、重命名、删除班级，查看所有班级卡片
- 沙盘视图：木纹风格班级座位图，将学生拖入小组桌位
- 小组管理：自定义小组名称与座位数量
- 学生管理：手动添加、TXT 批量导入、拖拽排座、设置组长

### 📊 多维打卡矩阵
- 支持在同一班级内创建多个独立打卡分组（如"M系列"、"U单元"）
- 每个分组有独立的列标（横向进度）和任务（纵向学习项）
- 打卡状态：空 → 半星 ☆ → 满星 ★ → 完成 ✔
- 粒子特效：打卡时触发彩色粒子动画
- 专属任务：每位学生可追加个人附加任务

### 📋 班级设置
- 新建大分组，添加列标和学习任务
- **跨班级模板同步**：将其他班级的分组与任务配置一键深拷贝到当前班级

### 🏆 排行榜
- 学生个人积分排行
- 小组总积分排行

---

## 🛠️ 技术栈

| 技术 | 用途 |
|---|---|
| Vite | 构建工具与开发服务器 |
| 原生 ES6 JavaScript | 核心业务逻辑 |
| Tailwind CSS v3 | 样式框架 |
| LocalStorage | 本地数据持久化（无服务器） |
| GitHub Actions | CI/CD 自动部署到 GitHub Pages |

---

## 🚀 本地运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

---

## 📁 项目结构

```
reynard-recite/
├── index.html              # 页面骨架与所有 DOM 结构
├── vite.config.js          # Vite 构建配置（含 GitHub Pages base 路径）
├── src/
│   ├── main.js             # 核心业务逻辑、渲染函数、事件处理
│   ├── data.js             # LocalStorage 读写封装
│   ├── utils.js            # 工具库（程序化 SVG 头像、粒子特效、星级视觉）
│   └── style.css           # Tailwind 基础样式 + 自定义动画
├── public/                 # 静态资源目录
└── .github/workflows/
    └── deploy.yml          # GitHub Actions 自动部署工作流
```

---

## 🗺️ 后续规划

查看 [Recitation-Sandbox-Memory.md](./Recitation-Sandbox-Memory.md) 了解详细规划与技术决策记录。

---

## 📄 许可

MIT License