import krichStyle from '../../resources/css/main.styl'
import {registryMouseClickEvent} from '../events/mouse-click-event'
import {registryKeyboardEvent} from '../events/keyboard-event'
import {editorRange, registryRangeMonitor} from '../events/range-monitor'
import {registryBeforeInputEventListener} from '../events/before-input'
import {
    behaviors,
    DATA_ID,
    initContainerQuery, KRICH_CLASS, KRICH_EC_CLASS, KRICH_EDITOR, KRICH_EDITOR_CLASS, KRICH_HOVER_TIP_CLASS,
    KRICH_TOOL_BAR, KRICH_TOOL_BAR_CLASS, markStatusCacheEffect,
    SELECT_VALUE,
    statusCheckCache
} from '../vars/global-fileds'
import {compareBtnListStatusWith} from './btn'
import {KRange} from './range'
import {getElementBehavior, readSelectedColor} from './tools'
import {findParentTag} from './dom'
import {TODO_MARKER} from '../vars/global-tag'
import {highlightCode} from './highlight'
import {registryEditorScrollEvent} from '../events/scroll-event'

/**
 * 在指定容器内初始化编辑器，该容器应当是一个内容为空的标签
 *
 * @param optional {string|Element} 元素选择器或容器
 */
export function initKrich(optional) {
    initContainer(optional)
    registryMouseClickEvent()
    registryKeyboardEvent()
    registryRangeMonitor()
    registryEditorScrollEvent()
    registryBeforeInputEventListener(KRICH_EDITOR, event => new Promise(resolve => {
        setTimeout(() => {
            resolve()
            const {data, inputType} = event
            let range = KRange.activated()
            const {startContainer, startOffset} = range
            if (findParentTag(range.realStartContainer(), ['PRE']))
                return
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
    }))
}

/**
 * 初始化容器
 * @param optional {string|Element} 元素选择器或容器
 */
function initContainer(optional) {
    const container = typeof optional === 'string' ? document.querySelector(optional) : optional
    console.assert(/^\s*$/g.test(container.textContent) && container.childElementCount === 0, "指定的容器内容不为空：", container)
    container.insertAdjacentHTML('beforebegin', `<style>${krichStyle}</style>`)
    container.innerHTML = `<div class="${KRICH_TOOL_BAR_CLASS}">${
        Object.getOwnPropertyNames(behaviors)
            .map(it => behaviors[it].render())
            .join('')
    }</div><div class="${KRICH_EC_CLASS}"><div class="${KRICH_HOVER_TIP_CLASS}"></div><div class="${KRICH_EDITOR_CLASS}" spellcheck contenteditable><p><br></p></div></div>`
    container.classList.add(KRICH_CLASS)
    initContainerQuery(container)
    for (let child of KRICH_TOOL_BAR.children) {
        const dataId = child.getAttribute(DATA_ID)
        behaviors[dataId].button = child
        if (child.classList.contains('color')) {
            child.setAttribute(SELECT_VALUE, readSelectedColor(child))
            child.getElementsByTagName('input')[0].onblur = () => editorRange?.active?.()
        }
    }
}