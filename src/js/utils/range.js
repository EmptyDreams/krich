import {KRICH_EDITOR, TOP_LIST} from '../global-fileds'
import {
    findParentTag,
    getFirstTextNode,
    getLastTextNode,
    nextSiblingText,
    prevSiblingText,
    splitElementByContainer,
    zipTree
} from './dom'
import {isEmptyBodyElement} from './tools'

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
            optional.classList.add('active')
            return
        }
        const {startContainer, startOffset, endContainer, endOffset} = optional
        const checkStatus = node => !['#text', 'BR'].includes(node.nodeName)
        const startStatus = checkStatus(startContainer)
        const endStatus = checkStatus(endContainer)
        // 如果起点或结尾不是 TEXT NODE 则进行纠正
        const setEndAfter = node => {
            const text = getLastTextNode(node)
            super.setEnd(text, text.textContent.length)
        }
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
                    while (isEmptyBodyElement(point))
                        point = prevSiblingText(point)
                    setEndAfter(point)
                }
            } else {
                super.setEnd(startContainer, startOffset)
            }
            if (!this.body)
                super.collapse(false)
        } else {
            if (startStatus) {
                let start = startContainer.childNodes[startOffset]
                while (isEmptyBodyElement(start))
                    start = nextSiblingText(start)
                super.setStart(getFirstTextNode(start), 0)
            } else if (startContainer.textContent.length === startOffset) {
                super.setStart(nextSiblingText(startContainer), 0)
            } else {
                super.setStart(startContainer, startOffset)
            }
            if (endStatus) {
                let end = endOffset === 0 ? prevSiblingText(endContainer) : endContainer.childNodes[endOffset - 1]
                while (isEmptyBodyElement(end))
                    end = prevSiblingText(end)
                setEndAfter(end)
            } else {
                super.setEnd(endContainer, endOffset)
            }
        }
        console.assert(
            this.body || [this.startContainer, this.endContainer].every(it => ['#text', 'BR'].includes(it.nodeName)),
            'KRange 的起点或终点不在 TEXT NODE 中', this
        )
    }

    /**
     * 设置区间在指定位置开始
     * @param node {Node}
     * @param offset {number}
     */
    setStart(node, offset) {
        const [text, index] = findTextByIndex(node, offset, true)
        super.setStart(text, index)
    }

    /**
     * 设置区间在指定位置结束
     * @param node {Node}
     * @param offset {number}
     */
    setEnd(node, offset) {
        const [text, index] = findTextByIndex(node, offset, false)
        super.setEnd(text, index)
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
        if (selection.getRangeAt(0) === this) return
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
     * @param container {HTMLElement} 容器
     * @return {void}
     */
    surroundContents(container) {
        const {startContainer, endContainer, startOffset, endOffset, commonAncestorContainer} = this
        console.assert(
            ['BR', '#text'].includes(startContainer.nodeName) && ['BR', '#text'].includes(endContainer.nodeName),
            'Range 始末位置都应在 TEXT NODE 当中', this
        )
        if (startContainer === endContainer && startOffset === 0 && endOffset === startContainer.textContent.length) {
            startContainer.parentNode.insertBefore(container, startContainer)
            container.append(startContainer)
        } else {
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
        const lines = this.getAllTopElements()
        if (lines.length === 1) return [this.copy()]
        return lines.map((item, index) => {
            let newRange
            if (index === 0) {
                newRange = new KRange()
                newRange.setStart(startContainer, startOffset)
                newRange.setEndAfter(item)
            } else if (index === lines.length - 1) {
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
     * @return {HTMLElement[]}
     */
    getAllTopElements() {
        const {commonAncestorContainer, startContainer, endContainer} = this
        const firstChild = commonAncestorContainer.firstChild
        /**
         * 三元表达式表达式为 true 时表明选区最近公共祖先不是顶层标签。
         * 如果 LCA 的子节点是顶层元素，那么就返回选区在 LCA 下的直接子标签；
         * 否则返回选区的首个顶层标签父节点。
         * @type {string[]|function(Node|HTMLElement):boolean}
         */
        const checker = !firstChild || findParentTag(firstChild, TOP_LIST) !== firstChild ?
            TOP_LIST : it => it.parentNode === commonAncestorContainer
        const start = findParentTag(startContainer, checker)
        const end = findParentTag(endContainer, checker)
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
        return new KRange(this)
    }

    /**
     * 获取当前的激活 KRange
     * @return {KRange}
     */
    static activated() {
        const selection = getSelection()
        if (selection.rangeCount !== 0) {
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