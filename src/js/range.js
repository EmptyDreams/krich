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
 * 使用指定的容器包裹范围内选中的节点
 * @param range {Range} 选择范围
 * @param container {HTMLElement} 容器
 * @return {void}
 */
export function surroundContents(range, container) {
    const common = range.commonAncestorContainer
    console.log(range.startContainer.textContent, range.endContainer.textContent, common)
    if (common.nodeType === Node.TEXT_NODE)
        return range.surroundContents(container)
    /** @param range {Range} */
    const surroundLine = range => {
        const fragment = range.extractContents()
        const root = container.cloneNode(false)
        root.appendChild(fragment)
        range.insertNode(root)
    }
    const {startContainer, endContainer} = range
    if (common.classList.contains('krich-editor')) {    // 跨行
        let line = findParentTag(startContainer, ...TOP_LIST)
        do {
            const childRange = document.createRange()
            if (line.contains(startContainer)) {
                setStartAt(childRange, startContainer, range.startOffset)
                setEndAfter(childRange, line)
            } else if (line.contains(endContainer)) {
                setStartBefore(childRange, line)
                childRange.setEnd(endContainer, range.endOffset)
            } else {
                setStartBefore(childRange, line)
                setEndAfter(childRange, line)
            }
            surroundLine(childRange)
            line = line.nextSibling
        } while (line && range.intersectsNode(line))
    } else {    // 单行
        surroundLine(range)
    }
}