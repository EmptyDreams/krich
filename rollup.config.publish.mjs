import terser from '@rollup/plugin-terser'
import {esmOutput, iifeOutput, optional} from './rollup.config.common.mjs'
import styles from 'rollup-plugin-styler'

const customOptional = {...optional}
customOptional.plugins.push(
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
)

const stylusOptional = {...customOptional}
stylusOptional.plugins.push(
    styles({
        mode: 'extract'
    })
)

// noinspection JSUnusedGlobalSymbols
export default [{
    output: iifeOutput,
    ...customOptional
}, {
    output: esmOutput,
    ...stylusOptional
}]