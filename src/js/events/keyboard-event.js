import {KRICH_EDITOR, TOP_LIST} from '../vars/global-fileds'
import {
    findParentTag,
    getFirstTextNode,
    getLastTextNode,
    nextLeafNode,
    prevLeafNode,
    replaceElement,
    tryFixDom
} from '../utils/dom'
import {KRange, setCursorPositionAfter, setCursorPositionBefore} from '../utils/range'
import {editorRange} from './range-monitor'
import {
    createNewLine, getElementBehavior,
    isEmptyLine,
    isMarkerNode,
    isMultiElementStructure
} from '../utils/tools'
import {insertTextToString, replaceStringByIndex} from '../utils/string-utils'

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
    const pre = findParentTag(range.realStartContainer(), ['PRE'])
    if (pre) {
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
        startOffset, endOffset,
        collapsed
    } = editorRange
    const realStartContainer = editorRange.realStartContainer()
    const {shiftKey, ctrlKey} = event
    let element
    function setCursorAt(node, index) {
        getSelection().collapse(node, index)
    }
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
        if (shiftKey && !ctrlKey && getElementBehavior(top).textArea) {
            let text = top.textContent
            if (!text.endsWith('\n')) text += '\n'
            const index = text.indexOf('\n', startOffset) + 1
            top.textContent = insertTextToString(text, index, '\n')
            setCursorAt(top, index + 1)
            return true
        }
        element = createNewLine()
        if (shiftKey) {
            top.insertAdjacentElement('beforebegin', element)
        } else {
            top.insertAdjacentElement('afterend', element)
        }
    }
    if (handleCommon()) return
    /** 处理在 TextArea 中按回车的动作 */
    function handleTextAreaEnter() {
        const top = findParentTag(realStartContainer, TOP_LIST)
        if (!getElementBehavior(top).textArea) return
        event.preventDefault()
        let text = top.textContent
        if (!text.endsWith('\n')) text += '\n'
        top.textContent = replaceStringByIndex(text, startOffset, endOffset, '\n')
        setCursorAt(top, startOffset + 1)
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
                if (key[0] === 'B' && body.previousSibling) {
                    setCursorPositionAfter(body.previousSibling)
                } else {
                    setCursorPositionBefore(body.nextSibling)
                }
                body.remove()
            }
            break
        case 'Enter':
            if (!isMarkerNode(body)) {
                const line = createNewLine()
                const where = event.shiftKey ? 'afterend' : 'beforebegin'
                body.insertAdjacentElement(where, line)
                setCursorPositionAfter(line)
            }
            break
        default:
            if (key.startsWith('F'))
                return
    }
    event.preventDefault()
}