import {behaviors, KRICH_EDITOR, markStatusCacheInvalid} from '../global-fileds'
import {findParentTag, getFirstTextNode, getLastTextNode, replaceElement} from '../utils/dom'
import {KRange, setCursorPosition, setCursorPositionAfter, setCursorPositionIn} from '../utils/range'
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
 * 删除事件
 * @param event {KeyboardEvent}
 */
function deleteEvent(event) {
    const range = KRange.activated().item
    if (!range.collapsed || range.startOffset !== 0) return
    const {startContainer} = range
    const topElement = findParentTag(startContainer, ['UL', 'OL', 'BLOCKQUOTE'])
    if (topElement && getFirstTextNode(topElement) === startContainer) {
        // 在引用、列表开头使用删除键时直接取消当前行的样式
        event.preventDefault()
        const element = topElement.firstElementChild
        topElement.insertAdjacentElement('beforebegin', element)
        element.outerHTML = element.outerHTML.match(/<p>.*<\/p>/)[0]
        setCursorPositionIn(topElement.previousSibling, 0)
        if (!topElement.firstChild) topElement.remove()
    } else if (getFirstTextNode(KRICH_EDITOR) === startContainer) {
        // 在编辑器开头按下删除键时屏蔽此次按键
        event.preventDefault()
    }
}

/**
 * 回车事件
 * @param event {KeyboardEvent}
 */
function enterEvent(event) {
    const range = KRange.activated().item
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