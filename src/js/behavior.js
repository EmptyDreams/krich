import headerSelectStyle from '../resources/html/tools/headerSelect.html'
import blockquoteStyle from '../resources/html/tools/blockquote.html'
import boldStyle from '../resources/html/tools/bold.html'
import underlineStyle from '../resources/html/tools/underline.html'
import italicStyle from '../resources/html/tools/italic.html'
import throughStyle from '../resources/html/tools/through.html'
import inlineCodeStyle from '../resources/html/tools/inlineCode.html'
import supStyle from '../resources/html/tools/sup.html'
import subStyle from '../resources/html/tools/sub.html'
import clearStyle from '../resources/html/tools/clear.html'
import colorStyle from '../resources/html/tools/color.html'
import backgroundStyle from '../resources/html/tools/background.html'
import ulStyle from '../resources/html/tools/ul.html'
import olStyle from '../resources/html/tools/ol.html'
import multiStyle from '../resources/html/tools/multi.html'
import {
    createElement,
    equalsKrichNode,
    findParentTag,
    getElementBehavior,
    getFirstTextNode, isTopElement, nextSiblingText
} from './utils'
import * as RangeUtils from './range'
import {DATA_ID, initBehaviors} from './global-fileds'
import {behaviorHeader} from './behaviors/header'
import {behaviorBlockquote} from './behaviors/blockquote'

initBehaviors({
    headerSelect: {
        noStatus: true,
        render: () => headerSelectStyle,
        onclick: behaviorHeader
    },
    blockquote: {
        noStatus: true,
        render: () => blockquoteStyle,
        hash: () => Date.now().toString(16),
        onclick: behaviorBlockquote
    },
    bold: {
        render: () => boldStyle,
        onclick: range => execCommonCommand('bold', 'B', range)
    },
    underline: {
        render: () => underlineStyle,
        onclick: range => execCommonCommand('underline', 'U', range)
    },
    italic: {
        render: () => italicStyle,
        onclick: range => execCommonCommand('italic', 'I', range)
    },
    through: {
        render: () => throughStyle,
        hash: () => `through`,
        onclick: range => execCommonCommand('through', 'SPAN', range, false, 'through'),
    },
    inlineCode: {
        render: () => inlineCodeStyle,
        onclick: range => execCommonCommand('inlineCode', 'CODE', range)
    },
    sup: {
        render: () => supStyle,
        onclick: range => execCommonCommand('sup', 'SUP', range)
    },
    sub: {
        render: () => subStyle,
        onclick: range => execCommonCommand('sub', 'SUB', range)
    },
    clear: {
        noStatus: true,
        render: () => clearStyle,
        onclick: () => {
            // TODO
        }
    },
    color: {
        render: () => colorStyle,
        onclick: () => {
            // TODO
        }
    },
    background: {
        render: () => backgroundStyle,
        onclick: () => {
            // TODO
        }
    },
    ul: {
        noStatus: true,
        render: () => ulStyle,
        onclick: () => {
            // TODO
        }
    },
    ol: {
        noStatus: true,
        render: () => olStyle,
        onclick: () => {
            // TODO
        }
    },
    multi: {
        noStatus: true,
        render: () => multiStyle,
        onclick: () => {
            // TODO
        }
    }
})

/**
 * 执行一次通用修改指令
 * @param dataId {string} 指令名称
 * @param tagName {string} 标签名称
 * @param range {Range} 使用的 Range
 * @param removed {boolean} 是否已经移除过元素
 * @param classNames {string} 要设置的类名
 */
export function execCommonCommand(dataId, tagName, range, removed = false, ...classNames) {
    if (range.collapsed) return true
    let rangeArray = RangeUtils.splitRangeByLine(range)
    if (!removed) {
        const firstRange = document.createRange()
        removed = removeStylesInRange(rangeArray[0], firstRange, tagName) || removed
        rangeArray[0] = firstRange
        if (rangeArray.length > 1) {
            const last = rangeArray.length - 1
            for (let i = 1; i < last; ++i) {
                removed = removeStylesInRange(rangeArray[i], null, tagName) || removed
            }
            const lastRange = document.createRange()
            removed = removeStylesInRange(rangeArray[last], lastRange, tagName) || removed
            rangeArray[last] = lastRange
        }
    }
    if (removed)
        rangeArray = setStyleInRange(rangeArray, dataId, tagName, ...classNames)
    const selection = getSelection()
    selection.removeAllRanges()
    selection.addRange(RangeUtils.mergeRanges(rangeArray))
    optimizeTree(rangeArray)
}

/**
 * 为指定区域内的文本设置样式
 * @param ranges {Range|Range[]} 选择的区域，如果为数组区域必须连续
 * @param dataId {string} 要设置的样式的 ID
 * @param tagName {string} 要设置的样式的 tagName
 * @param classNames {string} 要添加的类名
 * @return {Range[]} 设置后的选择范围
 */
export function setStyleInRange(ranges, dataId, tagName, ...classNames) {
    /** @type {Range[]} */
    const rangeArray = Array.isArray(ranges) ? ranges : RangeUtils.splitRangeByLine(ranges)
    for (let i = 0; i < rangeArray.length; i++) {
        const it = rangeArray[i]
        const element = createElement(dataId, tagName, ...classNames)
        RangeUtils.surroundContents(it, element)
        /** @param node {Node} */
        const removeIfEmpty = node => {
            if (node && node.nodeType === Node.TEXT_NODE && !node.textContent)
                node.remove()
        }
        removeIfEmpty(element.nextSibling)
        removeIfEmpty(element.previousSibling)
        rangeArray[i] = document.createRange()
        RangeUtils.selectNodeContents(rangeArray[i], element)
    }
    return rangeArray
}

/**
 * 删除选择范围内的指定样式
 * @param range {Range} 选择范围
 * @param newRange {?Range} 新创建的选择范围
 * @param tagNames {string} 要删除的标签名
 * @return {boolean} 是否存在元素没有修改
 */
export function removeStylesInRange(range, newRange, ...tagNames) {
    let anchor = range.startContainer
    let nonAllEdit = false
    let isFirst = true
    const breaker = it => tagNames.includes(it.nodeName) || isTopElement(it.nodeName)
    do {
        const topNode = findParentTag(anchor, ...tagNames)
        if (topNode) {
            if (isFullInclusion(range, topNode)) {
                removeNodeReserveChild(topNode)
                if (newRange) {
                    if (isFirst) RangeUtils.setStartBefore(newRange, anchor)
                    RangeUtils.setEndAfter(newRange, anchor)
                }
            } else {
                const [split, mode] = splitTextNodeAccordingRange(range, isFirst)
                const oldAnchor = anchor
                if (mode) {
                    anchor.textContent = split[0]
                    const insertNode = (index, breaker) => {
                        const array = cloneDomTree(oldAnchor, split[index], breaker)
                        topNode.parentNode.insertBefore(array[0], topNode.nextSibling)
                        if (index === split.length - 1) anchor = array[1]
                        return array[1]
                    }
                    if (split.length === 3)
                        insertNode(2, it => it === topNode.parentNode)
                    const mid = insertNode(1, breaker)
                    if (newRange) {
                        if (isFirst) RangeUtils.setStartBefore(newRange, mid)
                        RangeUtils.setEndAfter(newRange, mid)
                    }
                } else {
                    anchor.textContent = split[1]
                    const array = cloneDomTree(oldAnchor, split[0], breaker)
                    topNode.parentNode.insertBefore(array[0], topNode)
                    if (newRange) {
                        if (isFirst) RangeUtils.setStartBefore(newRange, array[1])
                        RangeUtils.setEndAfter(newRange, array[1])
                    }
                }
            }
        } else {
            nonAllEdit = true
            if (newRange) {
                if (isFullInclusion(range, anchor)) {
                    if (isFirst)
                        RangeUtils.setStartBefore(newRange, anchor)
                    RangeUtils.setEndAfter(newRange, anchor)
                    break
                } else {
                    if (isFirst)
                        RangeUtils.setStartAt(newRange, anchor, range.startOffset)
                    if (range.endContainer === anchor)
                        newRange.setEnd(anchor, range.endOffset)
                }
            }
        }
        anchor = nextSiblingText(anchor)
        isFirst = false
    } while (range.intersectsNode(anchor))
    return nonAllEdit
}

/**
 * 判断选取是否完全包含子元素
 * @param range {Range} 选取
 * @param childNode {Node} 子元素
 */
function isFullInclusion(range, childNode) {
    const childRange = document.createRange()
    RangeUtils.selectNodeContents(childRange, childNode)
    const startPoint = range.compareBoundaryPoints(Range.START_TO_START, childRange)
    if (startPoint > 0) return false
    const endPoint = range.compareBoundaryPoints(Range.END_TO_END, childRange)
    return endPoint >= 0
}

/**
 * 将一个元素从 DOM 中移除，但保留其所有子元素
 * @param node {Node} 要删除的元素
 */
function removeNodeReserveChild(node) {
    const parent = node.parentNode
    for (let childNode of node.childNodes) {
        parent.insertBefore(childNode, node)
    }
    parent.removeChild(node)
}

/**
 * 复制 DOM 树
 * @param node {Node} #text 节点
 * @param text {string} 文本节点的内容
 * @param breaker {function(Node):boolean} 断路器，判断是否终止复制
 * @return {[Node, Text]} 克隆出来的文本节点
 */
function cloneDomTree(node, text, breaker) {
    const textNode = document.createTextNode(text)
    let tree = textNode
    let pos = node
    node = node.parentNode
    while (!breaker(node)) {
        const item = node.cloneNode(false)
        item.appendChild(tree)
        tree = item
        pos = node
        node = node.parentNode
    }
    return [tree, textNode]
}

/**
 * 通过 Range 将一个文本节点切分为多个节点
 * @param range {Range} 选择的范围
 * @param isFirst {boolean} 是否为开头
 * @return {[string[], boolean]} 返回切分后的节点和填充模式，true 表示第一个元素保留原有效果
 */
function splitTextNodeAccordingRange(range, isFirst) {
    /**
     * 切分节点
     * @param content {string} 要切分的内容
     * @param index {number} 切分下标
     */
    const splitText = (content, ...index) => {
        const result = []
        for (let i = 0; i < index.length; i++) {
            result.push(content.substring(index[i], index[i + 1]))
        }
        return result
    }
    const {endContainer, endOffset, startContainer, startOffset} = range
    if (startContainer === endContainer) {
        const content = endContainer.textContent
        if (startOffset === 0)
            return [splitText(content, 0, endOffset), false]
        if (endOffset === content.length)
            return [splitText(content, 0, startOffset), true]
        return [splitText(content, 0, startOffset, endOffset), true]
    }
    let node, offset
    if (isFirst) {
        node = startContainer
        offset = startOffset
    } else {
        node = endContainer
        offset = endOffset
    }
    const content = node.textContent
    return [splitText(content, 0, offset), offset !== 0]
}

/**
 * 优化选中的节点结构
 * @param ranges {Range[]}
 */
function optimizeTree(ranges) {
    /** @param element {HTMLElement} */
    const nextElementSibling  = element => {
        const sibling1 = element.nextSibling
        const sibling2 = element.nextElementSibling
        return sibling1 === sibling2 ? sibling2 : null
    }
    /**
     * 将 `that` 合并到 `dist` 中并移除 `that`
     * @param dist {HTMLElement}
     * @param that {HTMLElement}
     * @param onHead {boolean} 是否合并到 `dist` 的开头
     */
    const mergeElement = (dist, that, onHead) => {
        dist.insertAdjacentHTML(onHead ? 'afterbegin' : 'beforeend', that.innerHTML)
        that.remove()
    }
    /**
     * @param element {HTMLElement}
     * @param recursion {boolean} 是否递归判断子结点
     * @return {boolean} 是否合并了传入的 `element` 和其下一个兄弟节点
     */
    const optimizeNodes = (element, recursion) => {
        let result = false
        const sibling = nextElementSibling(element)
        const eleBehavior = getElementBehavior(element)
        console.assert(!!eleBehavior, `指定元素没有包含 ${DATA_ID} 字段：`, element)
        if (sibling && equalsKrichNode(element, sibling)) {
            mergeElement(element, sibling, false)
            result = true
        }
        if (recursion) {
            let item = element.firstElementChild
            while (item) {
                let subResult = optimizeNodes(item, true)
                while (subResult)
                    subResult = optimizeNodes(item, false)
                item = item.nextElementSibling
            }
        }
        return result
    }
    for (let range of ranges) {
        const common = range.commonAncestorContainer
        let item = range.commonAncestorContainer.parentElement
        if (common.nodeType !== Node.TEXT_NODE) item = item.firstElementChild
        if (item.tagName !== 'P') {
            const prev = item.previousSibling
            if (prev && prev.nodeType !== Node.TEXT_NODE)
                mergeElement(item, item.previousElementSibling, true)
            while (item) {
                optimizeNodes(item, true)
                item = item.nextElementSibling
            }
        }
        let node = getFirstTextNode(range.startContainer.parentNode)
        do {
            let sibling = node.nextSibling
            while (sibling?.nodeType === Node.TEXT_NODE) {
                node.textContent += sibling.textContent
                sibling.remove()
                sibling = node.nextSibling
            }
            node = nextSiblingText(node)
        } while (node)
    }
}