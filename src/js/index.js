import krichStyle from '../resources/css/main.styl'

import './behavior'
import {
    behaviors,
    DATA_ID,
    initContainerQuery,
    KRICH_EDITOR,
    SELECT_VALUE
} from './global-fileds'
import {
    KRange,
    setCursorPosition
} from './range'
import {registryBeforeInputEventListener} from './events/before-input'
import {replaceElement} from './utils/dom'
import {compareBtnListStatusWith, syncButtonsStatus} from './utils/btn'
import {getElementBehavior} from './utils/tools'
import {handleTemplate} from './utils/template'

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
    }
    // 标记是否已经对比过按钮状态和文本状态
    let statusCheckCache = true
    editorTools.addEventListener('click', event => {
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
        const classList = target.classList
        if (classList.contains('select')) {
            classList.toggle('show')
            if (!original.classList.contains('item')) {
                target.onblur = () => classList.remove('show')
                return
            }
            target.getElementsByTagName('span')[0].innerHTML = original.innerHTML
            const value = original.getAttribute(SELECT_VALUE)
            target.setAttribute(SELECT_VALUE, value)
        } else {
            target.classList.toggle('active')
            if (getElementBehavior(target).noStatus) {
                setTimeout(() => target.classList.remove('active'), 333)
            }
        }
        const range = KRange.activated()
        const correct = behaviors[dataKey].onclick?.(range, target, event)
        editorContent.focus()
        if (correct) range.active()
        statusCheckCache = false
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
        }
    }
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
    let prevRange
    document.addEventListener('selectionchange', () => {
        const range = KRange.activated().item
        if (!range.collapsed) {
            const lca = range.commonAncestorContainer
            syncButtonsStatus(editorTools, lca.firstChild ?? lca)
            prevRange = null
        } else if (range.endContainer !== prevRange?.endContainer) {
            syncButtonsStatus(editorTools, range.startContainer)
            prevRange = range
        }
    })
    registryBeforeInputEventListener(editorContent, event => {
        // noinspection JSUnresolvedReference
        const data = event.data
        if (statusCheckCache || !data) return
        statusCheckCache = true
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

/**
 * 删除事件，用于在引用中按下 backspace 时代替浏览器默认动作
 * @param event {Event}
 */
function deleteEvent(event) {
    const range = KRange.activated().item
    if (!range.collapsed) return
    const {startOffset, startContainer} = range
    const blockquote = startContainer.parentElement
    // 当在编辑器开头按下删除键时阻止该动作，防止删掉空的 p 标签
    if (startOffset === 0 && KRICH_EDITOR.firstChild === blockquote && blockquote.textContent.length === 0) {
        event.preventDefault()
        if (blockquote.nodeName !== 'P')
            blockquote.outerHTML = '<p><br></p>'
        return
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
    const lines = kRange.getAllTopElements()
    const firstBlockquote = lines.find(it => it.nodeName === 'BLOCKQUOTE')
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
        if (first.nodeName === 'BLOCKQUOTE') {
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