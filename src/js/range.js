import {
    cloneDomTree,
    findIndexInCollection,
    findParentTag,
    getFirstTextNode,
    getLastTextNode,
    nextSiblingText
} from './utils'
import {KRICH_EDITOR, TOP_LIST} from './global-fileds'

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
    const last = getLastTextNode(node)
    setCursorPosition(last, last.textContent.length)
}

/**
 * 将光标移动到指定元素的开头
 * @param node {Node}
 */
export function setCursorPositionBefore(node) {
    setCursorPosition(getFirstTextNode(node), 0)
}

export class KRange {

    /** @type {Range} */
    item

    /**
     * 从 Range 构建一个 KRange
     * @param range {Range|undefined}
     */
    constructor(range = undefined) {
        if (!range) {
            this.item = document.createRange()
            return
        }
        const {startContainer, startOffset, endContainer, endOffset} = range
        const checkStatus = node => !['#text', 'BR'].includes(node.nodeName)
        const startStatus = checkStatus(startContainer)
        const endStatus = checkStatus(endContainer)
        // 如果起点或结尾不是 TEXT NODE 则进行纠正
        if (startStatus || endStatus) {
            const newRange = document.createRange()
            function setEndAfter(node) {
                const text = getLastTextNode(node)
                newRange.setEnd(text, text.textContent.length)
            }
            if (range.collapsed) {
                if (startStatus) {
                    setEndAfter(startContainer.childNodes[startOffset])
                } else {
                    newRange.setEnd(startContainer, startOffset)
                }
                newRange.collapse(false)
            } else {
                if (startStatus) {
                    const start = startContainer.childNodes[startOffset]
                    newRange.setStart(getFirstTextNode(start), 0)
                } else if (startContainer.textContent.length === startOffset) {
                    newRange.setStart(nextSiblingText(startContainer), 0)
                } else {
                    newRange.setStart(startContainer, startOffset)
                }
                if (endStatus) {
                    const end = endContainer.childNodes[endOffset - 1]
                    setEndAfter(end)
                } else {
                    newRange.setEnd(endContainer, endOffset)
                }
            }
            range = newRange
        }
        this.item = range
        console.assert(
            ![range.startContainer, range.endContainer].find(it => !['#text', 'BR'].includes(it.nodeName)),
            'KRange 的起点或终点不在 TEXT NODE 中', range
        )
    }

    /**
     * 设置区间在指定位置开始
     * @param node {Node}
     * @param offset {number}
     */
    setStart(node, offset) {
        const [text, index] = findTextByIndex(node, offset, true)
        this.item.setStart(text, index)
    }

    /**
     * 设置区间在指定位置结束
     * @param node {Node}
     * @param offset {number}
     */
    setEnd(node, offset) {
        const [text, index] = findTextByIndex(node, offset, false)
        this.item.setEnd(text, index)
    }

    /**
     * 设置区间在指定节点前开始
     * @param node {Node}
     */
    setStartBefore(node) {
        this.setStart(node, 0)
    }

    /**
     * 设置区间在指定节点后结束
     * @param node {Node}
     */
    setEndAfter(node) {
        const text = getLastTextNode(node)
        this.setEnd(text, text.textContent.length)
    }

    /** 将当前区间设定为激活区间 */
    active() {
        const selection = getSelection()
        selection.removeAllRanges()
        selection.addRange(this.item)
    }

    /**
     * 判断两个 KRange 是否相等
     * @param that {KRange}
     */
    equals(that) {
        const thisRange = this.item
        const thatRange = that.item
        if (thisRange === thatRange) return true
        const list = ['collapsed', 'startContainer', 'endContainer', 'startOffset', 'endOffset']
        return !list.find(it => thisRange[it] !== thatRange[it])
    }

    /**
     * @return {{next: (function(): {value: Node, done: boolean})}}
     */
    [Symbol.iterator]() {
        const range = this.item
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
     * @param container {HTMLElement} 容器
     * @return {void}
     */
    surroundContents(container) {
        const range = this.item
        const {startContainer, endContainer, startOffset, endOffset, commonAncestorContainer} = range
        console.assert(
            startContainer.nodeType === endContainer.nodeType && startContainer.nodeType === Node.TEXT_NODE,
            'Range 始末位置都应在 TEXT NODE 当中', range
        )
        if (startContainer === endContainer)
            return range.surroundContents(container)
        /** @param consumer {function(Text)} */
        function forEachAllTextNode(consumer) {
            const array = []
            let dist = startContainer
            do {
                array.push(dist)
                dist = nextSiblingText(dist)
            } while (dist && range.intersectsNode(dist))
            array.forEach(consumer)
        }
        const breaker = it => it === commonAncestorContainer
        /** @return {Node} */
        const findSecRoot = node => {
            while (!breaker(node.parentNode))
                node = node.parentNode
            return node
        }
        forEachAllTextNode(dist => {
            const textContent = dist.textContent
            let node
            if (dist === startContainer && startOffset !== 0) {
                node = cloneDomTree(dist, textContent.substring(startOffset), breaker)[0]
                dist.textContent = textContent.substring(0, startOffset)
                commonAncestorContainer.insertBefore(container, findSecRoot(dist).nextSibling)
            } else if (dist === endContainer && endOffset !== textContent.length) {
                node = cloneDomTree(dist, textContent.substring(0, endOffset), breaker)[0]
                dist.textContent = textContent.substring(endOffset)
            } else {
                node = cloneDomTree(dist, textContent, breaker)[0]
                dist.textContent = ''
                if (dist === startContainer)
                    commonAncestorContainer.insertBefore(container, findSecRoot(dist))
            }
            container.append(node)
        })
    }

    /**
     * 将 Range 信息序列化
     * @return {[number,number]|[number, number, number, number]}
     */
    serialization() {
        /**
         * 获取指定
         * @param container {Text} 所在节点
         * @param offset {number} 偏移量
         * @return {[number, number]} 0-横向局部偏移量，2-纵向全局偏移量
         */
        function locateRange(container, offset) {
            const top = findParentTag(container, ...TOP_LIST)
            const y = findIndexInCollection(KRICH_EDITOR.children, top)
            if (!top.firstChild) {
                console.assert(offset === 0, 'offset 应当等于 0', offset)
                return [0, y]
            }
            let x = 0
            let node = getFirstTextNode(top)
            while (node !== container) {
                x += node.textContent.length
                node = nextSiblingText(node)
            }
            return [x + offset, y]
        }
        const range = this.item
        const {startContainer, startOffset, endContainer, endOffset} = range
        const startLocation = locateRange(startContainer, startOffset)
        if (range.collapsed) return startLocation
        const endLocation = locateRange(endContainer, endOffset)
        return [...startLocation, ...endLocation]
    }

    /**
     * 通过行切分 Range
     * @return {KRange[]}
     */
    splitLine() {
        const range = this.item
        const {startContainer, endContainer} = range
        const lines = this.getAllTopElements()
        if (lines.length === 1) return [this.copy()]
        return lines.map((item, index) => {
            let newRange
            if (index === 0) {
                newRange = new KRange()
                newRange.setStart(startContainer, range.startOffset)
                newRange.setEndAfter(item)
            } else if (index === lines.length - 1) {
                newRange = new KRange()
                newRange.setStartBefore(item)
                newRange.setEnd(endContainer, range.endOffset)
            } else {
                newRange = KRange.selectNodeContents(item)
            }
            return newRange
        })
    }

    /**
     * 获取所有被包含的行
     * @return {HTMLElement[]}
     */
    getAllTopElements() {
        const range = this.item
        const start = findParentTag(range.startContainer, ...TOP_LIST)
        const end = findParentTag(range.endContainer, ...TOP_LIST)
        const result = []
        let item = start
        while (true) {
            result.push(item)
            if (item === end) return result
            item = item.nextElementSibling
        }
    }

    /**
     * 拷贝对象
     * @return {KRange}
     */
    copy() {
        return new KRange(this.item)
    }

    /**
     * 获取当前的激活 KRange
     * @return {KRange}
     */
    static activated() {
        return new KRange(getSelection().getRangeAt(0))
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
        const first = ranges[0].item
        const last = ranges[ranges.length - 1].item
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
        const [startX, startY] = data
        const topChildren = KRICH_EDITOR.children
        const range = new KRange()
        range.setStart(topChildren[startY], startX)
        if (data.length === 2) {
            range.item.collapse(true)
            return range
        }
        const endX = data[2]
        const endY = data[3]
        range.setEnd(topChildren[endY], endX)
        return range
    }

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
        const next = nextSiblingText(text)
        if (focusHead) {
            if (index < length || (!next && index === length)) return [text, index]
        } else if (index <= length) return [text, index]
        index -= length
        text = next
    }
}