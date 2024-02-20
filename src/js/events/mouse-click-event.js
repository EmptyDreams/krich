import {
    DATA_ID, HOVER_TIP_NAME, KRICH_EDITOR, KRICH_HOVER_TIP,
    KRICH_TOOL_BAR,
    markStatusCacheInvalid,
    SELECT_VALUE
} from '../vars/global-fileds'
import {getElementBehavior, isEmptyBodyElement, isKrichEditor, isKrichToolBar} from '../utils/tools'
import {editorRange} from './range-monitor'
import {findParentTag} from '../utils/dom'
import {KRange} from '../utils/range'
import {isNoStatus} from '../types/button-behavior'
import {closeHoverTip, HOVER_TIP_LIST} from '../utils/hover-tip'

export function registryMouseClickEvent() {
    KRICH_EDITOR.addEventListener('click', event => {
        const {target} = event
        if (isKrichEditor(target)) {
            closeHoverTip()
        }
        if (isEmptyBodyElement(target)) {
            closeHoverTip()
            new KRange(target).active()
        }
    })
    KRICH_HOVER_TIP.addEventListener('click', event => {
        const {target} = event
        const top = findParentTag(target, it => it.classList?.contains('select'))
        if (top) {
            event.preventDefault()
            // noinspection JSIgnoredPromiseFromCall
            handleSelectList(top, target)
        }
    })
    KRICH_TOOL_BAR.addEventListener('click', async event => {
        closeHoverTip()
        const range = editorRange
        if (KRICH_TOOL_BAR.classList.contains('disable')) {
            event.preventDefault()
            range?.active?.()
            return
        }
        if (!range || range.body) return
        /** @type {HTMLElement} */
        let original = event.target
        if (isKrichToolBar(original)) return true
        const target = findParentTag(
            original, it => it.hasAttribute?.(DATA_ID)
        )
        const behavior = getElementBehavior(target)
        const classList = target.classList
        let skip = classList.contains('color'), correct
        if (!skip) {
            if (classList.contains('select')) {
                skip = await handleSelectList(target, original)
            } else {
                classList.toggle('active')
                if (isNoStatus(behavior)) {
                    setTimeout(() => classList.remove('active'), 333)
                }
            }
            if (!skip) {
                correct = behavior.onclick?.(range, target)
                markStatusCacheInvalid()
            }
        }
        if (skip || correct) range.active()
    })
}

/**
 * 处理点击多选列表的事件
 * @param select {Element} 列表对象
 * @param target {Element} 被点击的元素
 */
async function handleSelectList(select, target) {
    // 真实的被点击的选项
    const optional = findParentTag(
        target, it => it.hasAttribute?.(SELECT_VALUE)
    )
    if (!optional) return true
    const value = select.getElementsByClassName('value')[0]
    value.innerHTML = optional.innerHTML
    const selectValue = optional.getAttribute(SELECT_VALUE)
    select.setAttribute(SELECT_VALUE, selectValue)
    // noinspection JSUnresolvedReference
    if (KRICH_HOVER_TIP.tip) {
        const value = HOVER_TIP_LIST[KRICH_HOVER_TIP.getAttribute(HOVER_TIP_NAME)]
        await value.onchange(select)
    }
}