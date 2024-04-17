// noinspection JSDeprecatedSymbols

import {KRICH_EDITOR, TOP_LIST} from '../vars/global-fileds'
import {
    eachDomTree,
    findParentTag,
    getFirstChildNode,
    getLastChildNode, nextLeafNode,
    prevLeafNode,
    tryFixDom,
    zipTree
} from '../utils/dom'
import {
    createElement, createNewLine, equalsKrichNode,
    getElementBehavior,
    isBrNode,
    isEmptyBodyElement,
    isEmptyLine,
    isKrichEditor,
    isListLine,
    isMarkerNode,
    isTextNode
} from '../utils/tools'
import {KRange, setCursorPositionAfter, setCursorPositionBefore} from '../utils/range'
import {highlightCode} from '../utils/highlight'
import {editorRange, modifyEditorRange} from './range-monitor'
import {isMultiEleStruct, isTextArea} from '../types/button-behavior'
import {readImageToBase64} from '../utils/string-utils'

/**
 * 是否正在拖动元素
 * @param {boolean|undefined}
 */
export let isDragging

export const TRANSFER_KEY_HTML = 'text/html'
const TRANSFER_KEY_TEXT = 'text/plain'

/** 注册粘贴和拖动事件 */
export function registryPasteEvent() {
    KRICH_EDITOR.addEventListener('paste', event => {
        event.preventDefault()
        if (!isForbidPaste(editorRange)) {
            // noinspection JSIgnoredPromiseFromCall
            handlePaste(editorRange, event.clipboardData)
        }
    })
    KRICH_EDITOR.addEventListener('dragstart', async event => {
        const target = event.target
        if (isEmptyBodyElement(target)) {
            modifyEditorRange(new KRange(target))
        }
        if (isForbidDrag(editorRange)) {
            event.preventDefault()
        } else {
            isDragging = true
            await copyContentToTransfer(event.dataTransfer)
        }
    })
    KRICH_EDITOR.addEventListener('dragend', () => isDragging = false)
    KRICH_EDITOR.addEventListener('dragover', event => {
        const element = isForbidPaste(readRangeFromEvent(event))
        if (element) {
            // noinspection JSCheckFunctionSignatures
            element.setAttribute('contenteditable', false)
        }
    })
    KRICH_EDITOR.addEventListener('dragleave', event => {
        const target = event.target
        if (!isKrichEditor(target)) {
            target.removeAttribute?.('contenteditable')
        }
    })
    // noinspection JSUnresolvedReference
    const isIncompatible = !document.caretRangeFromPoint && !document.caretPositionFromPoint
    if (isIncompatible)
        console.warn('您的浏览器不支持 caretRangeFromPoint 和 caretPositionFromPoint，krich 无法定位您的鼠标位置，拖动功能将不可用！')
    KRICH_EDITOR.addEventListener('drop', async event => {
        event.preventDefault()
        if (isIncompatible) return
        const clientPos = readRangeFromEvent(event)
        const transfer = new DataTransfer()
        let offlineData
        async function handle() {
            const isInsideCpy = isDragging
            const range = offlineData ? KRange.deserialized(offlineData) : clientPos
            await handlePaste(range, transfer, isInsideCpy)
        }
        if (isDragging) {  // 如果内容是从编辑区复制过来的，则手动提取内容
            const range = KRange.activated()
            // 定位鼠标拖动到的位置
            offlineData = clientPos.serialization()
            // 被拖动的内容的最近公共祖先
            const ancestor = range.body ?? range.commonAncestorContainer
            let nearlyTopLine = findParentTag(ancestor, TOP_LIST) ?? KRICH_EDITOR
            if (isEmptyBodyElement(nearlyTopLine) || isListLine(nearlyTopLine.firstChild)) {
                nearlyTopLine = nearlyTopLine.parentElement
            }
            await range.extractContents(nearlyTopLine, true, tmpBox => {
                if (isTextArea(nearlyTopLine)) {    // 如果内容是从 TextArea 中拖动出来的，则当作纯文本处理
                    transfer.setData(TRANSFER_KEY_TEXT, tmpBox.textContent)
                } else {
                    writeElementToTransfer(transfer, tmpBox)
                }
                return handle()
            })
        } else {
            await handle()
        }
        tryFixDom()
    })
    KRICH_EDITOR.addEventListener('copy', async event => {
        event.preventDefault()
        if (!editorRange.collapsed)
            await copyContentToTransfer(event.clipboardData)
    })
    KRICH_EDITOR.addEventListener('cut', async event => {
        event.preventDefault()
        if (editorRange.collapsed) return
        const transfer = event.clipboardData
        transfer.types.forEach(it => transfer.clearData(it))
        await editorRange.extractContents(KRICH_EDITOR, true, tmpBox => {
            writeElementToTransfer(transfer, tmpBox)
            const prev = prevLeafNode(tmpBox)
            if (prev) setCursorPositionAfter(prev)
            else {
                const next = nextLeafNode(tmpBox)
                if (next) {
                    setCursorPositionBefore(next)
                }
                const newLine = createNewLine()
                KRICH_EDITOR.prepend(newLine)
                setCursorPositionBefore(newLine)
            }
        })
    })
}

/**
 * 将选区数据拷贝到 transfer
 * @param transfer {DataTransfer}
 * @return {Promise<void>}
 */
async function copyContentToTransfer(transfer) {
    const offline = editorRange.serialization()
    const content = await editorRange.cloneContents(editorRange.commonAncestorContainer)
    writeElementToTransfer(transfer, content)
    KRange.deserialized(offline).active()
}

/**
 * 将 element 写入到 transfer 中
 * @param transfer {DataTransfer}
 * @param element {Element}
 */
function writeElementToTransfer(transfer, element) {
    transfer.clearData()
    transfer.setData(TRANSFER_KEY_HTML, element.innerHTML)
    transfer.setData(TRANSFER_KEY_TEXT, element.textContent)
}

/**
 * 从 Event 中读取 client 坐标对应的 KRange
 * @param event {DragEvent}
 */
function readRangeFromEvent(event) {
    const {clientX, clientY} = event
    return KRange.clientPos(clientX, clientY)
}

/**
 * 判断指定位置是否禁止拖动
 * @param range {KRange}
 */
function isForbidDrag(range) {
    const {body, commonAncestorContainer} = range
    if ((body && isMarkerNode(body)) || // 选中代办列表的选择框时禁止拖动
        (range.only(it => findParentTag(it, isTextArea)))   // 当选区跨越文本域和非文本域时禁止拖动
    ) {
        return true
    }
    const link = findParentTag(commonAncestorContainer, ['A'])
    return link && !range.isCompleteInclude(link)
}

/**
 * 判断指定位置是否禁止粘贴内容
 * @param range {KRange}
 * @return {Element|undefined}
 */
function isForbidPaste(range) {
    return findParentTag(range.startContainer, ['A'])
}

/**
 * 将指定节点转化为文本插入到 textArea 中
 * @param range {KRange}
 * @param textArea {Element}
 * @param node {Node}
 */
async function insertTextToTextArea(range, textArea, node) {
    range.insertText(node.textContent, true)
    await highlightCode(range, textArea)
}

/**
 * 将 body 中所有内容通过 translator 转义为标准格式
 * @param body {Element}
 */
async function translate(body) {
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
            /** @type {Node|Element} */
            const newNode = await behavior.translator(node)
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
            node.before(root)
            // noinspection JSUnusedAssignment
            leaf.append(...node.childNodes)
        }
    }
}

const htmlParser = new DOMParser()

/**
 * 处理粘贴操作
 * @param range {KRange} 操作的区域
 * @param dataTransfer {DataTransfer} 粘贴的内容
 * @param isInside {boolean?} 数据来源是否是内部元素
 */
export async function handlePaste(range, dataTransfer, isInside) {
    isDragging = false  // 取消拖动标记，使得函数能够修改 editorRange
    const {types} = dataTransfer
    if (types.includes(TRANSFER_KEY_HTML)) {
        const content = dataTransfer.getData(TRANSFER_KEY_HTML)
            .replaceAll('<o:p></o:p>', '')
            .replaceAll(/[\r\n]*/g, '')
        const html = htmlParser.parseFromString(content, TRANSFER_KEY_HTML)
        const targetBody = html.body
        let realStart = range.realStartContainer()
        const textArea = findParentTag(realStart, isTextArea)
        if (textArea) {
            await insertTextToTextArea(range, textArea, targetBody)
            return
        }
        if (!isInside) {    // 来自外部的内容先进行转义
            await translate(targetBody)
        }
        const lines = packLine(targetBody)
        if (!isInside) {    // 来自外部的内容先压缩一遍
            lines.forEach(zipTree)
        }
        let tmpBox
        if (!range.collapsed) {
            // 如果 KRange 不是折叠状态，先移除选中的内容
            tmpBox = createElement('div', ['tmp'])
            range.surroundContents(tmpBox)
            realStart = prevLeafNode(tmpBox) ?? tmpBox.parentNode
            tmpBox.remove()
        }
        // 存储光标最终所在的位置
        const lastPos = getLastChildNode(lines[lines.length - 1])
        const firstNode = getFirstChildNode(lines[0])
        let offlineData
        /** 更新 `offlineData` 数据 */
        const updateOfflineData = () => {
            offlineData = setCursorPositionAfter(lastPos, false).serialization()
        }
        if (isKrichEditor(realStart)) { // 如果拖动到了没有标签的地方，说明拖动到了尾部
            // noinspection JSCheckFunctionSignatures
            realStart.appendChild(...lines)
        } else if (isEmptyLine(realStart)) {    // 如果拖动到了空白行则直接替换
            // noinspection JSCheckFunctionSignatures
            realStart.replaceWith(...lines)
        } else if (isEmptyBodyElement(realStart)) { // 如果拖动到了 EBE 则在其后方插入
            realStart.after(...lines)
        } else if (isBrNode(realStart)) {   // 如果拖动到了 br 上则替换其父元素
            realStart.parentElement.replaceWith(...lines)
        } else {    // 否则在当前位置插入
            const topLine = findParentTag(realStart, TOP_LIST)
            /**
             * 判断一个节点是否应该嵌入到行中
             * @param item {Node}
             * @return {boolean}
             */
            const isMergeInLine = item => !isEmptyBodyElement(item) && !isMultiEleStruct(item)
            const first = lines[0]
            const topLineParent = topLine.parentElement
            // 当把列表插入到列表中时，直接提取其中的 li 标签
            if (lines.length === 1 && isMultiEleStruct(first) && equalsKrichNode(first, topLineParent.parentNode)) {
                const childNodes = first.childNodes
                if (!range.startOffset && getFirstChildNode(range.startContainer) === getFirstChildNode(topLineParent)) {
                    topLineParent.before(...childNodes)
                } else {
                    topLineParent.after(...childNodes)
                }
            } else if (lines.length > 1 || !isMergeInLine(first)) { // 当插入内容有多行或插入的内容不可嵌入到行中时执行通用插入方式
                const last = lines[lines.length - 1]
                const [left, right] = range.splitNode(topLine)
                if (right && isMergeInLine(last)) { // 尝试向右侧行前嵌入内容
                    lines.pop()
                    right.prepend(...last.childNodes)
                }
                if (left && isMergeInLine(first)) { // 尝试向左侧行结尾嵌入内容
                    lines.shift()
                    left.append(...first.childNodes)
                }
                // 将剩余的行插入到 left 和 right 之间
                if (left) left.after(...lines)
                else right.before(...lines)
                updateOfflineData()
                if (left) zipTree(left)
                if (right) zipTree(right)
            } else {    // 当插入内容只有一行且可嵌入时将内容嵌入到当前行
                const [left, right] = range.splitNode(
                    findParentTag(realStart, it => it.parentNode === topLine)
                )
                if (left) { // 如果左侧存在则优先将内容插入到左侧
                    left.after(...first.childNodes)
                } else {
                    right.before(...first.childNodes)
                }
                updateOfflineData()
                zipTree(topLine)
            }
        }
        if (!offlineData) updateOfflineData()
        if (isInside && editorRange.body) new KRange(firstNode).active()
        else KRange.deserialized(offlineData).active()
    } else if (types.includes(TRANSFER_KEY_TEXT)) {
        const content = dataTransfer.getData(TRANSFER_KEY_TEXT)
            .replaceAll(/[\r\n]+/g, '<br>')
        const transfer = new DataTransfer()
        transfer.setData(TRANSFER_KEY_HTML, content)
        await handlePaste(range, transfer, isInside)
    } else if (types.includes('Files')) {
        let pos = findParentTag(range.realStartContainer(), TOP_LIST)
        for (let file of dataTransfer.files) {
            if (!file.type.startsWith('image/')) continue
            const image = createElement('img', {
                style: 'width:30%',
                src: await readImageToBase64(file)
            })
            if (isEmptyLine(pos))
                pos.replaceWith(image)
            else
                pos.after(image)
            pos = image
        }
        new KRange(pos).active()
    }
}

/**
 * 按行封装
 * @param body {Element}
 * @return {(Element|Node)[]}
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
    for (let child of Array.from(body.childNodes)) {
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