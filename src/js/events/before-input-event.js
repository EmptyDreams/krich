import {editorRange, updateEditorRange} from './range-monitor'
import {
    KRICH_EDITOR,
    markStatusCacheEffect, markStatusCacheInvalid,
    statusCheckCache
} from '../vars/global-fileds'
import {findParentTag} from '../utils/dom'
import {highlightCode} from '../utils/highlight'
import {KRange} from '../utils/range'
import {compareBtnListStatusWith, isActive, setButtonStatus} from '../utils/btn'
import {getElementBehavior, waitTime} from '../utils/tools'
import {TODO_MARKER} from '../vars/global-tag'
import {behaviors, clickButton} from '../behavior'
import {isNoStatus, isTextArea} from '../types/button-behavior'

let codeHighlight
export let isInputting

/**
 * 注册 before input 事件
 */
export function registryBeforeInputEventListener() {
    KRICH_EDITOR.addEventListener('beforeinput', async event => {
        if (!event.isComposing && !highlightCodeHelper() && event.inputType.startsWith('insert')) {
            isInputting = true
            await handleInput(event)
            isInputting = false
            updateEditorRange()
        }
    })
    KRICH_EDITOR.addEventListener('compositionend', async event => {
        await handleInput(event)
        isInputting = false
        updateEditorRange()
    })
}

/**
 * 处理字符输入事件
 * @param event {InputEvent|CompositionEvent}
 * @return {Promise<void>}
 */
async function handleInput(event) {
    await waitTime(0)
    const {data, inputType} = event
    let range = KRange.activated()
    const {startContainer, startOffset} = range
    if (findParentTag(range.realStartContainer(), isTextArea)) return
    /* 在代办列表中换行时自动在 li 中插入 <input> */
    if (inputType === 'insertParagraph') {
        markStatusCacheInvalid()
        for (let key in behaviors) {
            const behavior = behaviors[key]
            const button = behavior.button
            if (!isNoStatus(behavior) && isActive(button)) {
                setButtonStatus(button)
            }
        }
        const todoList = findParentTag(startContainer, item => item.classList?.contains?.('todo'))
        if (todoList) {
            const item = todoList.querySelector('&>li>p:first-child')
            if (item) item.before(TODO_MARKER.cloneNode(true))
        }
    }
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
            clickButton(getElementBehavior(child), KRange.deserialized(offline))
        }
        newRange.deserialized(offline)
        newRange.collapse(false)
        newRange.active()
    }
}

function highlightCodeHelper() {
    const pre = findParentTag(editorRange.realStartContainer(), ['PRE'])
    if (pre) {
        clearTimeout(codeHighlight)
        codeHighlight = setTimeout(() => highlightCode(editorRange, pre), 333)
        return true
    }
}