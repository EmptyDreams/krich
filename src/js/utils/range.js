import {KRICH_EDITOR, TOP_LIST} from '../global-fileds'
import {
    eachDomTree,
    findParentTag, getFirstChildNode,
    getFirstTextNode, getLastChildNode,
    getLastTextNode, nextLeafNode,
    nextSiblingText, prevLeafNode,
    splitElementByContainer,
    zipTree
} from './dom'
import {isEmptyBodyElement, isMarkerNode, isMultiElementStructure, isTextNode} from './tools'

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

// noinspection JSUnusedGlobalSymbols
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
    if (checkEmptyBodyElement(node)) return
    const last = getLastTextNode(node)
    setCursorPosition(last, last.textContent.length)
}

/**
 * 将光标移动到指定元素的开头
 * @param node {Node}
 */
export function setCursorPositionBefore(node) {
    if (checkEmptyBodyElement(node)) return
    const first = getFirstTextNode(node)
    setCursorPosition(first, 0)
}

function checkEmptyBodyElement(node) {
    if (isEmptyBodyElement(node)) {
        new KRange(node).active()
        return true
    }
}

export class KRange extends Range {

    /**
     * 判断是否是包裹文本的 range
     * @type {Element|undefined}
     */
    body

    /**
     * 从 Range 或 EmptyBodyElement 构建一个 KRange
     * @param optional {Range|HTMLElement|undefined}
     */
    constructor(optional = undefined) {
        super()
        if (!optional) return
        if (optional.nodeName) {
            console.assert(isEmptyBodyElement(optional), 'KRange 传入 HTMLElement 对象时仅允许传入 EmptyBodyElement')
            this.body = optional
            this.selectNode(optional)
            return
        }
        let {startContainer, startOffset, endContainer, endOffset} = optional
        if (!checkLocationRelation(optional)) {
            [startContainer, startOffset, endContainer, endOffset] =
                [endContainer, endOffset, startContainer, startOffset]
        }
        if (!isTextNode(startContainer) && !isEmptyBodyElement(startContainer)) {
            const node = startContainer.childNodes[startOffset]
            if (node) {
                this.setStartBefore(node)
            }
        } else {
            super.setStart(startContainer, startOffset)
        }
        if (optional.collapsed) {
            this.collapse(true)
        } else if (!isTextNode(endContainer) && !isEmptyBodyElement(endContainer)) {
            const node = endContainer.childNodes[endOffset]
            if (node) {
                this.setEndBefore(node)
            }
        } else {
            super.setEnd(endContainer, endOffset)
        }
    }

    setStartBefore(node) {
        const childNode = getFirstChildNode(node)
        super.setStart(childNode, 0)
    }

    setStartAfter(node) {
        const childNode = getLastChildNode(node)
        if (isTextNode(childNode)) {
            super.setStart(childNode, childNode.textContent.length)
        } else if (isMarkerNode(childNode)) {
            this.setStartBefore(nextLeafNode(childNode))
        } else {
            super.setStartAfter(childNode)
        }
    }

    setEndBefore(node) {
        const prevNode = prevLeafNode(node)
        console.assert(!!prevNode,'使用 SetEndBefore 时当前元素前必须有一个元素')
        if (isMarkerNode(prevNode)) {
            super.setEnd(getFirstChildNode(node), 0)
        } else {
            this.setEndAfter(prevNode)
        }
    }

    setEndAfter(node) {
        const childNode = getLastChildNode(node)
        if (isTextNode(childNode)) {
            super.setEnd(childNode, childNode.textContent.length)
        } else if (isMarkerNode(childNode)) {
            super.setEnd(nextLeafNode(node), 0)
        } else {
            super.setEndAfter(childNode)
        }
    }

    /** 将当前区间设定为激活区间 */
    active() {
        const selection = getSelection()
        if (selection.rangeCount && selection.getRangeAt(0) === this) return
        selection.removeAllRanges()
        selection.addRange(this)
    }

    /**
     * 判断两个 KRange 是否相等
     * @param that {KRange}
     */
    equals(that) {
        const thisRange = this
        const thatRange = that
        if (thisRange === thatRange) return true
        const list = ['collapsed', 'startContainer', 'endContainer', 'startOffset', 'endOffset']
        return !list.find(it => thisRange[it] !== thatRange[it])
    }

    /**
     * @return {{next: (function(): {value: Node, done: boolean})}}
     */
    [Symbol.iterator]() {
        const range = this
        let value = range.startContainer
        let done = false
        // noinspection JSUnusedGlobalSymbols
        return {
            next: () => {
                if (done) return {done}
                const next = nextSiblingText(value)
                done = !(next && range.intersectsNode(next))
                const result = {value}
                value = next
                return result
            }
        }
    }

    /**
     * 使用指定的容器包裹范围内选中的节点（不能跨行）
     * @param container {Element} 容器
     * @param lca {Element?} 切割范围限制，留空自动决定
     * @return {void}
     */
    surroundContents(container, lca) {
        const {startContainer, endContainer, startOffset, endOffset} = this
        // 判断选区是否选择了 endContainer 的结尾
        const isOnTheRight = endOffset ===
            (isTextNode(endContainer) ? endContainer.textContent.length : endContainer.childNodes.length)
        if (!lca && startContainer === endContainer && startOffset === 0 && isOnTheRight) {
            startContainer.parentNode.insertBefore(container, startContainer)
            container.append(startContainer)
        } else {
            const commonAncestorContainer = lca ?? this.commonAncestorContainer
            const {list, index} = splitElementByContainer(
                commonAncestorContainer,
                startContainer, startOffset, endContainer, endOffset
            )
            if (commonAncestorContainer.nodeType === Node.TEXT_NODE) {
                list[index].parentNode.insertBefore(container, list[index])
                container.append(list[index])
                zipTree(list[0].parentElement)
            } else {
                container.append(...list[index].childNodes)
                list[index].append(container)
                for (let i = 1; i < list.length; i++) {
                    list[0].append(...list[i].childNodes)
                    list[i].remove()
                }
                zipTree(list[0])
            }
        }
    }

    /**
     * 将 Range 信息序列化
     * @typedef {boolean|undefined} KRangePointType
     * @typedef {[number, number, KRangePointType]|[number, number, KRangePointType, number, number]} KRangeData
     * @return {KRangeData}
     */
    serialization() {
        /**
         * @param container {Node} 所在节点
         * @param offset {number} 偏移量
         * @param include {boolean} 是否包含 offset 所指节点
         * @return {[number, number, KRangePointType]|[number, number]}
         */
        function locateRange(container, offset, include) {
            const isText = isTextNode(container)
            let leafNode = isText ? container : container.childNodes[offset]
            if (!include && (!isText || !offset))
                leafNode = prevLeafNode(leafNode)
            let emptyCount = 0
            let emptyItem = leafNode
            while (isEmptyBodyElement(emptyItem)) {
                ++emptyCount
                emptyItem = prevLeafNode(emptyItem)
            }
            let index = 0
            const top = findParentTag(
                leafNode, item => item.parentElement === KRICH_EDITOR
            )
            for (let item of KRICH_EDITOR.children) {
                if (item === top) break
                index += item.textContent.length
            }
            eachDomTree(leafNode, false, false, it => {
                if (isTextNode(it)) index += it.textContent.length
            }, top)
            /**
             * 存储指针是否指向一个节点的开头
             * @type {boolean|undefined}
             */
            let type
            if (include) {
                if (isText) {
                    index += offset
                    type = offset === 0
                } else type = true
            } else {
                if (isText)
                    index += offset
            }
            return [index, emptyCount, ...(include ? [type] : [])]
        }
        const {startContainer, startOffset, endContainer, endOffset} = this
        const startLocation = locateRange(startContainer, startOffset, true)
        if (this.collapsed) return startLocation
        const endLocation = locateRange(endContainer, endOffset, false)
        return [...startLocation, ...endLocation]
    }

    /**
     * 从 data 中恢复数据
     * @param data {KRangeData}
     */
    deserialized(data) {
        let [startIndex, startEmptyCount, type, endIndex, endEmptyCount] = data
        /**
         * @param index {number}
         * @param emptyCount {number}
         * @param type {KRangePointType?}
         * @return {[Node, number]}
         */
        function findNode(index, emptyCount, type) {
            let pos = 0
            return eachDomTree(KRICH_EDITOR, true, true, it => {
                if (isTextNode(it)) {
                    const length = it.textContent.length
                    const nextPos = pos + length
                    if (nextPos > index) {
                        return [it, index - pos]
                    } else if (nextPos === index) {
                        while (emptyCount-- > 0) {
                            it = nextLeafNode(it)
                        }
                        if (type) {
                            return [nextLeafNode(it), 0]
                        } else {
                            return [it, -1]
                        }
                    } else {
                        pos = nextPos
                    }
                }
            })
        }
        const [startContainer, startOffset] = findNode(startIndex, startEmptyCount, type)
        if (startOffset < 0) {
            this.setStartAfter(startContainer)
        } else {
            super.setStart(startContainer, startOffset)
        }
        if (data.length < 4) {
            this.collapse(true)
            return this
        }
        const [endContainer, endOffset] = findNode(endIndex, endEmptyCount)
        if (endOffset < 0) {
            this.setEndAfter(endContainer)
        } else {
            super.setEnd(endContainer, endOffset)
        }
    }

    /**
     * 通过行切分 Range
     * @return {KRange[]}
     */
    splitRangeByLine() {
        const {startContainer, endContainer, startOffset, endOffset} = this
        let lines = this.getAllTopElements()
        let length = lines.length
        while (true) {
            lines = lines.flatMap(it => isMultiElementStructure(it) ? Array.from(it.children) : [it])
            const newLength = lines.length
            if (newLength === length) break
            length = newLength
        }
        const worked = lines
            .map((it, index) => [it, index])
            .filter(it => !isEmptyBodyElement(it[0]))
        return worked.map(data => {
            const [item, index] = data
            const newRange = KRange.selectNodeContents(item)
            if (index === 0) {
                newRange.setStart(startContainer, startOffset)
            }
            if (index === length - 1) {
                newRange.setEnd(endContainer, endOffset)
            }
            return newRange
        })
    }

    /**
     * 获取所有被包含的行
     * @return {Element[]}
     */
    getAllTopElements() {
        let {commonAncestorContainer, startContainer, endContainer, endOffset} = this
        if (!isTextNode(endContainer)) endContainer = prevLeafNode(endContainer.childNodes[endOffset])
        const {firstChild, lastChild} = commonAncestorContainer
        /**
         * 是否对公共祖先进行特化处理
         * 为 true 时返回最近公共祖先下的直接子标签
         * @type {boolean}
         */
        const lcaSpecialization = lastChild && findParentTag(lastChild, TOP_LIST) === lastChild
        let start, end
        if (lcaSpecialization) {
            const checker = it => it.parentNode === commonAncestorContainer
            start = startContainer === commonAncestorContainer ? firstChild : findParentTag(startContainer, checker)
            if (isMarkerNode(start)) start = start.nextSibling
            end = endContainer === commonAncestorContainer ? lastChild : findParentTag(endContainer, checker)
        } else {
            start = findParentTag(startContainer, TOP_LIST)
            end = findParentTag(endContainer, TOP_LIST)
        }
        console.assert(start && end, 'start 和 end 中一个或多个的值为空', start, end)
        const result = []
        let item = start
        while (true) {
            result.push(item)
            if (item === end) {
                console.assert(result.every(it => it), '结果中部分元素为空')
                return result
            }
            // noinspection JSIncompatibleTypesComparison
            item = item.nextSibling ?? eachDomTree(
                item, true, false,
                it => item.parentNode.nextSibling === it.parentNode
            )
        }
    }

    /**
     * 获取当前的激活 KRange
     * @return {KRange}
     */
    static activated() {
        const selection = getSelection()
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0)
            return 'body' in range ? range : new KRange(selection.getRangeAt(0))
        }
        const node = getLastTextNode(KRICH_EDITOR)
        const range = new KRange()
        range.setStart(node, node.textContent.length)
        range.collapse(true)
        return range
    }

    /**
     * 创建一个选中指定元素的 KRange
     * @param node {Node}
     * @return {KRange}
     */
    static selectNodeContents(node) {
        const result = new KRange()
        result.setStartBefore(node)
        result.setEndAfter(node)
        return result
    }

    /**
     * 连接相邻的 KRange
     * @param ranges {KRange[]}
     */
    static join(ranges) {
        const first = ranges[0]
        const last = ranges[ranges.length - 1]
        const result = new KRange()
        result.setStart(first.startContainer, first.startOffset)
        result.setEnd(last.endContainer, last.endOffset)
        return result
    }

    /**
     * 反序列化数据
     * @param data {[number, number, KRangePointType]|[number, number, KRangePointType, number, number]}
     * @return {KRange}
     */
    static deserialized(data) {
        const range = new KRange()
        range.deserialized(data)
        return range
    }

}

/**
 * 检查 Range 起点是否在终点之前
 * @param range {Range}
 */
function checkLocationRelation(range) {
    const {startContainer, startOffset, endContainer, endOffset} = range
    if (startContainer === endContainer)
        return startOffset <= endOffset
    const node = startContainer.childNodes[startOffset] ?? startContainer
    const otherNode = endContainer.childNodes[endOffset] ?? endContainer
    return node.compareDocumentPosition(otherNode) & 4
}