import {
    ACTIVE_FLAG,
    DATA_ID, DISABLE_FLAG, HOVER_TIP_NAME, KRICH_CONTAINER, KRICH_EDITOR, KRICH_HOVER_TIP,
    KRICH_TOOL_BAR,
    SELECT_VALUE
} from '../vars/global-fileds'
import {getElementBehavior, isEmptyBodyElement, isKrichEditor, isKrichToolBar, waitTime} from '../utils/tools'
import {editorRange, isFirstRange} from './range-monitor'
import {findParentTag, modifyContenteditableStatus} from '../utils/dom'
import {KRange} from '../utils/range'
import {isNoRecord, isNoStatus} from '../types/button-behavior'
import {closeHoverTip, HOVER_TIP_LIST} from '../utils/hover-tip'
import {clickButton} from '../behavior'
import {recordOperate} from '../utils/record'

export let isNewClickCycle = true
/**
 * 记录当前鼠标指向的超链接
 * @type {Element|undefined}
 */
export let currentLink

/** 标记一个鼠标的周期开始 */
export function markClickCycleStart() {
    isNewClickCycle = false
}

export function registryMouseClickEvent() {
    KRICH_CONTAINER.addEventListener('click', () => isNewClickCycle = true)
    KRICH_EDITOR.addEventListener('mouseover', event => {
        const {target, ctrlKey} = event
        if (target.nodeName === 'A') {
            currentLink = target
            modifyContenteditableStatus(target, !ctrlKey)
        } else currentLink = null
    })
    KRICH_EDITOR.addEventListener('click', event => {
        const {target} = event
        if (!isFirstRange && isKrichEditor(target)) {
            closeHoverTip()
        }
        if (isEmptyBodyElement(target)) {
            closeHoverTip()
            new KRange(target).active()
        }
    })
    KRICH_HOVER_TIP.addEventListener('click', event => {
        // noinspection JSUnresolvedReference
        if (!KRICH_HOVER_TIP.tip) return
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
        if (KRICH_TOOL_BAR.classList.contains(DISABLE_FLAG)) {
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
        if (target.classList.contains(DISABLE_FLAG)) {
            range.active()
            return
        }
        const behavior = getElementBehavior(target)
        const classList = target.classList
        let skip = classList.contains('color'), correct
        await recordOperate(async () => {
            if (!skip) {
                if (classList.contains('select')) {
                    skip = await handleSelectList(target, original)
                } else {
                    if (isNoStatus(behavior)) {
                        waitTime(333).then(() => classList.remove(ACTIVE_FLAG))
                    }
                }
                if (!skip) {
                    correct = clickButton(behavior, range, true)
                }
            }
            if (skip || correct) range.active()
        }, skip || isNoRecord(behavior))
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
    if (!optional || optional === select) return true
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