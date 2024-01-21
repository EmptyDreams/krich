import {KRICH_EDITOR, markStatusCacheInvalid} from '../global-fileds'
import {findParentTag, getLastTextNode, replaceElement} from '../utils/dom'
import {KRange, setCursorPosition, setCursorPositionAfter} from '../utils/range'
import {syncButtonsStatus} from '../utils/btn'
import {createElement} from '../utils/tools'

export function registryKeyboardEvent() {
    const switchTask = key => {
        switch (key) {
            case 'Enter':   // 将顶层的 div 替换为 p
                return () => KRICH_EDITOR.querySelectorAll('&>div:not([data-id])')
                    .forEach(it => replaceElement(it, document.createElement('p')))
            case 'Backspace': case 'Delete':
                return () => {
                    if (KRICH_EDITOR.children.length === 1 && KRICH_EDITOR.firstChild.textContent.length === 0) {
                        markStatusCacheInvalid()
                    }
                    syncButtonsStatus(KRange.activated().item.startContainer)
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
 * 回车事件
 * @param event {KeyboardEvent}
 */
function enterEvent(event) {
    const kRange = KRange.activated()
    const range = kRange.item
    if (!range.collapsed) return
    const {startContainer} = range
    let element
    const createLine = () => {
        element = createElement('p')
        element.innerHTML = '<br>'
    }
    if (event.shiftKey) {
        const pElement = findParentTag(startContainer, ['P'])
        if (pElement) { // 如果在 p 标签中按下 Shift + Enter，则直接创建新行且不将输入指针后的内容放置在新的一行中
            event.preventDefault()
            createLine()
            pElement.insertAdjacentElement('afterend', element)
        }
    } else {
        const blockquote = findParentTag(startContainer, ['BLOCKQUOTE'])
        if (blockquote) {   // 如果指针指向了引用结尾空行
            if (getLastTextNode(blockquote) === startContainer && !startContainer.textContent) {
                event.preventDefault()
                createLine()
                blockquote.insertAdjacentElement('afterend', element)
                blockquote.lastChild.remove()
            }
        }
    }
    if (element)
        setCursorPositionAfter(element)
}