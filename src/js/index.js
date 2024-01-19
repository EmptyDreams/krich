import krichStyle from '../resources/css/main.styl'

import './behavior'
import {
    behaviors,
    DATA_ID,
    initContainerQuery,
    KRICH_TOOL_BAR,
    markStatusCacheInvalid,
    SELECT_VALUE, statusCheckCache
} from './global-fileds'
import {KRange} from './utils/range'
import {registryBeforeInputEventListener} from './events/before-input'
import {compareBtnListStatusWith} from './utils/btn'
import {readSelectedColor} from './utils/tools'
import {registryKeyboardEvent} from './events/keyboard-event'
import {registryMouseClickEvent} from './events/mouse-click-event'
import {editorRange, registryRangeMonitor} from './events/range-monitor'

export {behaviors}

// noinspection JSUnusedGlobalSymbols
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
    }</div><div class="krich-editor" spellcheck contenteditable><p><br></p></div>`
    initContainerQuery(container)
    for (let child of KRICH_TOOL_BAR.children) {
        const dataId = child.getAttribute(DATA_ID)
        behaviors[dataId].button = child
        if (child.classList.contains('color')) {
            child.setAttribute(SELECT_VALUE, readSelectedColor(child))
            child.getElementsByTagName('input')[0].onblur = () => editorRange?.active?.()
        }
    }
    registryMouseClickEvent()
    registryKeyboardEvent()
    registryRangeMonitor()
    registryBeforeInputEventListener(KRICH_TOOL_BAR, event => {
        // noinspection JSUnresolvedReference
        const data = event.data
        if (statusCheckCache || !data) return
        markStatusCacheInvalid()
        setTimeout(() => {
            let kRange = KRange.activated()
            let range = kRange.item
            if (!range.collapsed) return
            const {startContainer, startOffset} = range
            const buttonList = compareBtnListStatusWith(startContainer)
            if (!buttonList) return
            const newRange = new KRange()
            newRange.setStart(startContainer, startOffset - data.length)
            newRange.setEnd(startContainer, startOffset)
            const offline = newRange.serialization()
            for (let child of buttonList) {
                const dataId = child.getAttribute(DATA_ID)
                const behavior = behaviors[dataId]
                behavior.onclick(KRange.deserialized(offline), child, null)
            }
        }, 0)
    })
}