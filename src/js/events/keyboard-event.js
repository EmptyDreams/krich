import {KRICH_CONTAINER, KRICH_EDITOR, KRICH_HOVER_TIP, markStatusCacheInvalid, TOP_LIST} from '../vars/global-fileds'
import {
    findParentTag,
    getFirstTextNode,
    getLastTextNode,
    nextLeafNode, nextSiblingText,
    prevLeafNode, replaceElement,
    tryFixDom, zipTree
} from '../utils/dom'
import {setCursorAt, setCursorPositionAfter, setCursorPositionBefore} from '../utils/range'
import {editorRange} from './range-monitor'
import {
    createNewLine, getElementBehavior, isCommonLine, isEmptyBodyElement,
    isEmptyLine, isListLine,
    isMarkerNode, waitTime
} from '../utils/tools'
import {insertTextToString} from '../utils/string-utils'
import {isMultiEleStruct, isTextArea} from '../types/button-behavior'
import {closeHoverTip, updateHoverTipPosition} from '../utils/hover-tip'
import {handleHotkeys} from '../hotkeys'

export function registryKeyboardEvent() {
    KRICH_EDITOR.addEventListener('keyup', async event => {
        await waitTime(0)
        switch (event.code) {
            case 'Enter':   // 将顶层的 div 替换为 p
                return () => KRICH_EDITOR.querySelectorAll('div:not([class])')
                    .forEach(it => replaceElement(it, document.createElement('p')))
            case 'Backspace': case 'Delete':
                return markStatusCacheInvalid
        }
    })
    KRICH_EDITOR.addEventListener('keydown', async event => {
        const body = editorRange?.body
        if (body) {
            emptyBodyElementKeyEvent(event, body)
        } else {
            switch (event.code) {
                case 'Enter': case 'NumpadEnter':
                    enterEvent(event)
                    break
                case 'Backspace':
                    deleteEvent(event)
                    break
                case 'Tab':
                    tabEvent(event)
                    break
                default:
                    handleHotkeys(event)
                    return
            }
        }
        await waitTime(0)
        // noinspection JSUnresolvedReference
        if (KRICH_HOVER_TIP.tip && !editorRange.some(it => findParentTag(it, isTextArea))) {
            closeHoverTip()
        } else {
            updateHoverTipPosition()
        }
    })
    KRICH_CONTAINER.addEventListener('keydown', event => {
        if (event.code === 'Escape')
            closeHoverTip()
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
    const {startContainer, startOffset, collapsed} = editorRange
    if (!collapsed) {
        event.preventDefault()
        editorRange.insertText('')
        tryFixDom()
        return
    }
    const realStartContainer = editorRange.realStartContainer()
    const textArea = findParentTag(realStartContainer, isTextArea)
    if (textArea) {
        if (startContainer === realStartContainer && startOffset) return
        event.preventDefault()
        let list = textArea.textContent.split('\n')
        if (list.length > 1 && !list[list.length - 1]) list.pop()
        list = list.map(it => {
            const line = createNewLine()
            if (it) line.textContent = it
            return line
        })
        list.forEach(it => textArea.before(it))
        textArea.remove()
        setCursorPositionBefore(list[0])
        return
    }
    if (startOffset) return
    const topElement = findParentTag(startContainer, isMultiEleStruct)
    if (topElement) {
        if (realStartContainer === getFirstTextNode(topElement)) {
            // 在引用、列表开头使用删除键时直接取消当前行的样式
            event.preventDefault()
            const line = topElement.firstChild
            if (isMarkerNode(line.firstChild))
                line.firstChild.remove()
            topElement.before(...line.childNodes)
            line.remove()
            setCursorPositionBefore(topElement.previousSibling)
            if (!topElement.firstChild) topElement.remove()
        } else {
            const prev = prevLeafNode(startContainer, true)
            if (prev && isMarkerNode(prev)) {
                // 修正在代办列表开头按 backspace 的行为
                event.preventDefault()
                const listLine = findParentTag(startContainer, isListLine)
                const prevLine = listLine.previousSibling
                const lastSonLine = prevLine.lastChild
                let pos = lastSonLine.lastChild
                if (isMarkerNode(listLine.firstChild))
                    listLine.firstChild.remove()
                const firstSonLine = listLine.firstChild
                if (!isEmptyBodyElement(firstSonLine)) {
                    pos.after(...firstSonLine.childNodes)
                    firstSonLine.remove()
                }
                lastSonLine.after(...listLine.childNodes)
                const range = setCursorPositionAfter(pos, false)
                const offlineData = range.serialization()
                listLine.remove()
                // noinspection JSCheckFunctionSignatures
                zipTree(prevLine)
                range.deserialized(offlineData).active()
            }
        }
    } else if (isEmptyLine(startContainer)) {
        if (startContainer === KRICH_EDITOR.firstChild) {
            // 在编辑器开头按下删除键时屏蔽此次按键
            event.preventDefault()
            if (!isCommonLine(startContainer)) {
                const line = createNewLine()
                // noinspection JSCheckFunctionSignatures
                startContainer.replaceWith(line)
                setCursorPositionBefore(line)
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
        if (shiftKey && !ctrlKey && isTextArea(top)) return
        element = createNewLine()
        if (shiftKey && ctrlKey) {
            top.before(element)
        } else {
            top.after(element)
        }
    }
    handleCommon()
    /** 处理在 TextArea 中按回车的动作 */
    function handleTextAreaEnter() {
        const top = findParentTag(realStartContainer, TOP_LIST)
        if (!isTextArea(top)) return
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
        const structure = findParentTag(startContainer, isMultiEleStruct)
        if (!structure) return
        const lastChild = structure.lastChild
        const lastChildNodes = lastChild.childNodes
        const numCheckResult = lastChildNodes.length < 2 || (lastChildNodes.length < 3 && isMarkerNode(lastChildNodes[0]))
        let li
        if (numCheckResult && !lastChild.textContent && startContainer.contains(getLastTextNode(structure))) {
            /* 在多元素结构最后一个空行按下回车时自动退出 */
            event.preventDefault()
            if (structure.nodeName[0] === 'B') {
                element = lastChild
            } else {
                element = lastChild.lastChild
                lastChild.remove()
            }
            structure.after(element)
            if (!structure.firstChild) structure.remove()
        } else if (
            isEmptyLine(startContainer) &&
            startContainer === (li = findParentTag(startContainer, ['LI']))?.lastChild
        ) {
            /* 在多元素某一个子行的最后一个空白行按回车时将当前行替换为列表的子行 */
            event.preventDefault()
            element = startContainer
            const newLine = getElementBehavior(structure).newLine()
            console.assert(!!newLine, '进入到这里应当必然存在 newLine 的值')
            newLine.append(element)
            // noinspection JSCheckFunctionSignatures
            li.after(newLine)
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
    const key = event.code
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
                if (event.ctrlKey && event.altKey) {
                    body.before(line)
                } else {
                    body.after(line)
                }
                setCursorPositionBefore(line)
            }
            break
        default:
            if (key.startsWith('F'))
                return
    }
    event.preventDefault()
}