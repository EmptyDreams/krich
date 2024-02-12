import {KRICH_EDITOR, TOP_LIST} from '../vars/global-fileds'
import {
    findParentTag,
    getFirstTextNode,
    getLastTextNode,
    nextLeafNode, nextSiblingText,
    prevLeafNode,
    replaceElement,
    tryFixDom
} from '../utils/dom'
import {setCursorAt, setCursorPositionAfter, setCursorPositionBefore} from '../utils/range'
import {editorRange} from './range-monitor'
import {
    createNewLine, getElementBehavior,
    isEmptyLine,
    isMarkerNode,
    isMultiElementStructure
} from '../utils/tools'
import {insertTextToString} from '../utils/string-utils'
import {isTextAreaBehavior} from '../types/button-behavior'
import {closeHoverTip} from '../utils/hover-tip'

export function registryKeyboardEvent() {
    const switchTask = key => {
        switch (key) {
            case 'Enter':   // 将顶层的 div 替换为 p
                return () => KRICH_EDITOR.querySelectorAll('div:not([class])')
                    .forEach(it => replaceElement(it, document.createElement('p')))
            case 'Backspace': case 'Delete':
                return tryFixDom
        }
    }
    KRICH_EDITOR.addEventListener('keyup', event => {
        const task = switchTask(event.key)
        if (task) setTimeout(task, 0)
    })
    KRICH_EDITOR.addEventListener('keydown', event => {
        closeHoverTip()
        const body = editorRange?.body
        if (body) {
            emptyBodyElementKeyEvent(event, body)
        } else {
            switch (event.key) {
                case 'Enter':
                    enterEvent(event)
                    break
                case 'Backspace':
                    deleteEvent(event)
                    break
                case 'Tab':
                    tabEvent(event)
                    break
            }
        }
    })
}

/**
 * tab 事件
 * @param event{KeyboardEvent}
 */
function tabEvent(event) {
    event.preventDefault()
    editorRange.insertText('    ')
}

/**
 * 删除事件
 * @param event {KeyboardEvent}
 */
function deleteEvent(event) {
    const {startContainer, startOffset} = editorRange
    if (!editorRange.collapsed) return
    const realStartContainer = editorRange.realStartContainer()
    const pre = findParentTag(realStartContainer, ['PRE'])
    if (pre) {
        if (startContainer === realStartContainer && startOffset) return
        event.preventDefault()
        let list = pre.textContent.split('\n')
        if (list.length > 1 && !list[list.length - 1]) list.pop()
        list = list.map(it => {
            const line = createNewLine()
            if (it) line.textContent = it
            return line
        })
        list.forEach(it => pre.insertAdjacentElement('beforebegin', it))
        pre.remove()
        setCursorPositionBefore(list[0])
        return
    }
    if (startOffset) return
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
    const {
        startContainer,
        startOffset,
        collapsed
    } = editorRange
    const realStartContainer = editorRange.realStartContainer()
    const isFixStartContainer = startContainer !== realStartContainer
    const {shiftKey, ctrlKey} = event
    let element
    /**
     * 处理通用回车操作，包含：
     *
     * 1. `Shift Enter`: 直接跳转到下一行
     * 2. `Ctrl Enter`: 在当前顶层元素下方插入一个新行
     * 3. `Ctrl Shift Enter`: 在当前顶层元素的上方插入一个新行
     */
    function handleCommon() {
        if ((!shiftKey && !ctrlKey) || !collapsed) return
        event.preventDefault()
        const top = findParentTag(realStartContainer, TOP_LIST)
        console.assert(!!top, '未找到顶层元素', realStartContainer)
        if (shiftKey && !ctrlKey && isTextAreaBehavior(getElementBehavior(top)))
            return
        element = createNewLine()
        if (shiftKey && ctrlKey) {
            top.insertAdjacentElement('beforebegin', element)
        } else {
            top.insertAdjacentElement('afterend', element)
        }
    }
    handleCommon()
    /** 处理在 TextArea 中按回车的动作 */
    function handleTextAreaEnter() {
        const top = findParentTag(realStartContainer, TOP_LIST)
        if (!isTextAreaBehavior(getElementBehavior(top))) return
        event.preventDefault()
        if (!top.textContent.endsWith('\n')) {
            const {endOffset, endContainer} = editorRange
            getLastTextNode(top).textContent += '\n'
            editorRange.setStart(startContainer, startOffset)
            if (collapsed) editorRange.collapse(true)
            else endContainer.setEnd(endContainer, endOffset)
        }
        if (shiftKey) {
            let item = getFirstTextNode(realStartContainer)
            let index = isFixStartContainer ? 0 : startOffset
            while (true) {
                const text = item.textContent
                const nextLine = text.indexOf('\n', index)
                index = 0
                if (nextLine >= 0) {
                    item.textContent = insertTextToString(text, nextLine, '\n')
                    setCursorAt(item, nextLine + 1)
                    break
                }
                item = nextSiblingText(item)
            }
        } else {
            editorRange.insertText('\n')
        }
        return true
    }
    if (!element) {
        if (handleTextAreaEnter()) return
    }
    /** 处理在多元素结构中的回车动作 */
    function handleMesEnter() {
        const structure = findParentTag(
            startContainer, item => isMultiElementStructure(item)
        )
        if (!structure) return
        const lastChild = structure.lastChild
        const lastChildNodes = lastChild.childNodes
        const numCheckResult = lastChildNodes.length < 2 || (lastChildNodes.length < 3 && isMarkerNode(lastChildNodes[0]))
        if (numCheckResult && !lastChild.textContent && startContainer.contains(getLastTextNode(structure))) {
            /* 在多元素结构最后一个空行按下回车时自动退出 */
            event.preventDefault()
            if (structure.nodeName[0] === 'B') {
                element = lastChild
            } else {
                element = lastChild.lastChild
                lastChild.remove()
            }
            structure.insertAdjacentElement('afterend', element)
            if (!structure.firstChild) structure.remove()
        }
    }
    if (collapsed && !element) handleMesEnter()
    if (element) {
        setCursorPositionBefore(element)
    }
}

/**
 * 在 KRange 选中 EmptyBodyElement 时接管键盘操作
 * @param event {KeyboardEvent}
 * @param body {Element}
 */
function emptyBodyElementKeyEvent(event, body) {
    const key = event.key
    switch (key) {
        case 'ArrowLeft': case 'ArrowUp': {
            const prev = prevLeafNode(body)
            if (prev)
                setCursorPositionAfter(prev)
            break
        }
        case 'ArrowRight': case 'ArrowDown': {
            const next = nextLeafNode(body)
            if (next)
                setCursorPositionBefore(next)
            break
        }
        case 'Backspace': case 'Delete':
            if (!isMarkerNode(body)) {
                const priority = ['nextSibling', 'previousSibling']
                if (key[0] === 'B')
                    priority.reverse()
                let flag
                for (let info of priority) {
                    const sibling = body[info]
                    if (sibling) {
                        if (info[0] === 'n')
                            setCursorPositionBefore(sibling)
                        else
                            setCursorPositionAfter(sibling)
                        body.remove()
                        flag = true
                        break
                    }
                }
                if (!flag) {
                    const line = createNewLine()
                    body.replaceWith(line)
                    setCursorPositionBefore(line)
                }
            }
            break
        case 'Enter':
            if (!isMarkerNode(body)) {
                const line = createNewLine()
                const where = event.ctrlKey && event.altKey ? 'beforebegin' : 'afterend'
                body.insertAdjacentElement(where, line)
                setCursorPositionBefore(line)
            }
            break
        default:
            if (key.startsWith('F'))
                return
    }
    event.preventDefault()
}