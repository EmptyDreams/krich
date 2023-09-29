import headerSelectStyle from '../resources/html/tools/headerSelect.html'
import blockquoteStyle from '../resources/html/tools/blockquote.html'
import boldStyle from '../resources/html/tools/bold.html'
import underlineStyle from '../resources/html/tools/underline.html'
import italicStyle from '../resources/html/tools/italic.html'
import throughStyle from '../resources/html/tools/through.html'
import codeStyle from '../resources/html/tools/code.html'
import supStyle from '../resources/html/tools/sup.html'
import subStyle from '../resources/html/tools/sub.html'
import clearStyle from '../resources/html/tools/clear.html'
import colorStyle from '../resources/html/tools/color.html'
import backgroundStyle from '../resources/html/tools/background.html'
import ulStyle from '../resources/html/tools/ul.html'
import olStyle from '../resources/html/tools/ol.html'
import multiStyle from '../resources/html/tools/multi.html'

// noinspection JSValidateTypes
/**
 * 工具栏上的按钮的样式
 * @type {{[string]: function(): string}}
 */
export default {
    headerSelect: {
        render: () => headerSelectStyle
    },
    blockquote: {
        render: () => blockquoteStyle
    },
    bold: {
        render: () => boldStyle
    },
    underline: {
        render: () => underlineStyle
    },
    italic: {
        render: () => italicStyle
    },
    through: {
        render: () => throughStyle
    },
    code: {
        render: () => codeStyle
    },
    sup: {
        render: () => supStyle
    },
    sub: {
        render: () => subStyle
    },
    clear: {
        render: () => clearStyle
    },
    color: {
        render: () => colorStyle
    },
    background: {
        render: () => backgroundStyle
    },
    ul: {
        render: () => ulStyle
    },
    ol: {
        render: () => olStyle
    },
    multi: {
        render: () => multiStyle
    }
}