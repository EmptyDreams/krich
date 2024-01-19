import {KRICH_EDITOR, KRICH_TOOL_BAR, statusCheckCache} from '../global-fileds'
import {replaceElement} from '../utils/dom'
import {KRange, setCursorPosition} from '../utils/range'
import {syncButtonsStatus} from '../utils/btn'

export function registryKeyboardEvent() {
    const switchTask = key => {
        switch (key) {
            case 'Enter':   // 将顶层的 div 替换为 p
                return () => KRICH_EDITOR.querySelectorAll('&>div:not([data-id])')
                    .forEach(it => replaceElement(it, document.createElement('p')))
            case 'Backspace': case 'Delete':
                return () => {
                    if (KRICH_EDITOR.children.length === 1 && KRICH_EDITOR.firstChild.textContent.length === 0) {
                        statusCheckCache = false
                    }
                    syncButtonsStatus(KRICH_TOOL_BAR, KRange.activated().item.startContainer)
                }
        }
    }
    KRICH_EDITOR.addEventListener('keyup', event => {
        const task = switchTask(event.key)
        if (task) setTimeout(task, 0)
    })
    KRICH_EDITOR.addEventListener('keydown', event => {
        switch (event.key) {
            case 'Enter':
                enterEvent(event)
                break
            case 'Backspace':
                deleteEvent(event)
                break
        }
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