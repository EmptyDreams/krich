import terser from '@rollup/plugin-terser'
import replace from '@rollup/plugin-replace'

import config from './rollup.config.common.mjs'

// noinspection SpellCheckingInspection
config.plugins.push(
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
            ecma: 2015
        }
    }),
    replace({
        preventAssignment: true,
        values: {
            'const ': 'let ',
            '!==': '!=',
            '===': '=='
        }
    })
)

// noinspection JSUnusedGlobalSymbols
export default config