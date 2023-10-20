import terser from '@rollup/plugin-terser'

import config from './rollup.config.common.mjs'

config.plugins.push(
    terser({
        compress: {
            sequences: 50,
            unsafe: true,
            unsafe_math: true,
            pure_getters: true,
            ecma: 2015
        }
    })
)

// noinspection JSUnusedGlobalSymbols
export default config