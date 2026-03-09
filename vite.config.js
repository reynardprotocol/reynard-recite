import { defineConfig } from 'vite'

import { viteSingleFile } from 'vite-plugin-singlefile'

// Vite 配置文件
// 支持两种模式：
// 1. 默认构建：带 base 路径，供 GitHub Pages 使用
// 2. standalone 构建：使用 vite-plugin-singlefile 将所有代码打包进一个 HTML 文件中，不带 base 路径
export default defineConfig(({ mode }) => {
    const isStandalone = mode === 'standalone';

    return {
        // standalone 模式下必须使用 './' ，普通模式使用 github pages 的仓库名
        base: isStandalone ? './' : '/reynard-recite/',
        plugins: isStandalone ? [viteSingleFile()] : [],
        build: {
            // standlone 输出到不同的目录，避免混淆
            outDir: isStandalone ? 'dist-local' : 'dist',
        }
    }
})
