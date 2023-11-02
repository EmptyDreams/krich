import {DATA_ID, behaviors, TOP_LIST} from './constant'

/**
 * 获取指定节点的第一个文本子节点
 * @param node {Node}
 * @return {Text}
 */
export function getFirstTextNode(node) {
    while (node.nodeType !== Node.TEXT_NODE) {
        node = node.firstChild
    }
    return node
}

/**
 * 获取指定节点的最后一个文本子结点
 * @param node {Node}
 * @return {Text}
 */
export function getLastTextNode(node) {
    while (node.nodeType !== Node.TEXT_NODE)
        node = node.lastChild
    return node
}

/** @param element {HTMLElement} */
export function getElementBehavior(element) {
    return behaviors[element.getAttribute(DATA_ID)]
}

/**
 * 判断两个富文本节点是否相同（不判断节点内容）
 * @param arg0 {HTMLElement}
 * @param arg1 {HTMLElement}
 */
export function equalsKrichNode(arg0, arg1) {
    console.assert(!!arg0 && arg1, '参数不能为 null/undefined', arg0, arg1)
    const h0 = getElementBehavior(arg0)
    const h1 = getElementBehavior(arg1)
    console.assert(!!h0 && h1, `两个节点有一个不包含 ${DATA_ID} 属性或属性值错误`, arg0, arg1)
    return h0 === h1 && h0.hash?.(arg0) === h1.hash?.(arg1)
}

/**
 * 判断指定节点是否被某个类型的标签包裹
 * @param node {Node} 指定的节点
 * @param names {string} 标签名称
 */
export function findParentTag(node, ...names) {
    console.assert(names && names.length !== 0, 'names 不应当为空')
    let item = node.parentElement
    while (!item.classList.contains('krich-editor')) {
        if (names.includes(item.nodeName)) return item
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
 * 判断指定节点是否是顶层节点
 * @param node {Node}
 * @return {boolean}
 */
function isTopElement(node) {
    return TOP_LIST.includes(node.nodeName)
}

/**
 * 从指定位置将 text node 切分为两部分，并从父节点中提取出来。
 *
 * 该函数将保留右侧部分，将内容从左侧提取出来，若 node 不在其父元素的最左侧运算结果将会错误。
 *
 * @param node {Node} 要切分的文本节点
 * @param index {number} 切分的位置（该位置会被分配到右侧）
 * @return {[Text, Text]} 返回新创建的节点
 */
export function splitElementFrom(node, index) {
    let leftNode = document.createTextNode(node.textContent.substring(0, index))
    const leftText = leftNode
    node.textContent = node.textContent.substring(index)
    let root = node.parentNode
    let insertPos = node
    while (!isTopElement(root)) {
        const node = root.cloneNode(false)
        node.appendChild(leftNode)
        let pos = leftNode
        let prev = pos.previousSibling
        while (prev) {
            node.insertBefore(prev, pos)
            pos = prev
            prev = prev.previousSibling
        }
        leftNode = node
        insertPos = root
        root = root.parentNode
    }
    return [leftText, node]
}

/**
 * 获取两个节点的最近公共祖先
 * @param node0 {Node}
 * @param node1 {Node}
 * @return {Node}
 */
export function getLca(node0, node1) {
    const range = document.createRange()
    range.setStartBefore(node0)
    range.setEndAfter(node1)
    return range.commonAncestorContainer
}