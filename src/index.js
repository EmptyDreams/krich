import mainStyle from './resources/css/main.css'
import varStyle from './resources/css/color.css'

/**
 * 在指定元素内初始化编辑器
 *
 * 内置支持以下选项：
 *
 * ```
 * headerSelect: 标题或正文选择器
 * blockquote: 引用
 * bold: 加粗
 * underline: 下划线
 * italic: 斜体
 * through: 删除线
 * code: 行内代码
 * sup: 上标
 * sub: 下标
 * clear: 清除格式
 * color: 文本颜色
 * background: 文本背景色
 * ul: 无序列表
 * ol: 有序列表
 * multi: 多选列表
 * ```
 *
 * @param selector {string} 元素选择器
 * @param elements {{[key: string]: (boolean | any)}} 要显示的选项元素，key 表示选项名称，填 true 或 false 表示启用或禁用，填其他值表示具体配置
 */
export function initEditor(selector, elements) {
    const container = document.querySelector(selector)
    container.insertAdjacentHTML('beforebegin', `<style>${varStyle}${mainStyle}</style>`)
    container.innerHTML = `<div class="krich-tools">${
        Object.getOwnPropertyNames(elements)
            .map(it => buttonBehavior[it].render())
            .join('')
    }</div><div class="krich-editor" contenteditable></div>`
    container.addEventListener('click', event => {
        let target = event.target
        if (target.classList.contains('krich-tools')) return
        let type
        while (true) {
            const key = target.getAttribute('data-key')
            if (key) {
                type = key
                break
            }
            target = target.parentNode
        }
        const classList = target.classList
        if (classList.contains('select')) {
            classList.toggle('show')
            const original = event.target
            if (original.classList.contains('item')) {
                target.getElementsByTagName('span')[0].innerText = original.innerText
            }
            target.onblur = () => classList.remove('show')
        } else {
            buttonBehavior[target.getAttribute('data-key')].onclick?.(event, target)
        }
    })
}

/** 转译器，用于将文本转换为指定的样式 */
export const translator = {
    headerSelector: (text, level) => {
        if (level === 0) return text
        else return `<h${level}>${text}</h${level}>`
    }
}

import headerSelectStyle from './resources/html/tools/headerSelect.html'
import blockquoteStyle from './resources/html/tools/blockquote.html'
import boldStyle from './resources/html/tools/bold.html'
import underlineStyle from './resources/html/tools/underline.html'
import italicStyle from './resources/html/tools/italic.html'
import throughStyle from './resources/html/tools/through.html'
import codeStyle from './resources/html/tools/code.html'
import supStyle from './resources/html/tools/sup.html'
import subStyle from './resources/html/tools/sub.html'
import clearStyle from './resources/html/tools/clear.html'
import colorStyle from './resources/html/tools/color.html'
import backgroundStyle from './resources/html/tools/background.html'
import ulStyle from './resources/html/tools/ul.html'
import olStyle from './resources/html/tools/ol.html'
import multiStyle from './resources/html/tools/multi.html'

// noinspection JSValidateTypes
/**
 * 工具栏上的按钮的样式
 * @type {{[string]: function(): string}}
 */
export const buttonBehavior = {
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