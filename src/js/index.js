import krichStyle from '../resources/css/main.styl'

import './behavior'
import {behaviors, BUTTON_STATUS, initContainerQuery, KRICH_CONTAINER, SELECT_VALUE} from './global-fileds'
import {compareBtnListStatusWith, replaceElement, syncButtonsStatus} from './utils'
import {
    KRange,
    setCursorPosition,
    setCursorPositionAfter
} from './range'
import {registryBeforeInputEventListener} from './events/before-input'

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
    // 标记是否已经对比过按钮状态和文本状态
    let statusCheckCache = true
    editorTools.addEventListener('click', event => {
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
            target.getElementsByTagName('span')[0].innerHTML = original.innerHTML
            const value = BUTTON_STATUS[dataKey] = original.getAttribute(SELECT_VALUE)
            target.setAttribute(SELECT_VALUE, value)
        } else {
            BUTTON_STATUS[dataKey] = target.classList.toggle('active')
        }
        const range = KRange.activated()
        const correct = behaviors[dataKey].onclick?.(range, target, event)
        editorContent.focus()
        if (correct) range.active()
        statusCheckCache = false
        onCursorMove(true)
    })
    const switchTask = key => {
        switch (key) {
            case 'Enter':   // 将顶层的 div 替换为 p
                return () => editorContent.querySelectorAll('&>div:not([data-id])')
                        .forEach(it => replaceElement(it, document.createElement('p')))
            case 'Backspace': case 'Delete':
                return () => {
                    if (editorContent.children.length === 1 && editorContent.firstChild.textContent.length === 0) {
                        statusCheckCache = false
                    }
                    syncButtonsStatus(editorTools, KRange.activated().item.startContainer)
                }
            case 'ArrowLeft': case 'ArrowRight': case 'ArrowUp': case 'ArrowDown':
                return () => onCursorMove()
        }
    }
    editorContent.addEventListener('mouseup', () => onCursorMove())
    editorContent.addEventListener('keyup', event => {
        const task = switchTask(event.key)
        if (task) setTimeout(task, 0)
    })
    editorContent.addEventListener('keydown', event => {
        switch (event.key) {
            case 'Enter':
                enterEvent(event)
                break
            case 'Backspace':
                deleteEvent(event)
                break
        }
    })
    container.addEventListener('cursor_move', event => {
        const {range, prevRange} = event
        if (range.endContainer !== prevRange?.endContainer) {
            syncButtonsStatus(editorTools, range.startContainer)
        }
    })
    registryBeforeInputEventListener(editorContent, event => {
        if (statusCheckCache) return
        statusCheckCache = true
        const range = KRange.activated().item
        if (!range.collapsed) return
        event.preventDefault()
        // noinspection JSUnresolvedReference
        const data = event.data
        const text = document.createTextNode(data)
        range.insertNode(text)
        const buttonList = compareBtnListStatusWith(editorTools, range.startContainer)
        if (!buttonList)
            return setCursorPositionAfter(text)
        const newRange = KRange.selectNodeContents(text)
        for (let child of buttonList) {
            const dataId = child.getAttribute('data-key')
            const behavior = behaviors[dataId]
            behavior.onclick(newRange, child, null)
        }
    })
}

/**
 * 上一刻鼠标光标所在的位置
 * @type {KRange}
 */
let prevCursor
function onCursorMove(skipEvent = false) {
    const range = KRange.activated()
    const inner = range.item
    const prev = prevCursor?.item
    if (prev && prev.endOffset === inner.endOffset && prev.endContainer === inner.endContainer)
        return
    if (!skipEvent) {
        const event = new Event('cursor_move')
        event.range = range
        event.prevRange = prevCursor
        KRICH_CONTAINER.dispatchEvent(event)
        if (event.defaultPrevented) return
    }
    prevCursor = range
}

/**
 * 删除事件，用于在引用中按下回车时代替浏览器默认动作
 * @param event {Event}
 */
function deleteEvent(event) {
    const range = KRange.activated().item
    if (!range.collapsed) return
    const {startOffset, startContainer} = range
    const blockquote = startContainer.parentElement
    // 当在编辑器开头按下删除键时阻止该动作，防止删掉空的 p 标签
    if (startOffset === 0 && startContainer.nodeName === 'P' && blockquote.firstChild === startContainer) {
        return event.preventDefault()
    }
    // 如果光标不在引用开头则直接退出
    if (startOffset !== 0 || blockquote.nodeName !== 'BLOCKQUOTE') return
    event.preventDefault()
    const html = blockquote.innerHTML
    const endIndex = html.indexOf('\n')
    const p = document.createElement('p')
    if (endIndex < 0) { // 如果引用只有一行，则直接取消引用
        replaceElement(blockquote, p)
    } else {
        p.innerHTML = endIndex === 0 ? '<br>' : html.substring(0, endIndex)
        blockquote.innerHTML = html.substring(endIndex + 1)
        blockquote.insertAdjacentElement('beforebegin', p)
    }
    setCursorPosition(p.firstChild, 0)
}

/**
 * 回车事件，用于在引用中按下回车时代替浏览器默认动作
 * @param event {Event}
 */
function enterEvent(event) {
    const kRange = KRange.activated()
    const range = kRange.item
    const name = 'BLOCKQUOTE'
    const lines = kRange.getAllTopElements()
    const firstBlockquote = lines.find(it => it.nodeName === name)
    if (!firstBlockquote) return
    event.preventDefault()
    const {startOffset} = range
    if (range.collapsed) {  // 如果没有选中任何内容，则直接键入换行
        let textContent = firstBlockquote.textContent
        if (startOffset >= textContent.length - 1 && textContent.endsWith('\n\n')) {
            firstBlockquote.textContent = textContent.substring(0, textContent.length - 1)
            const p = document.createElement('p')
            p.innerHTML = '<br>'
            firstBlockquote.insertAdjacentElement('afterend', p)
            return setCursorPosition(p.firstChild, 0)
        }
        let interval = ''
        if (!textContent.endsWith('\n')) interval = '\n'
        firstBlockquote.textContent = textContent.substring(0, startOffset) + '\n' + textContent.substring(startOffset) + interval
        setCursorPosition(firstBlockquote.firstChild, startOffset + 1)
    } else if (lines.length === 1) {    // 如果是范围选择并且限制在一个引用内，则删除选中的部分并替换为换行符
        const textContent = firstBlockquote.textContent
        firstBlockquote.textContent = textContent.substring(0, startOffset) + '\n' + textContent.substring(range.endOffset)
        setCursorPosition(firstBlockquote.firstChild, startOffset + 1)
    } else {    // 如果是范围选择并且跨越了多个标签
        const first = lines[0]
        if (first.nodeName === name) {
            first.textContent += first.textContent.endsWith('\n') ? '\n' : '\n\n'
            setCursorPosition(first.firstChild, first.textContent.length)
        } else if (startOffset === 0) {
            first.insertAdjacentHTML('beforebegin', '<p><br></p>')
            first.innerHTML = '<br>'
            setCursorPosition(first.firstChild, 0)
        } else {
            first.insertAdjacentHTML('afterend', '<p><br></p>')
            setCursorPosition(first.nextSibling.firstChild, 0)
        }
        for (let i = 1; i < lines.length; i++)
            lines[i].remove()
    }
}