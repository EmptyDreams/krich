/*
    本文件用于放置与操作 DOM 有关的 util 函数
 */

import {equalsKrichNode, isEmptyBodyElement} from './tools'

/**
 * 获取指定节点的第一个文本子节点
 * @param node {Node}
 * @return {Node}
 */
export function getFirstTextNode(node) {
    let item = node
    while (!['#text', 'BR'].includes(item.nodeName)) {
        const next = item.firstChild
        if (!next) return nextSiblingText(item, node)
        item = next
    }
    return item
}

/**
 * 获取指定节点的最后一个文本子结点
 * @param node {Node}
 * @return {Node}
 */
export function getLastTextNode(node) {
    let item = node
    while (!['#text', 'BR'].includes(item.nodeName)) {
        const next = item.lastChild
        if (!next) return prevSiblingText(item, node)
        item = next
    }
    return item
}

/**
 * 查找距离当前节点最近的满足指定要求的节点
 * @param node {Node} 指定的节点
 * @param checker {string[]|function(HTMLElement|Node):boolean} 标签名称或判断表达式
 * @return {Element|undefined}
 */
export function findParentTag(node, checker) {
    if (Array.isArray(checker)) {
        const array = checker
        checker = it => array.includes(it.nodeName)
    }
    /** @type {Node|Element} */
    let item = node
    while (!item.classList?.contains?.('krich')) {
        if (checker(item)) return item
        item = item.parentElement
    }
}

/**
 * 将指定的元素替换为指定元素，同时保留子元素
 * @param src {HTMLElement} 要被替换的元素
 * @param novel {HTMLElement} 新的元素
 */
export function replaceElement(src, novel) {
    novel.innerHTML = src.innerHTML
    src.replaceWith(novel)
}

/**
 * @param node {Node} 起始节点
 * @param limit {(HTMLElement|Node)?} 父节点约束
 * @param varName {string} 变量名
 * @param fun {function(Node):Node} 终止函数
 * @return {Node|null}
 */
function getSiblingText(node, limit, varName, fun) {
    if (node === limit) return null
    let dist = node
    while (true) {
        let sibling = dist[varName]
        while (sibling && isEmptyBodyElement(sibling)) {
            sibling = sibling[varName]
        }
        if (sibling) return fun(sibling)
        dist = dist.parentNode
        if (!dist || dist === limit) return null
    }
}

/**
 * 查找最邻近的下一个文本节点
 * @param node {Node} 起始节点
 * @param limit {(HTMLElement|Node)?} 父节点约束，查询范围不会超过该节点的范围
 * @return {Node|null}
 */
export function nextSiblingText(node, limit) {
    return getSiblingText(node, limit, 'nextSibling', getFirstTextNode)
}

/**
 * 查找最邻近的上一个文本节点
 * @param node {Node} 起始节点
 * @param limit {(HTMLElement|Node)?} 父节点约束，查询范围不会超过该节点的范围
 * @return {Node|null}
 */
export function prevSiblingText(node, limit) {
    return getSiblingText(node, limit, 'previousSibling', getLastTextNode)
}

/**
 * 通过指定节点切割父级标签
 * @param element {HTMLElement|Node} 父级标签
 * @param startContainer {Node} 起始节点
 * @param startOffset {number} 切割位置在起始节点中的下标
 * @param endContainer {Node?} 终止节点
 * @param endOffset {number?} 切割位置在终止节点中的下标
 * @return {{
 *     list: (HTMLElement|Node)[],
 *     index: 0|1
 * }} list 是切分后的结果序列，index 表示选中的是哪部分
 */
export function splitElementByContainer(
    element,
    startContainer, startOffset, endContainer, endOffset
) {
    let index = 1
    const buildResult = list => ({index, list})
    const breaker = it => it === element
    if (startOffset === 0) {
        const prev = prevSiblingText(startContainer, element)
        if (prev) {
            startContainer = prev
            startOffset = prev.textContent.length
        } else {
            startContainer = endContainer
            startOffset = endOffset
            endContainer = null
            index = 0
        }
    }
    /**
     * 从终点开始向前复制
     * @param node {Node} 最右侧的节点
     * @param offset {number} 切割位点
     * @return {HTMLElement}
     */
    const cloneFromEnd = (node, offset) => {
        const textContent = node.textContent
        const firstNode = cloneDomTree(node, textContent.substring(0, offset), breaker)[0]
        node.textContent = textContent.substring(offset)
        if (element.nodeType === Node.TEXT_NODE)
            return firstNode
        const container = element.cloneNode(false)
        container.append(firstNode)
        let item = prevSiblingText(node, element)
        while (item?.textContent) {
            container.insertBefore(cloneDomTree(item, item.textContent, breaker)[0], container.firstChild)
            item.textContent = ''
            item = prevSiblingText(item, element)
        }
        return container
    }
    const left = cloneFromEnd(startContainer, startOffset)
    element.parentNode.insertBefore(left, element)
    if (startContainer === endContainer)
        endOffset -= startOffset
    if (endContainer && endOffset === 0) {
        endContainer = prevSiblingText(endContainer, element)
        endOffset = endContainer.textContent.length
    }
    if (!endContainer) return buildResult([left, element])
    const next = nextSiblingText(endContainer, element)
    if (!next && endOffset === endContainer.textContent.length) return buildResult([left, element])
    const mid = cloneFromEnd(endContainer, endOffset)
    element.parentNode.insertBefore(mid, element)
    return buildResult([left, mid, element])
}

/**
 * 复制 DOM 树
 * @param node {Node} #text 节点
 * @param text {string} 文本节点的内容
 * @param breaker {function(Node):boolean} 断路器，判断是否终止复制
 * @return {[Text|HTMLElement, Text]} 克隆出来的文本节点
 */
export function cloneDomTree(node, text, breaker) {
    const textNode = document.createTextNode(text)
    if (breaker(node)) return [textNode, textNode]
    /** @type {Text|HTMLElement} */
    let tree = textNode
    let pos = node
    node = node.parentElement
    while (!breaker(node)) {
        const item = node.cloneNode(false)
        item.appendChild(tree)
        tree = item
        pos = node
        node = node.parentElement
    }
    return [tree, textNode]
}

/**
 * 压缩 DOM 树结构
 * @param container {HTMLElement}
 */
export function zipTree(container) {
    console.assert(!container.classList.contains('krich-editor'), '不能直接对编辑器 content 进行压缩')
    /** 移除为空的节点 */
    const removeEmptyNode = () => {
        let item = getFirstTextNode(container)
        while (item) {
            const nextText = nextSiblingText(item, container)
            if (item.nodeName !== 'BR') {
                if (!item.textContent) {
                    let parent = item.parentElement
                    item.remove()
                    while (parent.childNodes.length === 0) {
                        const next = parent.parentElement
                        parent.remove()
                        parent = next
                    }
                }
            }
            item = nextText
        }
    }
    /**
     * 合并相邻且相同的节点
     * @param firstNode {Node}
     */
    const mergeEqualsNode = firstNode => {
        let item = firstNode
        let sibling = item.nextSibling
        while (sibling) {
            const nextSibling = sibling.nextSibling
            if (item.nodeName === sibling.nodeName) {   // 判断两个节点是同一种节点
                if (item.nodeType === Node.TEXT_NODE) { // 判断是否是文本节点
                    item.textContent += sibling.textContent
                } else {
                    // 能够到这里说明这两个节点都是 HTMLElement
                    // noinspection JSCheckFunctionSignatures
                    if (equalsKrichNode(item, sibling)) {
                        while (sibling.firstChild)
                            item.appendChild(sibling.firstChild)
                    } else {
                        item = sibling
                        sibling = nextSibling
                        continue
                    }
                }
                sibling.remove()
            } else {
                item = sibling
            }
            sibling = nextSibling
        }
    }
    /**
     * 递归合并
     * @param parent {HTMLElement}
     */
    const recursionMerge = parent => {
        mergeEqualsNode(parent.firstChild)
        for (let child of parent.children) {
            recursionMerge(child)
        }
    }
    removeEmptyNode()
    recursionMerge(container)
}