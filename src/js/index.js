import krichStyle from '../resources/css/main.styl'

import './behavior'
import {
    behaviors,
    DATA_ID,
    initContainerQuery,
    KRICH_CONTAINER,
    KRICH_EDITOR,
    markStatusCacheInvalid,
    SELECT_VALUE, statusCheckCache
} from './global-fileds'
import {KRange} from './utils/range'
import {registryBeforeInputEventListener} from './events/before-input'
import {compareBtnListStatusWith, syncButtonsStatus} from './utils/btn'
import {getElementBehavior, parseRgbToHex, readSelectedColor} from './utils/tools'
import {registryKeyboardEvent} from './events/keyboard-event'

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
    const editorTools = container.getElementsByClassName('krich-tools')[0]
    const editorContent = container.getElementsByClassName('krich-editor')[0]
    for (let child of editorTools.children) {
        const dataId = child.getAttribute(DATA_ID)
        behaviors[dataId].button = child
        if (child.classList.contains('color')) {
            child.setAttribute(SELECT_VALUE, readSelectedColor(child))
            child.getElementsByTagName('input')[0].onblur = () => prevRange?.active?.()
        }
    }
    editorTools.addEventListener('click', event => {
        /** @type {HTMLElement} */
        const original = event.target
        let target = original
        if (target.classList.contains('krich-tools')) return
        let type, dataKey
        while (true) {
            dataKey = target.getAttribute(DATA_ID)
            if (dataKey) {
                type = dataKey
                break
            }
            target = target.parentNode
        }
        const range = prevRange
        const classList = target.classList
        if (classList.contains('select')) {
            if (original === target) return
            if (original.hasAttribute(SELECT_VALUE)) {
                target.getElementsByClassName('value')[0].innerHTML = original.innerHTML
                const value = original.getAttribute(SELECT_VALUE)
                target.setAttribute(SELECT_VALUE, value)
            } else if (original.hasAttribute('title')) {
                target.getElementsByClassName('value')[0]
                    .setAttribute('style', original.getAttribute('style'))
            } else if (original.classList.contains('submit')) {
                const input = original.previousElementSibling
                const value = input.value
                    .replaceAll(/\s/g, '')
                    .replaceAll('，', ',')
                    .toLowerCase()
                const color = parseRgbToHex(value)
                if (color) {
                    input.classList.remove('error')
                    target.getElementsByClassName('value')[0]
                        .setAttribute('style', 'background:' + color)
                } else {
                    return input.classList.add('error')
                }
            } else return
        } else {
            target.classList.toggle('active')
            if (getElementBehavior(target).noStatus) {
                setTimeout(() => target.classList.remove('active'), 333)
            }
        }
        const correct = behaviors[dataKey].onclick?.(range, target, event)
        if (correct) range.active()
        markStatusCacheInvalid()
    })
    registryKeyboardEvent()
    /** @type {KRange|undefined} */
    let prevRange
    document.addEventListener('selectionchange', () => {
        if (!KRICH_CONTAINER.contains(document.activeElement)) return prevRange = null
        if (KRICH_EDITOR !== document.activeElement) return
        const kRange = KRange.activated()
        const range = kRange.item
        const prev = prevRange?.item
        if (!range.collapsed) {
            const lca = range.commonAncestorContainer
            syncButtonsStatus(editorTools, lca.firstChild ?? lca)
        } else if (!prev?.collapsed || range.endContainer !== prev?.endContainer) {
            syncButtonsStatus(editorTools, range.startContainer)
        }
        prevRange = kRange
    })
    registryBeforeInputEventListener(editorContent, event => {
        // noinspection JSUnresolvedReference
        const data = event.data
        if (statusCheckCache || !data) return
        markStatusCacheInvalid()
        setTimeout(() => {
            let kRange = KRange.activated()
            let range = kRange.item
            if (!range.collapsed) return
            const {startContainer, startOffset} = range
            const buttonList = compareBtnListStatusWith(editorTools, startContainer)
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