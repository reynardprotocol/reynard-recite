import { defineConfig } from 'vite'

// Vite 配置文件
// 为什么要设置 base？
// GitHub Pages 部署后，网址是 https://用户名.github.io/仓库名/
// 如果 base 不设置，浏览器找不到 CSS/JS 等静态文件（因为路径会差一截）
// 设置 base = '/reynard-recite/' 告诉 Vite：所有资源路径都从这个子目录开始找
export default defineConfig({
    base: '/reynard-recite/',
})
