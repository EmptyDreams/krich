import {findParentTag, getFirstTextNode, getLastTextNode, nextSiblingText} from './utils'
import {TOP_LIST} from './global-fileds'

/**
 * 设置选择范围在指定的 node
 * @param range {Range}
 * @param node {Node}
 */
export function selectNodeContents(range, node) {
    setStartBefore(range, node)
    setEndAfter(range, node)
}

/**
 * 设置起始点在一个 node 的开头（自动设置终止点为当前 node 的结尾）
 * @param range {Range}
 * @param node {Node}
 */
export function setStartBefore(range, node) {
    setStartAt(range, getFirstTextNode(node), 0)
}

/**
 * 设置起始点在一个 text node 的中间
 * @param range {Range}
 * @param node {Node}
 * @param index {number}
 */
export function setStartAt(range, node, index) {
    console.assert(node.nodeType === Node.TEXT_NODE, 'node 类型必须为 #text', node)
    range.setStart(node, index)
}

/**
 * 设置起始点在一个 text node 的中间
 * @param range {Range}
 * @param node {Node}
 * @param index {number} 终止点在 node 中的位置，下标反转，0 为 node 结尾
 */
export function setEndAt(range, node, index) {
    console.assert(node.nodeType === Node.TEXT_NODE, 'node 类型必须为 #text', node)
    range.setEnd(node, node.textContent.length - index)
}

/**
 * 设置终止点在一个 node 的结尾
 * @param range {Range}
 * @param node {Node}
 */
export function setEndAfter(range, node) {
    setEndAt(range, getLastTextNode(node), 0)
}

/**
 * 通过行切分 Range
 * @param range {Range}
 * @return {Range[]}
 */
export function splitRangeByLine(range) {
    if (!range.commonAncestorContainer.classList?.contains('krich-editor'))
        return [range]
    const {startContainer, endContainer} = range
    const result = []
    let item = findParentTag(startContainer, ...TOP_LIST)
    do {
        const childRange = document.createRange()
        if (result.length === 0 && item.contains(startContainer)) {
            setStartAt(childRange, startContainer, range.startOffset)
            setEndAfter(childRange, item)
        } else if (item.contains(endContainer)) {
            setStartBefore(childRange, item)
            childRange.setEnd(endContainer, range.endOffset)
        } else {
            selectNodeContents(childRange, item)
        }
        result.push(childRange)
        item = item.nextSibling
    } while (item && range.intersectsNode(item))
    return result
}

/**
 * 使用指定的容器包裹范围内选中的节点（不能跨行）
 * @param range {Range} 选择范围
 * @param container {HTMLElement} 容器
 * @return {void}
 */
export function surroundContents(range, container) {
    const fragment = range.extractContents()
    container.appendChild(fragment)
    range.insertNode(container)
}

/**
 * 合并相邻的 Range
 * @param ranges {Range[]}
 * @return {Range}
 */
export function mergeRanges(ranges) {
    const first = ranges[0]
    const last = ranges[ranges.length - 1]
    const result = document.createRange()
    result.setStart(first.startContainer, first.startOffset)
    result.setEnd(last.endContainer, last.endOffset)
    return result
}

/**
 * 遍历 Range 包含的所有顶层节点
 * @param range {Range}
 * @return {HTMLElement[]}
 */
export function getTopLines(range) {
    const result = []
    let item = findParentTag(correctStartContainer(range), ...TOP_LIST)
    do {
        result.push(item)
        item = item.nextElementSibling
    } while (item && range.intersectsNode(item))
    return result
}

/**
 * 将鼠标光标移动到指定位置
 * @param node {Node}
 * @param index {number}
 */
export function setCursorPosition(node, index) {
    const range = document.createRange()
    range.setStart(node, index)
    range.collapse(true)
    const selection = getSelection()
    selection.removeAllRanges()
    selection.addRange(range)
}

/**
 * 将光标移动到指定位置（会一直向后查找直到找到满足条件的位置）
 * @param node {Node}
 * @param index {number}
 */
export function setCursorPositionIn(node, index) {
    let dist = getFirstTextNode(node)
    do {
        const length = dist.textContent.length
        if (index > length) index -= length
        else break
        dist = nextSiblingText(dist)
        console.assert(!!dist, `运算时下标越界`, node, index)
    } while (true)
    setCursorPosition(dist, index)
}

/**
 * 将光标移动到指定元素的结尾
 * @param node {Node}
 */
export function setCursorPositionAfter(node) {
    const last = getLastTextNode(node)
    setCursorPosition(last, last.textContent.length)
}

/**
 * 将光标移动到指定元素的开头
 * @param node {Node}
 */
export function setCursorPositionBefore(node) {
    setCursorPosition(getFirstTextNode(node), 0)
}

/**
 * 获取矫正后的起始容器
 * @param range {Range}
 * @return {Node}
 */
export function correctStartContainer(range) {
    const {startContainer} = range
    return getFirstTextNode(startContainer.classList?.contains('krich-editor') ?
        startContainer.childNodes[range.startOffset - 1] : startContainer)
}

/**
 * 获取矫正后的结束容器
 * @param range {Range}
 * @return {Node}
 */
export function correctEndContainer(range) {
    const {endContainer} = range
    return getFirstTextNode(endContainer.classList?.contains('krich-editor') ?
        endContainer.childNodes[range.endOffset - 1] : endContainer)
}