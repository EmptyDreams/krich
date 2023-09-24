import html from 'rollup-plugin-html'
import resolve from '@rollup/plugin-node-resolve'
import postcss from 'rollup-plugin-postcss'
import postcssImport from 'postcss-import'

// noinspection JSUnusedGlobalSymbols
export default {
    input: 'src/index.js',
    output: {
        file: 'dist/krich.js',
        format: 'iife',
        name: 'krich'
    },
    plugins: [
        resolve(),
        html({
            include: './src/resources/**/*.html'
        }),
        postcss({
            extract: true,
            plugins: [postcssImport()]
        })
    ]
}