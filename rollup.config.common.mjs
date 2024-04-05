import html from 'rollup-plugin-html'
import resolve from '@rollup/plugin-node-resolve'
import { getLogFilter } from 'rollup/getLogFilter'
import styles from 'rollup-plugin-styler'

const logFilter = getLogFilter(['!code:CIRCULAR_DEPENDENCY'])

// noinspection JSUnusedGlobalSymbols
export const optional = {
    input: 'src/js/index.js',
    onLog(level, log, handler) {
        if (logFilter(log)) {
            handler(level, log)
        }
    },
    plugins: [
        resolve({
            browser: true
        }),
        {
            name: 'ReplaceHeaderAndFooter',
            renderChunk(code, chunk, options, _) {
                if (chunk.type !== 'chunk') return
                code = code.replaceAll('const ', 'let ')
                if (options.format === 'iife') {
                    return code.replace(
                        new RegExp(`^(var\\s${options.name}\\s=\\s\\(function\\s\\(exports\\)\\s{)`),
                        `const ${options.name} = function(_optional) {\n    let exports = {}`
                    ).replace(/^\s*}\)\({\s*}\);\s*$/m, '}')
                        .replace('return exports;', `return Object.freeze(exports)`)
                } else {
                    const endIndex = code.lastIndexOf('// ESM：封装终点')
                    const subCode = code.substring(0, endIndex)
                    return `
                        export default function(_optional) {
                            ${subCode}
                            return {
                                ${chunk.exports.join(',')}
                            }
                        }
                    `
                }
            }
        },
        html({
            include: './src/resources/**/*.html',
            htmlMinifierOptions: {
                collapseWhitespace: true,               // 合并空格
                collapseBooleanAttributes: true,        // 压缩布尔类型的 attributes
                noNewlinesBeforeTagClose: false,        // 去掉换行符
                removeAttributeQuotes: true,            // 在可能时删除属性值的引号
                removeRedundantAttributes: true,        // 属性值与默认值一样时删除属性
                removeEmptyAttributes: true,            // 删除值为空的属性
                removeScriptTypeAttributes: true,       // 删除 `type="text/javascript"`
                removeStyleLinkTypeAttributes: true,    // 删除 `type="text/css"`
                minifyJS: true,                         // 压缩页面 JS
                minifyCSS: true,                        // 压缩页面 CSS
                minifyURLs: true                        // 压缩页面 URL
            }
        }),
        styles({
            mode: 'extract'
        })
    ]
}

export const iifeOutput = {
    dir: 'dist/',
    entryFileNames: 'krich.js',
    format: 'iife',
    name: 'KRich',
    assetFileNames: 'assets/[name]-[extname]',
    generatedCode: {
        constBindings: true
    }
}

export const esmOutput = {
    dir: 'dist/',
    entryFileNames: 'krich-es.js',
    format: 'es',
    name: 'KRich',
    assetFileNames: 'krich-demo.css',
    generatedCode: {
        constBindings: true
    }
}