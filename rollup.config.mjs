import serve from 'rollup-plugin-serve'
import {esmOutput, iifeOutput, optional} from './rollup.config.common.mjs'
import styles from 'rollup-plugin-styler'

const serverOptional = {...optional}

serverOptional.plugins.push(
    styles({
        mode: 'extract'
    }),
    serve({
        open: false,
        contentBase: 'dist',
        historyApiFallback: './index.html',
        host: 'localhost',
        port: 3000
    })
)

// noinspection JSUnusedGlobalSymbols
export default [{
    output: {
        ...iifeOutput
    },
    ...optional
}, {
    output: esmOutput,
    ...serverOptional
}]