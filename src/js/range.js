import {findParentTag, getFirstTextNode, getLastTextNode} from './utils'

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
 * 获取 Range 所在行的 Range
 * @param range {Range}
 * @return {Range}
 */
export function getLineRange(range) {
    const result = document.createRange()
    if (range.collapsed) {
        console.log(range)
    } else {
        setStartBefore(result, findParentTag(result.startContainer, 'P'))
        setEndAfter(result, findParentTag(result.endContainer, 'P'))
    }
    return result
}