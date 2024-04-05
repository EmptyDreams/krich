import terser from '@rollup/plugin-terser'
import {esmOutput, iifeOutput, optional} from './rollup.config.common.mjs'

const compressOptional = {
    ...optional,
    plugins: [
        ...optional.plugins,
        terser({
            compress: {
                sequences: true,
                unsafe: true,
                unsafe_arrows: true,
                unsafe_math: true,
                pure_getters: true,
                booleans_as_integers: true,
                drop_console: true,
                passes: 2,
                ecma: 2016
            }
        })
    ]
}

// noinspection JSUnusedGlobalSymbols
export default [{
    output: {
        ...iifeOutput,
        entryFileNames: 'krich.min.js',
    },
    ...compressOptional
}, {
    output: {
        ...esmOutput,
        entryFileNames: 'krich-es.min.js',
        assetFileNames: undefined
    },
    ...compressOptional
}, {
    output: iifeOutput,
    ...optional
}, {
    output: esmOutput,
    ...optional
}]