// noinspection JSDeprecatedSymbols

import {KRICH_EDITOR, TOP_LIST} from '../vars/global-fileds'
import {
    eachDomTree,
    findParentTag, getFirstChildNode,
    getLastChildNode,
    insertAfterEnd,
    insertBefore,
    prevLeafNode,
    zipTree
} from '../utils/dom'
import {
    createElement,
    getElementBehavior,
    isBrNode, isEmptyBodyElement, isEmptyLine, isKrichEditor,
    isTextNode
} from '../utils/tools'
import {KRange} from '../utils/range'
import {highlightCode} from '../utils/highlight'
import {editorRange} from './range-monitor'

export function registryPasteEvent() {
    /**
     * 将 body 中所有内容通过 translator 转义为标准格式
     * @param body {Element}
     */
    function translate(body) {
        /** @type {Node|Element} */
        let node = body.firstChild
        /** @type {Node|Element|0} */
        let next = node
        while (true) {
            if (next === 0) break
            if (next) node = next
            next = node.firstChild ?? eachDomTree(node, true, false, () => true, body) ?? 0
            if (node.nodeName === 'LI') continue
            let behavior = getElementBehavior(node)
            if (!behavior) {
                if (!isTextNode(node)) {
                    if (node.hasChildNodes())
                        node.replaceWith(...node.childNodes)
                    else node.remove()
                }
                continue
            }
            let root, leaf
            while (behavior) {
                const newNode = behavior.translator(node)
                if (newNode === node) break
                if (newNode.firstChild) {
                    next = eachDomTree(node, true, false, _ => true, body) ?? 0
                    node.replaceWith(newNode)
                    root = null
                    break
                }
                if (leaf) leaf.append(newNode)
                else root = newNode
                leaf = newNode
                behavior = getElementBehavior(node)
            }
            if (root) {
                node.parentNode.insertBefore(root, node)
                // noinspection JSUnusedAssignment
                leaf.append(...node.childNodes)
            }
        }
    }

    /**
     * 按行封装
     * @param body {Element}
     */
    function packLine(body) {
        const result = []
        let line
        const submitLine = () => {
            if (line) {
                result.push(line)
                line = null
            }
        }
        for (let child of body.childNodes) {
            if (TOP_LIST.includes(child.nodeName)) {
                submitLine()
                result.push(child)
            } else {
                if (isBrNode(child)) {
                    submitLine()
                } else {
                    if (!line) line = createElement('p')
                    line.append(child)
                }
            }
        }
        if (line) result.push(line)
        return result
    }

    const KEY_HTML = 'text/html'
    const KEY_TEXT = 'text/plain'
    /**
     * 处理粘贴操作
     * @param range {KRange} 操作的区域
     * @param dataTransfer {DataTransfer} 粘贴的内容
     * @return {[KRange, KRange]|undefined} 插入的内容的起点和终点
     */
    function handlePaste(range, dataTransfer) {
        const {types} = dataTransfer
        const startRange = new KRange()
        const endRange = new KRange()
        if (types.includes(KEY_HTML)) {
            const content = dataTransfer.getData(KEY_HTML)
                .replaceAll('\r', '')
                .replaceAll('\n', '<br>')
            const targetBody = htmlParser.parseFromString(content, KEY_HTML).querySelector('body')
            translate(targetBody)
            const lines = packLine(targetBody)
            for (let line of lines) {
                zipTree(line)
            }
            let realStart, tmpBox
            if (!range.collapsed) {
                tmpBox = createElement('div', ['tmp'])
                range.surroundContents(tmpBox)
                realStart = prevLeafNode(tmpBox) ?? tmpBox.parentNode
                tmpBox.remove()
            }
            if (!realStart) realStart = range.realStartContainer()
            const resultStart = getFirstChildNode(lines[0])
            const resultEnd = getLastChildNode(lines[lines.length - 1])
            if (isKrichEditor(realStart)) {
                realStart.appendChild(...lines)
            } else if (isEmptyLine(realStart)) {
                realStart.replaceWith(...lines)
            } else if (isEmptyBodyElement(realStart)) {
                insertAfterEnd(realStart, ...lines)
            } else if (isBrNode(realStart)) {
                realStart.parentElement.replaceWith(...lines)
            } else {
                const topLine = findParentTag(realStart, TOP_LIST)
                const [left, right] = range.splitNode(
                    findParentTag(realStart, it => it.parentNode === topLine)
                )
                const first = lines.shift()
                const fun = left ? insertAfterEnd : insertBefore
                fun(left ?? right, ...(first.firstChild ? first.childNodes : [first]))
                zipTree(topLine)
                if (lines.length)
                    insertAfterEnd(topLine, ...lines)
            }
            lines.forEach(it => {
                if (it.nodeName === 'PRE') {
                    // noinspection JSIgnoredPromiseFromCall
                    highlightCode(null, it)
                } else {
                    it.querySelectorAll('pre')
                        .forEach(value => highlightCode(null, value))
                }
            })
            startRange.setStartBefore(resultStart)
            endRange.setEndAfter(resultEnd)
        } else if (types.includes(KEY_TEXT)) {
            const [node, startOffset, endOffset] = range.insertText(dataTransfer.getData(KEY_TEXT))
            startRange.setStart(node, startOffset)
            endRange.setEnd(node, endOffset)
        } else {
            return
        }
        startRange.collapse(true)
        endRange.collapse(false)
        return [startRange, endRange]
    }

    let isInside
    const htmlParser = new DOMParser()
    KRICH_EDITOR.addEventListener('paste', event => {
        event.preventDefault()
        const result = handlePaste(editorRange, event.clipboardData)
        if (result) result[1].active()
    })
    KRICH_EDITOR.addEventListener('dragstart', () => isInside = true)
    // noinspection JSUnresolvedReference
    const isIncompatible = !document.caretRangeFromPoint && !document.caretPositionFromPoint
    KRICH_EDITOR.addEventListener('drop', event => {
        event.preventDefault()
        if (isIncompatible) return
        const {clientX, clientY, dataTransfer} = event
        const isInsideCpy = isInside
        isInside = false
        let tmpBox
        let transfer = dataTransfer
        if (isInsideCpy) {
            console.assert(!!editorRange, '此时 editorRange 不可能为空')
            tmpBox = createElement('span')
            editorRange.surroundContents(tmpBox)
            // noinspection HtmlRequiredLangAttribute
            const html = '<html><body>' + tmpBox.innerHTML + '</body></html>'
            transfer = new DataTransfer()
            transfer.setData(KEY_HTML, html)
        }
        handlePaste(KRange.clientPos(clientX, clientY), transfer)
        KRange.clientPos(clientX, clientY).active()
        if (tmpBox) tmpBox.remove()
    })
}