import serve from 'rollup-plugin-serve'
import {esmOutput, iifeOutput, optional} from './rollup.config.common.mjs'

const customOptional = {...optional}

customOptional.plugins.push(
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
    output: iifeOutput,
    ...customOptional
}, {
    output: esmOutput,
    ...customOptional
}]