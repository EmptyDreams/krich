import {KRICH_EDITOR, TOP_LIST} from '../vars/global-fileds'
import {
    eachDomTree,
    findParentTag, getFirstChildNode,
    getLastChildNode,
    getLastTextNode, nextLeafNode,
    nextSiblingText, prevLeafNode,
    zipTree
} from './dom'
import {
    createElement,
    isBrNode,
    isEmptyBodyElement,
    isEmptyLine,
    isKrichEditor, isListLine,
    isMarkerNode,
    isTextNode
} from './tools'
import {insertTextToString} from './string-utils'
import {isMultiEleStruct} from '../types/button-behavior'

/**
 * 将焦点设置到指定位置
 * @param node {Node}
 * @param index {number}
 */
export function setCursorAt(node, index) {
    getSelection().collapse(node, index)
}

/**
 * 将光标移动到指定元素的结尾
 * @param node {Node}
 */
export function setCursorPositionAfter(node) {
    if (checkEmptyBodyElement(node)) return
    const range = new KRange()
    range.setStartAfter(node)
    range.collapse(true)
    range.active()
}

/**
 * 将光标移动到指定元素的开头
 * @param node {Node}
 */
export function setCursorPositionBefore(node) {
    if (checkEmptyBodyElement(node)) return
    const range = new KRange()
    range.setStartBefore(node)
    range.collapse(true)
    range.active()
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
        let {startContainer, startOffset, endContainer, endOffset, collapsed} = optional
        if (collapsed) {
            if (!isTextNode(startContainer)) {
                if (isEmptyBodyElement(startContainer)) {
                    this.body = startContainer
                } else {
                    const now = startContainer.childNodes[startOffset]
                    if (isEmptyBodyElement(now)) {
                        // noinspection JSValidateTypes
                        this.body = now
                    } else if (startOffset) {
                        const prev = startContainer.childNodes[startOffset - 1]
                        if (isEmptyBodyElement(prev))
                            this.body = prev
                    }
                }
                if (this.body)
                    return super.selectNode(this.body)
            }
        }
        if (!isTextNode(startContainer) && !isEmptyBodyElement(startContainer)) {
            const node = startContainer.childNodes[startOffset]
            this.setStartBefore(node)
        } else {
            super.setStart(startContainer, startOffset)
        }
        if (collapsed) {
            this.collapse(true)
        } else if (!isTextNode(endContainer) && !isEmptyBodyElement(endContainer)) {
            const node = endContainer.childNodes[endOffset]
            if (node) this.setEndBefore(node)
            else this.setEndAfter(endContainer)
        } else {
            super.setEnd(endContainer, endOffset)
        }
    }

    /**
     * 获取真实的起始节点
     * @return {Node|Element}
     */
    realStartContainer() {
        const {startContainer, startOffset} = this
        return startContainer.childNodes[startOffset] ?? startContainer
    }

    /**
     * 获取真实的终止节点
     * @return {Node|Element}
     */
    realEndContainer() {
        const {endContainer, endOffset} = this
        return (isTextNode(endContainer) || isEmptyBodyElement(endContainer)) ?
            endContainer :
            (endContainer.childNodes[endOffset] ?? nextLeafNode(endContainer))
    }

    /**
     * 获取被包含或部分包含的最后一个节点
     * @return {Node}
     */
    endInclude() {
        const {endContainer, endOffset} = this
        const {childNodes} = endContainer
        if (isTextNode(endContainer)) {
            return endContainer
        } else if (childNodes) {
            return endOffset ? childNodes[endOffset - 1] : prevLeafNode(childNodes[endOffset])
        } else {
            console.assert(this.commonAncestorContainer.contains(prevLeafNode(endContainer)), '终点前的节点不在选区范围内')
            return prevLeafNode(endContainer)
        }
    }

    setStartBefore(node) {
        const childNode = getFirstChildNode(node)
        if (isBrNode(childNode)) {
            super.setStartBefore(childNode)
        } else if (isMarkerNode(childNode)) {
            const next = prevLeafNode(childNode)
            if (next) this.setStartAfter(next)
            else this.setStartBefore(nextLeafNode(childNode))
        } else {
            super.setStart(childNode, 0)
        }
    }

    setStartAfter(node) {
        const childNode = getLastChildNode(node)
        if (isTextNode(childNode) && !isBrNode(childNode)) {
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
        this.setEndAfter(prevNode)
    }

    setEndAfter(node) {
        const childNode = getLastChildNode(node)
        if (isTextNode(childNode) && !isBrNode(childNode)) {
            super.setEnd(childNode, childNode.textContent.length)
        } else if (isMarkerNode(childNode)) {
            super.setEnd(nextLeafNode(node), 0)
        } else {
            super.setEndAfter(childNode)
        }
    }

    /**
     * 将当前区间设定为激活区间
     * @param force {boolean} 是否强制激活
     */
    active(force = false) {
        KRICH_EDITOR.focus()
        const selection = getSelection()
        if (!force && selection.rangeCount && selection.getRangeAt(0) === this) return
        selection.removeAllRanges()
        selection.addRange(this)
    }

    /**
     * 判断 `realStartContainer` 和 `realEndContainer` 中是否存在满足指定要求的变量
     * @param predicate {function(Node): any}
     * @return {any}
     */
    some(predicate) {
        let result = predicate(this.realStartContainer())
        if (result) return result
        if (this.collapsed) return
        const end = this.realEndContainer()
        if (end) {
            result = predicate(end)
            if (result) return result
        }
    }

    // /**
    //  * 判断 `realStartContainer` 和 `realEndContainer` 中是否均满足指定要求
    //  * @param predicate {function(Node): any}
    //  * @return {boolean}
    //  */
    // every(predicate) {
    //     return !this.some(it => !predicate(it))
    // }

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
     * 使用指定的容器包裹范围内选中的节点
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
            const list = this.splitNode(commonAncestorContainer)
            if (isTextNode(commonAncestorContainer)) {
                list[1].parentNode.insertBefore(container, list[1])
                container.append(list[1])
                zipTree(list[1].parentElement)
            } else {
                const index = list.findIndex(it => it === commonAncestorContainer)
                container.append(...list[1].childNodes)
                list[1].append(container)
                for (let i = list.length - 1; i >= 0; i--) {
                    const item = list[i]
                    if (i === index || !item) continue
                    if (i > index) {
                        commonAncestorContainer.append(...item.childNodes)
                    } else {
                        while (item.lastChild) {
                            commonAncestorContainer.insertBefore(item.lastChild, commonAncestorContainer.firstChild)
                        }
                    }
                    item.remove()
                }
                zipTree(commonAncestorContainer)
            }
        }
    }

    /**
     * 将 Range 信息序列化
     *
     * 每个维度包含三个数据，依次表示：偏移量、EmptyBodyElement 技术、光标位置
     *
     * 光标位置的值意义如下：
     *
     * + 1  - 在内部
     * + 0  - 在下一个节点的开头
     * + -1 - 在当前节点开头
     *
     * @return {KRangeData}
     */
    serialization() {
        /**
         * @param container {Node} 所在节点
         * @param offset {number} 偏移量
         * @param include {boolean} 是否包含 offset 所指节点
         * @return {[number, number, number]}
         */
        function locateRange(container, offset, include) {
            const isText = isTextNode(container)
            let leafNode = isText ? container : container.childNodes[offset]
            if (include && !offset && !leafNode)
                leafNode = container
            else if (!include && (!isText || !offset))
                leafNode = leafNode ? prevLeafNode(leafNode) : (container.childNodes[offset - 1] ?? prevLeafNode(container))
            console.assert(!!leafNode, 'leafNode 不应当为空', container, offset, include)
            let emptyCount = 0
            let emptyItem = leafNode
            while (emptyItem && (isBrNode(emptyItem) || isEmptyBodyElement(emptyItem))) {
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
            let type = 0
            if (include) {
                if (isBrNode(leafNode)) {
                    type = -1
                } else if (isText) {
                    index += offset
                    type = offset ? 1 : 0
                }
            } else {
                if (isText)
                    index += offset
            }
            if (!index) --emptyCount
            return [index, emptyCount, type]
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
     * @return {KRange} 返回 this
     */
    deserialized(data) {
        let [
            startIndex, startEmptyCount, startType,
            endIndex, endEmptyCount
        ] = data
        /**
         * @param index {number}
         * @param emptyCount {number}
         * @param type {number}
         * @return {[Node, number]}
         */
        function findNode(index, emptyCount, type) {
            let pos = 0
            let item = getFirstChildNode(KRICH_EDITOR)
            if (isMarkerNode(item))
                item = nextLeafNode(item)
            do {
                const length = item.textContent.length
                const nextPos = pos + length
                if (nextPos > index) {
                    return [item, index - pos]
                } else if (nextPos === index) {
                    while (emptyCount-- > 0) {
                        const next = nextLeafNode(item)
                        if (!next || (!isBrNode(next) && !isEmptyBodyElement(next))) break
                        item = next
                    }
                    if (type > 0)
                        return [item, index - pos]
                    if (type < 0)
                        return [item, -1]
                    return [nextLeafNode(item), -1]
                } else {
                    pos = nextPos
                }
                item = nextLeafNode(item)
            } while (item)
            console.error('解序列化时不应当执行该语句')
        }
        const [startContainer, startOffset] = findNode(startIndex, startEmptyCount, startType)
        if (startOffset < 0) {
            this.setStartBefore(startContainer)
        } else {
            this.setStart(startContainer, startOffset)
        }
        if (data.length < 4) {
            this.collapse(true)
            return this
        }
        const [endContainer, endOffset] = findNode(endIndex, endEmptyCount, -1)
        if (endOffset < 0) {
            this.setEndAfter(endContainer)
        } else {
            super.setEnd(endContainer, endOffset)
        }
        return this
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
            lines = lines.flatMap(it => isMultiEleStruct(it) ? Array.from(it.children) : [it])
            const newLength = lines.length
            if (newLength === length) break
            length = newLength
        }
        const worked = lines
            .map((it, index) => [it, index])
            .filter(it => !isEmptyBodyElement(it[0]) && !isEmptyLine(it[0]))
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
     * 通过 KRange 选区切分 DOM 结构
     *
     * @param root {Node} 切分的根，切分时不会影响 [root] 的父级节点
     * @return {[Node|Element|null, Node|Element, Node|Element|null]} 中间为选区选中的范围
     */
    splitNode(root) {
        /**
         * 通过下标切分文本节点
         * @param node {Node} 切分起始节点
         * @param offset {number|Node} 偏移量，该点指向的值分配到右侧
         * @param tree {Node?} 已生成的树结构
         * @return {Node|undefined} 生成的树结构的顶层节点
         */
        function splitNodeHelper(node, offset, tree) {
            /** @type {Node} */
            let newNode
            const initNewNode = () => newNode = node.cloneNode(false)
            if (isTextNode(node)) {
                const textContent = node.textContent
                if (!tree && !offset && !root.contains(prevLeafNode(node)))
                if (offset === textContent.length && !root.contains(nextLeafNode(node)))
                    return root
                initNewNode()
                newNode.textContent = textContent.substring(0, offset)
                node.textContent = textContent.substring(offset)
            } else {
                let prev
                if (typeof offset === 'number') {
                    const realNode = (!offset && isEmptyBodyElement(node)) ? node : node.childNodes[offset]
                    if (!realNode) {
                        console.assert(!tree, 'realNode 为空时 tree 也应当为空')
                        return root
                    }
                    prev = prevLeafNode(realNode)
                    if (!tree) {
                        if (!offset && !root.contains(prev)) {
                            return
                        } else if (offset === node.childNodes.length && !root.contains(realNode)) {
                            return root
                        }
                    }
                }
                if (offset) {
                    initNewNode()
                    for (let i = 0; i !== offset; ++i) {
                        const item = node.firstChild
                        if (!item || item === offset) break
                        newNode.appendChild(item)
                    }
                    if (tree) newNode.appendChild(tree)
                } else {
                    return splitNodeHelper(prev, (isTextNode(prev) ? prev.textContent : prev.childNodes).length)
                }
            }
            if (node === root) {
                return node.parentNode.insertBefore(newNode, node)
            } else {
                return splitNodeHelper(node.parentNode, node, newNode)
            }
        }
        const {startContainer, startOffset, endContainer, endOffset, collapsed} = this
        const left = splitNodeHelper(startContainer, startOffset)
        if (collapsed) return [left, left === root ? null : root]
        const mid = splitNodeHelper(endContainer, endOffset - (startContainer === endContainer ? startOffset : 0))
        return [left === root ? null : left, mid, mid === root ? null : root]
    }

    /**
     * 获取所有被包含的行
     * @return {Element[]}
     */
    getAllTopElements() {
        let {commonAncestorContainer, startContainer, collapsed} = this
        const endContainer = collapsed || this.endInclude()
        const {firstChild, lastChild} = commonAncestorContainer
        /**
         * 是否对公共祖先进行特化处理
         * 为 true 时返回最近公共祖先下的直接子标签
         * @type {boolean}
         */
        const lcaSpecialization = lastChild && [...TOP_LIST, 'LI'].includes(lastChild.nodeName)
        let start, end
        if (lcaSpecialization) {
            const checker = it => {
                const parent = findParentTag(
                    it.parentNode, it => it === commonAncestorContainer || !isListLine(it)
                )
                return parent === commonAncestorContainer || (!parent && isKrichEditor(commonAncestorContainer))
            }
            start = startContainer === commonAncestorContainer ? firstChild : findParentTag(startContainer, checker)
            if (isMarkerNode(start)) start = start.nextSibling
            if (!collapsed) {
                end = endContainer === commonAncestorContainer ? lastChild : findParentTag(endContainer, checker)
            }
        } else {
            start = findParentTag(startContainer, TOP_LIST)
            if (!collapsed) {
                end = findParentTag(endContainer, TOP_LIST)
            }
        }
        console.assert(start, 'start 不能为空')
        const result = []
        let item = start
        while (true) {
            result.push(item)
            if (item === end || !end) {
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
     * 插入文本，如果选区选择了一部分文字，将会替换选择的文字
     * @param text {string} 要插入的文本
     * @return {boolean} 是否插入成功
     */
    insertText(text) {
        const {startContainer, startOffset, collapsed} = this
        const realStartContainer = this.realStartContainer()
        const fixed = startContainer !== realStartContainer
        let index = fixed ? 0 : startOffset
        /** @type {Text|Node} */
        let insertedNode
        if (collapsed) {
            if (!text || !isTextNode(realStartContainer)) return false
            insertedNode = realStartContainer
        } else {
            const tmpBox = createElement('div', ['tmp'])
            this.surroundContents(tmpBox)
            index = 0
            if (text) {
                insertedNode = createElement('br')
                tmpBox.replaceWith(insertedNode)
            } else {
                const list = [[nextLeafNode, setCursorPositionBefore], [prevLeafNode, setCursorPositionAfter]]
                for (let value of list) {
                    insertedNode = value[0](tmpBox)
                    if (insertedNode) {
                        tmpBox.remove()
                        value[1](insertedNode)
                        return true
                    }
                }
                KRICH_EDITOR.innerHTML = '<p><br></p>'
                setCursorPositionBefore(KRICH_EDITOR)
                return true
            }
        }
        if (!isTextNode(insertedNode)) return false
        if (isBrNode(insertedNode)) {
            const node = document.createTextNode(text)
            // noinspection JSCheckFunctionSignatures
            insertedNode.replaceWith(node)
            insertedNode = node
        } else {
            insertedNode.textContent = insertTextToString(insertedNode.textContent, index, text)
        }
        const pos = index + text.length
        setCursorAt(insertedNode, pos)
        return true
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
     * 反序列化数据
     * @param data {KRangeData}
     * @return {KRange}
     */
    static deserialized(data) {
        const range = new KRange()
        return range.deserialized(data)
    }

    /**
     * 通过相对于 document 的坐标获取 KRange
     * @param x {number}
     * @param y {number}
     * @return {KRange}
     */
    static clientPos(x, y) {
        let result
        // noinspection JSUnresolvedReference
        if (document.caretPositionFromPoint) {
            const pos = document.caretPositionFromPoint(x, y)
            result = new KRange()
            // noinspection JSUnresolvedReference
            result.setStart(pos.offsetNode, pos.offset)
            result.collapse(true)
        } else {
            // noinspection JSDeprecatedSymbols
            result = new KRange(document.caretRangeFromPoint(x, y))
        }
        return result
    }

    /**
     * 求两个节点的最近公共祖先
     * @param arg0 {Node}
     * @param arg1 {Node}
     * @return {Node}
     */
    static lca(arg0, arg1) {
        if (arg0 === arg1) return arg0
        const posCompare = arg0.compareDocumentPosition(arg1)
        if (posCompare & Node.DOCUMENT_POSITION_PRECEDING) {
            [arg0, arg1] = [arg1, arg0]
        }
        const range = new KRange()
        range.setStart(arg0, 0)
        range.setEnd(arg1, 0)
        return range.commonAncestorContainer
    }

}