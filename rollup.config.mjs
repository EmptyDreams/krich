import serve from 'rollup-plugin-serve'

import config from './rollup.config.common.mjs'

config.plugins.push(
    serve({
        open: false,
        contentBase: 'dist',
        historyApiFallback: './index.html',
        host: 'localhost',
        port: 3000
    })
)

// noinspection JSUnusedGlobalSymbols
export default config