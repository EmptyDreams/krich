import serve from 'rollup-plugin-serve'
import {esmOutput, iifeOutput, optional} from './rollup.config.common.mjs'
import styles from 'rollup-plugin-styler'

const serverOptional = {...optional}
const stylusOptional = {...optional}

serverOptional.plugins.push(
    serve({
        open: false,
        contentBase: 'dist',
        historyApiFallback: './index.html',
        host: 'localhost',
        port: 3000
    })
)

stylusOptional.plugins.push(
    styles({
        mode: 'extract'
    })
)

// noinspection JSUnusedGlobalSymbols
export default [{
    output: {
        ...iifeOutput,
        assetFileNames: 'krich-demo.css'
    },
    ...stylusOptional
}, {
    output: esmOutput,
    ...serverOptional
}]