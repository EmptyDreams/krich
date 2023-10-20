import krichStyle from '../resources/css/main.styl'

import './behavior'
import {behaviors} from './constant'

export {behaviors}

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
    container.insertAdjacentHTML('beforebegin', `<style>${krichStyle}</style>`)
    container.innerHTML = `<div class="krich-tools">${
        Object.getOwnPropertyNames(elements)
            .map(it => behaviors[it].render())
            .join('')
    }</div><div class="krich-editor" spellcheck contenteditable><p></p></div>`
    container.getElementsByClassName('krich-tools')[0].addEventListener('click', event => {
        const original = event.target
        let target = original
        if (target.classList.contains('krich-tools')) return
        let type, dataKey
        while (true) {
            dataKey = target.getAttribute('data-key')
            if (dataKey) {
                type = dataKey
                break
            }
            target = target.parentNode
        }
        const classList = target.classList
        if (classList.contains('select')) {
            classList.toggle('show')
            if (!original.classList.contains('item')) {
                target.onblur = () => classList.remove('show')
                return
            }
            target.getElementsByTagName('span')[0].innerText = original.innerText
        }
        behaviors[dataKey].onclick?.(event, target)
    })
}