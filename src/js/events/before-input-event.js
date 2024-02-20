// noinspection JSAssignmentUsedAsCondition

import {editorRange, updateEditorRange} from './range-monitor'
import {
    KRICH_EDITOR,
    markComposingStart,
    markComposingStop,
    markStatusCacheEffect,
    statusCheckCache
} from '../vars/global-fileds'
import {findParentTag} from '../utils/dom'
import {highlightCode} from '../utils/highlight'
import {KRange} from '../utils/range'
import {compareBtnListStatusWith} from '../utils/btn'
import {getElementBehavior} from '../utils/tools'
import {TODO_MARKER} from '../vars/global-tag'

let codeHighlight

/**
 * 注册 before input 事件
 */
export function registryBeforeInputEventListener() {
    const handler = async event => setTimeout(() => {
        const {data, inputType} = event
        let range = KRange.activated()
        const {startContainer, startOffset} = range
        if (findParentTag(range.realStartContainer(), ['PRE'])) return
        /* 当用户输入位置所在文本与按钮列表不同时，将新输入的文本样式与按钮状态同步 */
        if (data && !statusCheckCache && range.collapsed) {
            markStatusCacheEffect()
            const buttonList = compareBtnListStatusWith(startContainer)
            if (!buttonList) return
            const newRange = new KRange()
            newRange.setStart(startContainer, startOffset - data.length)
            newRange.setEnd(startContainer, startOffset)
            const offline = newRange.serialization()
            for (let child of buttonList) {
                const behavior = getElementBehavior(child)
                behavior.onclick(KRange.deserialized(offline), child)
            }
            newRange.deserialized(offline)
            newRange.collapse(false)
            newRange.active()
        }
        /* 在代办列表中换行时自动在 li 中插入 <input> */
        if (inputType === 'insertParagraph') {
            const todoList = findParentTag(startContainer, item => item.classList?.contains?.('todo'))
            if (todoList) {
                const item = todoList.querySelector('&>li>p:first-child')
                if (item) item.insertAdjacentElement('beforebegin', TODO_MARKER.cloneNode(true))
            }
        }
    }, 0)
    KRICH_EDITOR.addEventListener('beforeinput', event => {
        if (event.isComposing) {
            markComposingStart()
        } else if (!highlightCodeHelper() && event.inputType.startsWith('insert')) {
            // noinspection JSIgnoredPromiseFromCall
            handler(event)
        }
    })
    KRICH_EDITOR.addEventListener('compositionend', event => {
        handler(event).then(() => {
            markComposingStop()
            updateEditorRange()
        })
    })
}

function highlightCodeHelper() {
    const pre = findParentTag(editorRange.realStartContainer(), ['PRE'])
    if (pre) {
        clearTimeout(codeHighlight)
        codeHighlight = setTimeout(() => highlightCode(editorRange, pre), 333)
        return true
    }
}