// noinspection JSDeprecatedSymbols

import {KRICH_EDITOR, TOP_LIST} from '../vars/global-fileds'
import {
    eachDomTree,
    findParentTag, getFirstChildNode, getLastChildNode,
    insertAfterEnd,
    insertBefore,
    prevLeafNode, tryFixDom,
    zipTree
} from '../utils/dom'
import {
    createElement,
    getElementBehavior,
    isBrNode, isEmptyBodyElement, isEmptyLine, isKrichEditor, isListLine, isMarkerNode,
    isTextNode
} from '../utils/tools'
import {KRange, setCursorPositionAfter} from '../utils/range'
import {highlightCode} from '../utils/highlight'
import {editorRange, modifyEditorRange} from './range-monitor'
import {uploadImage} from '../utils/image-handler'
import {isMultiEleStruct, isTextArea} from '../types/button-behavior'

/**
 * 是否正在拖动元素
 * @param {boolean|undefined}
 */
export let isDragging

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
            if (isListLine(node) || isMarkerNode(node)) continue
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
     * @param isInside {boolean?} 数据来源是否是内部元素
     */
    async function handlePaste(range, dataTransfer, isInside) {
        const {types} = dataTransfer
        if (types.includes(KEY_HTML)) {
            const content = dataTransfer.getData(KEY_HTML)
                .replaceAll('\r', '')
                .replaceAll('\n', '<br>')
            const targetBody = htmlParser.parseFromString(content, KEY_HTML).querySelector('body')
            if (!isDragging) {    // 来自外部的内容要先进行转义
                translate(targetBody)
            }
            const lines = packLine(targetBody)
            if (!isDragging) {    // 来自外部的内容先压缩一遍
                lines.forEach(zipTree)
            }
            let realStart, tmpBox
            if (!range.collapsed) {
                // 如果 KRange 不是折叠状态，先移除选中的内容
                tmpBox = createElement('div', ['tmp'])
                range.surroundContents(tmpBox)
                realStart = prevLeafNode(tmpBox) ?? tmpBox.parentNode
                tmpBox.remove()
            }
            if (!realStart) realStart = range.realStartContainer()
            // 存储光标最终所在的位置
            const lastPos = getLastChildNode(lines[lines.length - 1])
            const firstNode = getFirstChildNode(lines[0])
            const updateOfflineData = () => {
                if (isEmptyBodyElement(lastPos)) {
                    offlineData = new KRange(lastPos)
                } else {
                    setCursorPositionAfter(lastPos)
                    offlineData = KRange.activated()
                }
                offlineData = offlineData.serialization()
            }
            let offlineData, pre = findParentTag(realStart, isTextArea)
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
                const first = lines[0]
                let offset = 0
                // 将首行折叠到目标位置
                if (!isEmptyBodyElement(first) && !isMultiEleStruct(first)) {
                    offset = 1
                    const [left, right] = range.splitNode(
                        findParentTag(realStart, it => it.parentNode === topLine)
                    )
                    const fun = left ? insertAfterEnd : insertBefore
                    fun(left ?? right, ...first.childNodes)
                }
                if (lines.length > offset)
                    insertAfterEnd(topLine, ...lines.splice(offset))
                updateOfflineData()
                zipTree(topLine)
            }
            if (!offlineData) updateOfflineData()
            if (pre) {
                // noinspection SillyAssignmentJS
                pre.textContent = pre.textContent
                await highlightCode(null, pre)
            }
            for (let it of lines) {
                if (it.nodeName === 'PRE') {
                    await highlightCode(null, it)
                } else {
                    for (let value of it.querySelectorAll('pre')) {
                        await highlightCode(null, value)
                    }
                }
            }
            if (isInside && editorRange.body) new KRange(firstNode).active()
            else KRange.deserialized(offlineData).active()
        } else if (types.includes(KEY_TEXT)) {
            range.insertText(dataTransfer.getData(KEY_TEXT))
        } else if (types.includes('Files')) {
            let pos = findParentTag(range.realStartContainer(), TOP_LIST)
            for (let file of dataTransfer.files) {
                if (!file.type.startsWith('image/')) continue
                const image = await uploadImage(file)
                if (isEmptyLine(pos))
                    pos.replaceWith(image)
                else
                    pos.insertAdjacentElement('afterend', image)
                pos = image
            }
            new KRange(pos).active()
        }
    }

    const htmlParser = new DOMParser()
    KRICH_EDITOR.addEventListener('paste', event => {
        event.preventDefault()
        // noinspection JSIgnoredPromiseFromCall
        handlePaste(editorRange, event.clipboardData)
    })
    KRICH_EDITOR.addEventListener('dragstart', event => {
        const target = event.target
        if (isEmptyBodyElement(target)) {
            modifyEditorRange(new KRange(target))
        }
        if ((editorRange.body && isMarkerNode(editorRange.body)) || // 选中代办列表的选择框时禁止拖动
            (editorRange.only(it => findParentTag(it, isTextArea))) // 当选区跨越文本域和非文本域时禁止拖动
        ) {
            event.preventDefault()
        } else {
            isDragging = true
        }
    })
    // noinspection JSUnresolvedReference
    const isIncompatible = !document.caretRangeFromPoint && !document.caretPositionFromPoint
    if (isIncompatible)
        console.warn('您的浏览器不支持 caretRangeFromPoint 和 caretPositionFromPoint，krich 无法定位您的鼠标位置，拖动功能将不可用！')
    KRICH_EDITOR.addEventListener('drop', async event => {
        event.preventDefault()
        if (isIncompatible) return
        const {clientX, clientY, dataTransfer} = event
        const isInsideCpy = isDragging
        let transfer = dataTransfer, tmpBox, offlineData, mergeList
        if (isInsideCpy) {
            console.assert(!!editorRange, '此时 editorRange 不可能为空')
            transfer = new DataTransfer()
            const range = KRange.clientPos(clientX, clientY)
            offlineData = range.serialization()
            tmpBox = createElement('div', ['tmp'])
            const ancestor = editorRange.commonAncestorContainer
            const isInTextArea = findParentTag(ancestor, isTextArea)
            let lca = KRange.lca(range.realStartContainer(), ancestor)
            if (isTextNode(lca)) lca = lca.parentNode
            editorRange.surroundContents(tmpBox, lca)
            let html
            if (isInTextArea) {
                html = tmpBox.textContent
            } else {
                const firstChild = tmpBox.firstChild
                if (tmpBox.childNodes.length === 1 && isListLine(firstChild)) {
                    firstChild.replaceWith(...firstChild.childNodes)
                    // 判断挪动之后是否需要合并列表
                    mergeList = true
                }
                html = tmpBox.innerHTML
            }
            // noinspection HtmlRequiredLangAttribute
            transfer.setData(KEY_HTML, '<html><body>' + html + '</body></html>')
        }
        const range = offlineData ? KRange.deserialized(offlineData) : KRange.clientPos(clientX, clientY)
        if (tmpBox) {
            if (mergeList) {
                const prev = tmpBox.previousSibling
                const next = tmpBox.nextSibling
                if (prev && next && isListLine(prev) && isListLine(next) && prev.firstChild.nodeName === next.firstChild.nodeName) {
                    // noinspection JSUnresolvedReference
                    prev.firstChild.append(...next.firstChild.childNodes)
                    next.remove()
                }
            }
            tmpBox.remove()
        }
        isDragging = false
        await handlePaste(range, transfer, isInsideCpy)
        tryFixDom()
    })
}