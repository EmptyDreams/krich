import {findParentTag, getFirstTextNode, getLastTextNode, getLca, splitElementFrom} from './utils'
import {TOP_LIST} from './constant'

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
            range.setEnd(endContainer, range.endOffset)
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
    const common = range.commonAncestorContainer
    if (common.nodeType === Node.TEXT_NODE)
        return range.surroundContents(container)
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