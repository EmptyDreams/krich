/*
    本文件用于放置与操作 DOM 有关的 util 函数
 */

import {
    createNewLine,
    equalsKrichNode,
    isBrNode,
    isKrichEditor, isKrichToolBar,
    isMarkerNode,
    isTextNode
} from './tools'
import {behaviors, KRICH_EDITOR} from '../vars/global-fileds'
import {TODO_MARKER} from '../vars/global-tag'

/**
 * 从起点开始遍历 DOM 树
 * @param start {Node} 起点
 * @param forward {boolean} 是否正向遍历
 * @param first {boolean} 首个元素是否触发 consumer
 * @param consumer {function(Node|Element): any} 返回 true 或其它为 true 的值结束遍历
 * @param limit {Node|Element?} 遍历范围限制，留空表示 KRICH_EDITOR
 * @return {any} consumer 的返回值将会从此返回，若 consumer 返回了 true 则返回 consumer 最后一次传入的节点对象
 */
export function eachDomTree(start, forward, first, consumer, limit) {
    function calcResult(node, value) {
        return value === true ? node : value
    }
    /**
     * 深度优先遍历
     * @param item {Element|Node}
     * @return {any} 为 true 时中断
     */
    function dfs(item) {
        if (isMarkerNode(item)) return
        let result
        const childNodes = Array.from(item.childNodes ?? [])
        if (forward) {
            result = consumer(item)
            if (result) return calcResult(item, result)
        }
        if (!forward) childNodes.reverse()
        for (let item of childNodes) {
            result = dfs(item)
            if (result) return result
        }
        if (!forward) {
            result = consumer(item)
            if (result) return calcResult(item, result)
        }
    }
    const isTail = start === (limit ?? KRICH_EDITOR)
    const childNodes = isTail ? [start] : Array.from(start.parentNode.childNodes)
    if (forward) childNodes.reverse()
    const index = childNodes.indexOf(start)
    for (let i = index; i >= 0; --i) {
        if (!first) {
            first = true
        } else {
            const result = dfs(childNodes[i])
            if (result) return result
        }
    }
    return isTail ? null : eachDomTree(start.parentNode, forward, false, consumer, limit)
}

/**
 * 获取最邻近的下一个叶子节点
 * @param node {Node}
 * @return {Node|null}
 */
export function nextLeafNode(node) {
    let next = eachDomTree(node, true, false, _ => true)
    next =  next ? getFirstChildNode(next) : null
    if (next && isMarkerNode(next))
        next = nextLeafNode(next)
    return next
}

/**
 * 获取最邻近的上一个叶子节点
 * @param node {Node}
 * @return {Node|undefined}
 */
export function prevLeafNode(node) {
    let prev = eachDomTree(node, false, false, _ => true)
    if (prev && isMarkerNode(prev))
        prev = prevLeafNode(prev)
    return prev
}

/**
 * 获取指定节点的第一个文本子节点
 * @param node {Node} 指定节点
 * @param limit {Node?} 搜索区域限制，留空为 [node]
 * @return {Node}
 */
export function getFirstTextNode(node, limit) {
    const item = getFirstChildNode(node)
    return isTextNode(item) ? item : nextSiblingText(item, limit ?? node)
}

/**
 * 获取指定节点的最后一个文本子结点
 * @param node {Node} 指定节点
 * @param limit {Node?} 搜索区域限制，留空为 [node]
 * @return {Node}
 */
export function getLastTextNode(node, limit) {
    const item = getLastChildNode(node)
    return isTextNode(item) ? item : prevSiblingText(item, limit ?? node)
}

/**
 * 获取节点的第一个（间接）子节点，没有子节点返回其本身
 * @param node {Node}
 * @return {Node}
 */
export function getFirstChildNode(node) {
    return getSideNode(node, 'firstChild')
}

/**
 * 获取节点的最后一个（间接）子节点，没有子节点返回其本身
 * @param node {Node}
 * @return {Node}
 */
export function getLastChildNode(node) {
    return getSideNode(node, 'lastChild')
}

/**
 * 获取一个节点的端点
 * @param node {Node}
 * @param varName {'firstChild'|'lastChild'}
 * @return {Node}
 */
function getSideNode(node, varName) {
    let item = node
    while (item[varName]) {
        item = item[varName]
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
    while (!isKrichEditor(item) && !isKrichToolBar(item)) {
        if (checker(item)) return item
        item = item.parentElement
    }
}

/** 尝试修复 DOM 中的结构错误 */
export function tryFixDom() {
    // 自动将没有内容的 code 添加换行符
    KRICH_EDITOR.querySelectorAll('pre>code>br:only-child')
        .forEach(it => it.outerHTML = '\n')
    KRICH_EDITOR.querySelectorAll('pre>code:empty')
        .forEach(it => it.textContent = '\n')
    // 自动为没有多选框的代办列表的 li 添加多选框
    Array.from(KRICH_EDITOR.querySelectorAll(`${behaviors.todo.exp}>li`))
        .filter(it => !it.firstElementChild?.classList?.contains?.('marker'))
        .forEach(it => it.insertAdjacentElement('afterbegin', TODO_MARKER.cloneNode(false)))
    // 将不在不是唯一子节点的 <br> 替换为空行
    KRICH_EDITOR.querySelectorAll('br:not(:first-child),br:not(:last-child)')
        .forEach(it => it.replaceWith(createNewLine()))
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
 * 查找最邻近的下一个文本节点
 * @param node {Node} 起始节点
 * @param limit {(HTMLElement|Node)?} 父节点约束，查询范围不会超过该节点的范围
 * @return {Node|null}
 */
export function nextSiblingText(node, limit) {
    return eachDomTree(node, true, false, isTextNode, limit)
}

/**
 * 查找最邻近的上一个文本节点
 * @param node {Node} 起始节点
 * @param limit {(HTMLElement|Node)?} 父节点约束，查询范围不会超过该节点的范围
 * @return {Node|null}
 */
export function prevSiblingText(node, limit) {
    return eachDomTree(node, false, false, isTextNode, limit)
}

/**
 * 获取某个节点相对于其某个父节点的坐标
 * @param target {Element}
 * @param parent {Element|Node}
 * @return {{
 *     t: number,
 *     l: number,
 *     r: number,
 *     b: number
 * }}
 */
export function getRelCoords(target, parent) {
    const targetBox = target.getBoundingClientRect()
    const parentBox = parent.getBoundingClientRect()
    return {
        t: targetBox.y - parentBox.y,
        l: targetBox.x - parentBox.x,
        r: targetBox.right - parentBox.x,
        b: targetBox.bottom - parentBox.y
    }
}

/**
 * 在指定节点后方插入指定的节点
 * @param pos {Node}
 * @param values {Node}
 */
export function insertAfterEnd(pos, ...values) {
    for (let i = values.length - 1; i >= 0; i--) {
        pos.parentNode.insertBefore(values[i], pos.nextSibling)
    }
}

/**
 * 在指定节点前方插入指定的节点
 * @param pos {Node}
 * @param values {Node}
 */
export function insertBefore(pos, ...values) {
    for (let item of values) {
        pos.parentNode.insertBefore(item, pos)
    }
}

/**
 * 压缩 DOM 树结构
 * @param container {Element}
 */
export function zipTree(container) {
    console.assert(!isKrichEditor(container), '不能直接对编辑器 content 进行压缩')
    /** 移除为空的节点 */
    const removeEmptyNode = () => {
        let item = getFirstTextNode(container)
        while (item) {
            const nextText = nextSiblingText(item, container)
            if (!isBrNode(item)) {
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
        let sibling = item?.nextSibling
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