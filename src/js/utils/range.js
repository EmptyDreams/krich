import {KRICH_EDITOR, TOP_LIST} from '../global-fileds'
import {
    eachDomTree,
    findParentTag, getFirstChildNode,
    getFirstTextNode, getLastChildNode,
    getLastTextNode,
    nextSiblingText,
    splitElementByContainer,
    zipTree
} from './dom'
import {isEmptyBodyElement, isMarkerNode, isTextNode} from './tools'

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
        const checkStatus = node => !['#text', 'BR'].includes(node.nodeName)
        const startStatus = checkStatus(startContainer)
        const endStatus = checkStatus(endContainer)
        // 如果起点或结尾不是 TEXT NODE 则进行纠正
        if (optional.collapsed) {
            if (startStatus) {
                let point = startContainer.childNodes[startOffset]
                if (isEmptyBodyElement(point.previousSibling))
                    point = point.previousSibling
                if (isEmptyBodyElement(point)) {
                    this.selectNode(point)
                    // noinspection JSValidateTypes
                    this.body = point
                } else {
                    this.setEndAfter(point)
                }
            } else {
                super.setEnd(startContainer, startOffset)
            }
            if (!this.body)
                this.collapse(false)
        } else {
            if (startStatus) {
                const start = startContainer.childNodes[startOffset]
                this.setStartBefore(start)
            } else if (startContainer.textContent.length === startOffset) {
                this.setStartAfter(startContainer)
            } else {
                super.setStart(startContainer, startOffset)
            }
            if (!endOffset) {
                this.setEndBefore(endContainer)
            } else if (endStatus) {
                this.setEndAfter(endContainer.childNodes[endOffset - 1])
            } else {
                super.setEnd(endContainer, endOffset)
            }
        }
    }

    setStart(node, offset) {
        const [text, index] = findTextByIndex(node, offset, true)
        super.setStart(text, index)
    }

    setEnd(node, offset) {
        const [text, index] = findTextByIndex(node, offset, false)
        super.setEnd(text, index)
    }

    setStartBefore(node) {
        const childNode = getFirstChildNode(node)
        super.setStart(childNode, 0)
    }

    setStartAfter(node) {
        const item = node.nextSibling ??
            findParentTag(node, it => !!it.nextSibling)?.nextSibling
        if (item) this.setStartBefore(item)
        else super.setStart(node, node.textContent.length)
    }

    setEndBefore(node) {
        const item = node.previousSibling ??
            findParentTag(node, it => !!it.previousSibling)?.previousSibling
        console.assert(!!item,'使用 SetEndBefore 时当前元素前必须有一个元素')
        if (isMarkerNode(item)) {
            super.setEnd(getFirstChildNode(node), 0)
        } else {
            this.setEndAfter(item)
        }
    }

    setEndAfter(node) {
        const childNode = getLastChildNode(node)
        super.setEnd(childNode, childNode.textContent.length)
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
     * @return {[number, number]|[number]}
     */
    serialization() {
        /**
         * 获取指定
         * @param container {Text} 所在节点
         * @param offset {number} 偏移量
         * @return {number} 0-横向局部偏移量，2-纵向全局偏移量
         */
        function locateRange(container, offset) {
            const top = findParentTag(
                container, item => item.parentElement === KRICH_EDITOR
            )
            let yOffset = 0
            for (let item of KRICH_EDITOR.children) {
                if (item === top) break
                yOffset += item.textContent.length
            }
            if (!top.firstChild) {
                console.assert(offset === 0, 'offset 应当等于 0', offset)
                return yOffset
            }
            let x = 0
            let node = getFirstTextNode(top)
            while (node !== container) {
                x += node.textContent.length
                node = nextSiblingText(node)
            }
            return yOffset + x + offset
        }
        const range = this
        const {startContainer, startOffset, endContainer, endOffset} = range
        const startLocation = locateRange(startContainer, startOffset)
        if (range.collapsed) return [startLocation]
        const endLocation = locateRange(endContainer, endOffset)
        return [startLocation, endLocation]
    }

    /**
     * 从 data 中恢复数据
     * @param data {[number,number]|[number, number, number, number]}
     */
    deserialized(data) {
        const [start, end] = data
        this.setStart(KRICH_EDITOR, start)
        if (data.length === 1) {
            this.collapse(true)
        } else {
            this.setEnd(KRICH_EDITOR, end)
        }
    }

    /**
     * 通过行切分 Range
     * @return {KRange[]}
     */
    splitLine() {
        const {startContainer, endContainer, startOffset, endOffset} = this
        let lines = this.getAllTopElements()
        let length = lines.length
        while (true) {
            lines = lines.flatMap(it => TOP_LIST.includes(it.firstChild?.nodeName) ? Array.from(it.children) : [it])
            const newLength = lines.length
            if (newLength === length) break
            length = newLength
        }
        lines = lines.filter(it => !isEmptyBodyElement(it))
        length = lines.length
        if (length === 1) return [this.copy()]
        return lines.map((item, index) => {
            let newRange
            if (index === 0) {
                newRange = new KRange()
                newRange.setStart(startContainer, startOffset)
                newRange.setEndAfter(item)
            } else if (index === length - 1) {
                newRange = new KRange()
                newRange.setStartBefore(item)
                newRange.setEnd(endContainer, endOffset)
            } else {
                newRange = KRange.selectNodeContents(item)
            }
            return newRange
        })
    }

    /**
     * 获取所有被包含的行
     * @return {Element[]}
     */
    getAllTopElements() {
        const {commonAncestorContainer, startContainer, endContainer} = this
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
     * 拷贝对象
     * @return {KRange}
     */
    copy() {
        return new KRange(this)
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
     * @param data {[number,number]|[number, number, number, number]}
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

/**
 * 通过下标查找 Text
 * @param node {Node} 查找范围约束
 * @param index {number} 下标
 * @param focusHead {boolean} 是否将焦点聚焦到开头
 * @return {[Text, number]}
 */
function findTextByIndex(node, index, focusHead) {
    let text = getFirstTextNode(node)
    while (true) {
        console.assert(!!text, '下标超限', node)
        const length = text.textContent.length
        const next = nextSiblingText(text, node)
        if (focusHead) {
            if (index < length || (!next && index === length)) return [text, index]
        } else if (index <= length) return [text, index]
        index -= length
        text = next
    }
}