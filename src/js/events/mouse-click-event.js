import {
    DATA_ID, HOVER_TIP_NAME, KRICH_EDITOR, KRICH_HOVER_TIP,
    KRICH_TOOL_BAR,
    markStatusCacheInvalid,
    SELECT_VALUE
} from '../vars/global-fileds'
import {getElementBehavior, isEmptyBodyElement, isKrichToolBar, parseRgbToHex} from '../utils/tools'
import {editorRange} from './range-monitor'
import {findParentTag} from '../utils/dom'
import {KRange} from '../utils/range'
import {isNoStatusBehavior} from '../types/button-behavior'
import {HOVER_TIP_LIST} from '../utils/hover-tip'

export function registryMouseClickEvent() {
    KRICH_EDITOR.addEventListener('click', event => {
        const {target} = event
        if (isEmptyBodyElement(target)) {
            new KRange(target).active()
        }
    })
    KRICH_HOVER_TIP.addEventListener('click', event => {
        const {target} = event
        const top = findParentTag(target, it => it.classList?.contains('select'))
        if (top) {
            handleSelectList(top, target)
            editorRange.active()
        }
    })
    KRICH_TOOL_BAR.addEventListener('click', event => {
        if (KRICH_TOOL_BAR.classList.contains('disable'))
            return
        const range = editorRange
        if (!range || range.body) return
        /** @type {HTMLElement} */
        let original = event.target
        if (isKrichToolBar(original)) return
        const target = findParentTag(
            original, it => it.hasAttribute?.(DATA_ID)
        )
        const behavior = getElementBehavior(target)
        const classList = target.classList
        let skip, correct
        if (classList.contains('select')) {
            skip = handleSelectList(target, original)
        } else {
            classList.toggle('active')
            if (isNoStatusBehavior(behavior)) {
                setTimeout(() => classList.remove('active'), 333)
            }
        }
        if (!skip) {
            correct = behavior.onclick?.(range, target)
            markStatusCacheInvalid()
        }
        if (skip || correct) range.active()
    })
}

/**
 * 处理点击多选列表的事件
 * @param select {Element} 列表对象
 * @param target {Element} 被点击的元素
 */
function handleSelectList(select, target) {
    // 真实的被点击的选项
    const value = select.getElementsByClassName('value')[0]
    if (select.classList.contains('color')) {
        const optional = findParentTag(
            target, it => it.hasAttribute?.('style')
        )
        if (optional === select) return
        if (optional) {
            value.setAttribute('style', optional.getAttribute('style'))
        } else if (target.classList.contains('submit')) {
            const input = target.previousElementSibling
            const inputText = input.value
                .replaceAll(/\s/g, '')
                .replaceAll('，', ',')
                .toLowerCase()
            const color = parseRgbToHex(inputText)
            if (color) {
                input.classList.remove('error')
                value.setAttribute('style', 'background:' + color)
            } else {
                input.classList.add('error')
                return true
            }
        } else return true
    } else {
        const optional = findParentTag(
            target, it => it.hasAttribute?.(SELECT_VALUE)
        )
        if (optional === select) return
        value.innerHTML = optional.innerHTML
        const selectValue = optional.getAttribute(SELECT_VALUE)
        select.setAttribute(SELECT_VALUE, selectValue)
    }
    // noinspection JSUnresolvedReference
    if (KRICH_HOVER_TIP.tip) {
        const value = HOVER_TIP_LIST[KRICH_HOVER_TIP.getAttribute(HOVER_TIP_NAME)]
        value.onchange(select)
    }
}