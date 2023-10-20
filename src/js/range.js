import {getFirstTextNode, getLastTextNode} from './utils'

/** @type {Range} */
let exportRange

export function create() {
    return exportRange = document.createRange()
}

/**
 * 设置选择范围在指定的 node
 * @param node {Node}
 */
export function selectNodeContents(node) {
    setStartBefore(node)
    setEndAfter(node)
}

/**
 * 设置起始点在一个 node 的开头（自动设置终止点为当前 node 的结尾）
 * @param node {Node}
 */
export function setStartBefore(node) {
    setStartAt(getFirstTextNode(node), 0)
}

/**
 * 设置起始点在一个 text node 的中间
 * @param node {Node}
 * @param index {number}
 */
export function setStartAt(node, index) {
    console.assert(node.nodeType === Node.TEXT_NODE, 'node 类型必须为 #text')
    exportRange.setStart(node, index)
}

/**
 * 设置起始点在一个 text node 的中间
 * @param node {Node}
 * @param index {number} 终止点在 node 中的位置，下标反转，0 为 node 结尾
 */
export function setEndAt(node, index) {
    console.assert(node.nodeType === Node.TEXT_NODE, 'node 类型必须为 #text')
    exportRange.setEnd(node, node.textContent.length - index)
}

/**
 * 设置终止点在一个 node 的结尾
 * @param node {Node}
 */
export function setEndAfter(node) {
    setEndAt(getLastTextNode(node), 0)
}