import html from 'rollup-plugin-html'
import resolve from '@rollup/plugin-node-resolve'
import postcss from 'rollup-plugin-postcss'
import postcssImport from 'postcss-import'

// noinspection JSUnusedGlobalSymbols
export const optional = {
    input: 'src/js/index.js',
    plugins: [
        resolve({
            browser: true
        }),
        {
            name: 'ReplaceHeaderAndFooter',
            renderChunk: function (code, chunk, options, _) {
                if (chunk.type !== 'chunk') return
                if (options.format === 'iife') {
                    return code.replace(
                        new RegExp(`^(var\\s${options.name}\\s=\\s\\(function\\s\\(exports\\)\\s{)`),
                        `var ${options.name} = function(_optional) {\n    const exports = {}`
                    ).replace(/^\s*}\)\({\s*}\);\s*$/m, '}')
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
                minifyJS: true,                         //压缩页面 JS
                minifyCSS: true,                        //压缩页面 CSS
                minifyURLs: true                        //压缩页面URL
            }
        }),
        postcss({
            inject: false,
            minimize: true,
            plugins: [postcssImport()]
        })
    ]
}

export const iifeOutput = {
    dir: 'dist/',
    entryFileNames: 'krich.js',
    format: 'iife',
    name: 'KRich',
    generatedCode: {
        constBindings: true
    }
}

export const esmOutput = {
    dir: 'dist/',
    entryFileNames: 'krich-es.js',
    format: 'es',
    name: 'KRich',
    generatedCode: {
        constBindings: true
    }
}