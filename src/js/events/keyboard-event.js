import {KRICH_EDITOR, markStatusCacheInvalid, TOP_LIST} from '../vars/global-fileds'
import {findParentTag, getFirstTextNode, getLastTextNode, replaceElement, tryFixDom} from '../utils/dom'
import {setCursorPositionAfter, setCursorPositionBefore} from '../utils/range'
import {syncButtonsStatus} from '../utils/btn'
import {editorRange} from './range-monitor'
import {createNewLine, getElementBehavior, isEmptyLine, isMultiElementStructure} from '../utils/tools'

export function registryKeyboardEvent() {
    const switchTask = key => {
        switch (key) {
            case 'Enter':   // 将顶层的 div 替换为 p
                return () => KRICH_EDITOR.querySelectorAll('div:not([class])')
                    .forEach(it => replaceElement(it, document.createElement('p')))
            case 'Backspace': case 'Delete':
                return () => {
                    tryFixDom()
                    if (KRICH_EDITOR.children.length === 1 && !KRICH_EDITOR.firstChild.textContent) {
                        markStatusCacheInvalid()
                    }
                    syncButtonsStatus(editorRange.startContainer)
                }
        }
    }
    KRICH_EDITOR.addEventListener('keyup', event => {
        const task = switchTask(event.key)
        if (task) setTimeout(task, 0)
    })
    KRICH_EDITOR.addEventListener('keydown', event => {
        const body = editorRange?.body
        const {key} = event
        if (body) {
            event.preventDefault()
            switch (key) {
                case 'ArrowLeft': case 'ArrowUp':
                    if (body.previousSibling)
                        setCursorPositionAfter(body.previousSibling)
                    break
                case 'ArrowRight': case 'ArrowDown':
                    if (body.nextSibling)
                        setCursorPositionBefore(body.nextSibling)
                    break
                case 'Backspace': case 'Delete':
                    if (key[0] === 'B' && body.previousSibling) {
                        setCursorPositionAfter(body.previousSibling)
                    } else {
                        setCursorPositionBefore(body.nextSibling)
                    }
                    body.remove()
                    break
                case 'Enter':
                    const line = createNewLine()
                    const where = event.shiftKey ? 'afterend' : 'beforebegin'
                    body.insertAdjacentElement(where, line)
                    setCursorPositionAfter(line)
                    break
            }
        } else {
            switch (key) {
                case 'Enter':
                    enterEvent(event)
                    break
                case 'Backspace':
                    deleteEvent(event)
                    break
            }
        }
    })
}

/**
 * 删除事件
 * @param event {KeyboardEvent}
 */
function deleteEvent(event) {
    const range = editorRange
    if (!range.collapsed || range.startOffset !== 0) return
    const {startContainer} = range
    const topElement = findParentTag(startContainer, isMultiElementStructure)
    if (topElement && startContainer.contains(getFirstTextNode(topElement))) {
        // 在引用、列表开头使用删除键时直接取消当前行的样式
        event.preventDefault()
        const element = topElement.firstElementChild
        topElement.insertAdjacentElement('beforebegin', element)
        element.outerHTML = element.outerHTML.match(/<p>.*<\/p>/)[0]
        setCursorPositionBefore(topElement.previousSibling)
        if (!topElement.firstChild) topElement.remove()
    } else if (isEmptyLine(startContainer)) {
        const firstTopNode = KRICH_EDITOR.firstChild
        if (firstTopNode === startContainer) {
            // 在编辑器开头按下删除键时屏蔽此次按键
            event.preventDefault()
        } else {
            const parent = findParentTag(startContainer.parentNode, TOP_LIST)
            if (parent && isMultiElementStructure(parent) && parent.childElementCount < 2 && firstTopNode === parent) {
                event.preventDefault()
                parent.replaceWith(startContainer)
                setCursorPositionAfter(startContainer)
            }
        }
    }
}

/**
 * 回车事件
 * @param event {KeyboardEvent}
 */
function enterEvent(event) {
    const range = editorRange
    if (!range.collapsed) return
    const {startContainer} = range
    let element
    if (event.shiftKey) {
        const pElement = findParentTag(startContainer, ['P'])
        if (pElement) { // 如果在 p 标签中按下 Shift + Enter，则直接创建新行且不将输入指针后的内容放置在新的一行中
            event.preventDefault()
            element = createNewLine()
            pElement.insertAdjacentElement('afterend', element)
        }
    } else {
        const structure = findParentTag(
            startContainer, item => isMultiElementStructure(item)
        )
        if (!structure) return
        const lastChild = structure.lastChild
        if (!lastChild.textContent && startContainer.contains(getLastTextNode(structure))) {
            /* 在多元素结构最后一个空行按下回车时自动退出 */
            event.preventDefault()
            if (structure.nodeName[0] === 'B') {
                element = lastChild
            } else {
                element = lastChild.lastChild
                lastChild.remove()
            }
            let inserted = element
            const parent = findParentTag(structure.parentNode, TOP_LIST)
            if (parent) {
                const behavior = getElementBehavior(parent)
                if (behavior.multi) {
                    const newLine = behavior.newLine()
                    if (newLine) {
                        newLine.append(element)
                        inserted = newLine
                    }
                }
            }
            structure.insertAdjacentElement('afterend', inserted)
            if (!structure.firstChild) structure.remove()
        }
    }
    if (element) {
        setCursorPositionBefore(element)
    }
}