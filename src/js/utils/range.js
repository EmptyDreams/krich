import {KRICH_EDITOR, TMP_HASH_NAME, TOP_LIST} from '../vars/global-fileds'
import {
    calcDomRectDif,
    eachDomTree,
    findParentTag, getFirstChildNode,
    getLastChildNode,
    getLastTextNode, mergeSameElement, nextLeafNode,
    nextSiblingText, prevLeafNode,
    zipTree
} from './dom'
import {
    createElement, createHash,
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
    const range = new KRange()
    range.setStart(node, index)
    range.collapse(true)
    range.active()
}

/**
 * 将光标移动到指定元素的结尾
 * @param node {Node} 指定元素
 * @param doIt {boolean} 是否修改指针
 * @return {KRange}
 */
export function setCursorPositionAfter(node, doIt = true) {
    let range = checkEmptyBodyElement(node)
    if (range) return range
    range = new KRange()
    range.setStartAfter(node)
    range.collapse(true)
    if (doIt) range.active()
    return range
}

/**
 * 将光标移动到指定元素的开头
 * @param node {Node} 指定元素
 * @param doIt {boolean} 是否修改指针
 * @return {KRange}
 */
export function setCursorPositionBefore(node, doIt = true) {
    let range = checkEmptyBodyElement(node)
    if (range) return range
    range = new KRange()
    range.setStartBefore(node)
    range.collapse(true)
    if (doIt) range.active()
    return range
}

function checkEmptyBodyElement(node) {
    if (isEmptyBodyElement(node)) {
        const range = new KRange(node)
        range.active()
        return range
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
     * @param optional {Range|StaticRange|HTMLElement|undefined}
     * @param cancelEbeOptimize {boolean?} 是否取消对 EBE 元素的优化
     */
    constructor(optional = undefined, cancelEbeOptimize) {
        super()
        if (!optional) return
        if (optional.nodeName) {
            console.assert(isEmptyBodyElement(optional), 'KRange 传入 HTMLElement 对象时仅允许传入 EmptyBodyElement')
            this.body = optional
            this.selectNode(optional)
            return
        }
        let {startContainer, startOffset, endContainer, endOffset, collapsed} = optional
        if (collapsed && !cancelEbeOptimize) {
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
            if (node) this.setStartBefore(node)
            else this.setStartAfter(startContainer)
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
        console.assert(!this.collapsed, '调用 endInclude 时 KRange 应当不是 collapsed 状态')
        const {endContainer, endOffset} = this
        if (!endOffset) {
            console.assert(this.commonAncestorContainer.contains(prevLeafNode(endContainer)), '终点前的节点不在选区范围内')
            return prevLeafNode(endContainer)
        }
        if (isTextNode(endContainer)) {
            return endContainer
        } else {
            console.assert(endContainer.childNodes.length > 0, 'endContainer 应该包含子节点')
            return endContainer.childNodes[endOffset - 1]
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
        if (prevNode) this.setEndAfter(prevNode)
        else {
            const firstChild = getFirstChildNode(node)
            this.setEnd(firstChild, 0)
        }
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

    selectNode(node) {
        this.setStartBefore(node)
        this.setEndAfter(node)
    }

    /**
     * 将当前区间设定为激活区间
     * @param force {boolean} 是否强制激活
     * @return {KRange} 返回自身
     */
    active(force = false) {
        KRICH_EDITOR.focus()
        const selection = getSelection()
        if (!force && selection.rangeCount && selection.getRangeAt(0) === this) return this
        selection.removeAllRanges()
        selection.addRange(this)
        return this
    }

    /**
     * 判断 `realStartContainer` 和 `endInclude` 中是否存在满足指定要求的变量
     * @param predicate {function(Node): any}
     * @return {any}
     */
    some(predicate) {
        let result = predicate(this.realStartContainer())
        if (result) return result
        if (this.collapsed) return
        result = predicate(this.endInclude())
        if (result) return result
    }

    /**
     * 判断 `realStartContainer` 和 `endInclude` 中是否有且仅有一个满足指定要求
     * @param predicate {function(Node):any}
     * @return {boolean|undefined}
     */
    only(predicate) {
        if (this.collapsed) return
        const start = predicate(this.realStartContainer())
        const end = predicate(this.endInclude())
        return (start || end) && (!start || !end)
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
     * @return {number} 切分类型：-1-切分内容在左侧、0-三段式切割、1-切分内容在右侧、2 没有进行切割
     */
    surroundContents(container, lca) {
        console.assert(!this.collapsed, `collapsed 的 KRange 不应当调用 surroundContents`, this)
        const commonAncestorContainer = lca ?? this.commonAncestorContainer
        const list = this.splitNode(commonAncestorContainer)
        if (isTextNode(commonAncestorContainer)) {
            list[1].before(container)
            container.append(list[1])
            zipTree(list[1].parentElement)
        } else {
            const index = list.findIndex(it => it === commonAncestorContainer)
            container.append(...list[1].childNodes)
            list[1].append(container)
            for (let i = 0; i < list.length; i++) {
                const item = list[i]
                if (i === index || !item) continue
                if (i > index) {
                    commonAncestorContainer.append(...item.childNodes)
                } else {
                    commonAncestorContainer.prepend(...item.childNodes)
                }
                item.remove()
            }
            zipTree(commonAncestorContainer)
        }
        if (list.every(it => it)) return 0
        if (list[0]) return 1
        if (list[2]) return -1
        return 2
    }

    /**
     * 将所选的内容提取出来
     * @param lca {Element} 切割范围，同 {@link #surroundContents} 中的 `lca`
     * @param doIt {boolean} 是否修改 DOM
     * @param cb {function(Element): (any|Promise<any>)?} 对 tmpBox 进行预处理
     * @return {Promise<void>}
     */
    async extractContents(lca, doIt, cb) {
        if (isTextNode(lca)) {
            lca = findParentTag(lca, ['A']) ?? lca
        }
        const tmpBox = createElement('div', ['tmp']);
        // 给切分位置的标签添加临时的 hash 标记
        [this.realStartContainer(), this.endInclude()]
            .map(it => findParentTag(it, node => node.parentNode === lca))
            .forEach(it => it?.setAttribute?.(TMP_HASH_NAME, createHash()))
        this.surroundContents(tmpBox, lca)
        const {firstChild, lastChild, previousSibling, nextSibling} = tmpBox
        /**
         * 移除临时标记
         * @param nodes {Node|Element}
         */
        function removeTmpFlag(...nodes) {
            nodes.forEach(it => it?.removeAttribute?.(TMP_HASH_NAME))
        }
        /**
         * 判断指定标签是否包含临时标记
         * @param node {Node|Element|undefined}
         * @return {boolean | undefined}
         */
        function needMerge(node) {
            // noinspection JSUnresolvedReference
            return node?.hasAttribute?.(TMP_HASH_NAME)
        }
        if (doIt) {
            if (tmpBox.childNodes.length === 1 && isListLine(firstChild)) {
                // 对于从列表中拖动出来的内容，移除最外部的 li 标签
                firstChild.replaceWith(...firstChild.childNodes)
            }
            if (needMerge(previousSibling))
                mergeSameElement(previousSibling, nextSibling)
            removeTmpFlag(previousSibling, nextSibling, ...tmpBox.childNodes)
            if (cb) await cb(tmpBox)
            tmpBox.remove()
        } else {
            if (cb) {
                const clone = tmpBox.cloneNode(true)
                removeTmpFlag(...clone.childNodes)
                await cb(clone)
            }
            tmpBox.replaceWith(...tmpBox.childNodes)
            if (needMerge(nextSibling))
                mergeSameElement(lastChild, nextSibling)
            if (needMerge(previousSibling))
                mergeSameElement(previousSibling, firstChild)
            if (!isTextNode(lca) && !isEmptyBodyElement(lca)) {
                removeTmpFlag(...lca.children)
                zipTree(lca)
            }
        }
    }

    /**
     * 复制范围中的内容
     * @param lca {Element} 切割范围，同 {@link #surroundContents} 中的 `lca`
     * @return {Promise<Element>} 返回一个临时节点，其子节点是提取出来的内容
     */
    cloneContents(lca) {
        return new Promise(resolve => this.extractContents(lca, false, resolve))
    }

    /**
     * 测试 KRange 是否完整的包含了指定节点且只包含指定节点
     * @param node {Node}
     * @return {boolean}
     */
    isCompleteInclude(node) {
        const {startContainer, startOffset, endContainer, endOffset, collapsed} = this
        if (collapsed) return false
        const nodeStart = getFirstChildNode(node)
        const nodeEnd = getLastChildNode(node)
        const rangeStart = this.realStartContainer()
        const rangeEnd = this.endInclude()
        return nodeStart === rangeStart && nodeEnd === rangeEnd &&
            (rangeStart !== startContainer || !startOffset) &&
            (rangeEnd !== endContainer || (isTextNode(rangeEnd) ? rangeEnd.textContent : rangeEnd.childNodes).length === endOffset)
    }

    /**
     * 遍历选区包含的所有节点
     * @template T
     * @param consumer {function(Node|Element): T} 同 {@link eachDomTree} 中的 consumer
     * @return {T} consumer 的返回值
     */
    eachAllNode(consumer) {
        const start = this.realStartContainer()
        if (this.collapsed)
            return consumer(start)
        const end = this.endInclude()
        let response
        eachDomTree(start, true, true, it => {
            response = consumer(it)
            return response || it === end
        })
        return response
    }

    /**
     * 将 Range 信息序列化
     *
     * 每个维度包含三个数据，依次表示：偏移量、EmptyBodyElement 计数、光标位置
     *
     * 光标位置的值意义如下：
     *
     * + 2 - 在当前节点后方
     * + 1  - 在内部
     * + 0  - 在下一个节点的开头
     * + -1 - 在当前节点开头
     *
     * @param refer {Node|Element?} 序列化时的参考元素，序列化时从参考元素后方开始计数，留空从编辑区开头开始计数
     * @return {KRangeData}
     */
    serialization(refer) {
        // 计数起点（包含）
        const countStarting = refer ? nextLeafNode(refer) : getFirstChildNode(KRICH_EDITOR)

        /**
         * 从 `countStarting` 开始遍历文本节点
         * @param end {Node|Element} 遍历结束的位置
         * @param consumer {function(Node)}
         */
        function eachTextNode(end, consumer) {
            eachDomTree(countStarting, true, true, node => {
                if (node === end) return true
                if (isTextNode(node))
                    consumer(node)
            })
        }
        /**
         * @param container {Node} 所在节点
         * @param offset {number} 偏移量
         * @param include {boolean} 是否包含 offset 所指节点
         * @return {[number, number, number]}
         */
        function locateRange(container, offset, include) {
            const isText = isTextNode(container)
            let leafNode = isText ? container : container.childNodes[offset]
            let isAfterThis = false
            if (include && !leafNode) {
                leafNode = container.lastChild ?? container
                isAfterThis = true
            } else if (!include && (!isText || !offset))
                leafNode = leafNode ? prevLeafNode(leafNode) : (container.childNodes[offset - 1] ?? prevLeafNode(container))
            console.assert(!!leafNode, 'leafNode 不应当为空', container, offset, include)
            let emptyCount = 0
            let emptyItem = leafNode
            while (emptyItem && (isBrNode(emptyItem) || isEmptyBodyElement(emptyItem))) {
                ++emptyCount
                emptyItem = prevLeafNode(emptyItem)
            }
            let index = 0
            eachTextNode(leafNode, it => index += it.textContent.length)
            let type = 0
            if (include) {
                if (isAfterThis) {
                    type = 2
                } else if (isBrNode(leafNode) || isEmptyBodyElement(leafNode)) {
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
        if (this.collapsed) return [refer, ...startLocation]
        const endLocation = locateRange(endContainer, endOffset, false)
        return [refer, ...startLocation, ...endLocation]
    }

    /**
     * 从 data 中恢复数据
     * @param data {KRangeData}
     * @return {KRange} 返回 this
     */
    deserialized(data) {
        let [
            refer,
            startIndex, startEmptyCount, startType,
            endIndex, endEmptyCount
        ] = data
        const starting = refer ? nextLeafNode(refer) : getFirstChildNode(KRICH_EDITOR)
        /**
         * @param index {number}
         * @param emptyCount {number}
         * @param type {number}
         * @return {[Node, number]}
         */
        function findNode(index, emptyCount, type) {
            let pos = 0
            let item = starting
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
                    switch (type) {
                        case -1: return [item, -1]
                        case 1: return [item, index - pos]
                        case 2: return [item, -2]
                        case 0: return [nextLeafNode(item), -1]
                    }
                    console.error('解序列化时不应当执行该语句 0')
                } else {
                    pos = nextPos
                }
                item = nextLeafNode(item)
            } while (item)
            console.error('解序列化时不应当执行该语句 1')
        }
        const [startContainer, startOffset] = findNode(startIndex, startEmptyCount, startType)
        if (startOffset === -1) {
            this.setStartBefore(startContainer)
        } else if (startOffset === -2) {
            this.setStartAfter(startContainer)
        } else {
            this.setStart(startContainer, startOffset)
        }
        if (data.length < 5) {
            this.collapse(true)
            return this
        }
        const [endContainer, endOffset] = findNode(endIndex, endEmptyCount, -1)
        if (startContainer === endContainer && isEmptyBodyElement(startContainer)) {
            this.body = startContainer
        }
        if (endOffset < 0) {
            this.setEndAfter(endContainer)
        } else {
            super.setEnd(endContainer, endOffset)
        }
        return this
    }

    /**
     * 通过行切分 KRange，不会影响当前 KRange 对象
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
            const newRange = new KRange()
            newRange.selectNode(item)
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
     * @param root {Node} 切分的根，切分时不会影响 `root` 的父级节点
     * @return {[Node|Element?, Node|Element?, Node|Element?]} 中间为选区选中的范围
     */
    splitNode(root) {
        /**
         * 通过下标切分文本节点
         * @param node {Node|Element} 切分起始节点
         * @param offset {number|Node} 偏移量，该点指向的值分配到右侧
         * @param tree {Node?} 已生成的树结构
         * @param isCreated {boolean?} 标记已生成的 tree 是否是新建的
         * @return {Node|undefined|false} 生成的树结构的顶层节点
         */
        function splitNodeHelper(node, offset, tree, isCreated) {
            let newNode
            const initNewNode = () => newNode = node.cloneNode(false)
            if (tree) {     // 如果已经存在生成的树结构，那么必然不会进入后续的 if
                if (isCreated || offset.previousSibling) {
                    initNewNode()
                    // 将 offset 右侧的节点移动到 newNode 中
                    // 由于 append(tree) 有可能破坏当前 DOM 结构，所以先拷贝到数组中备份
                    /** @type {Node[]} */
                    const list = []
                    let next = offset.nextSibling
                    while (next) {
                        list.push(next)
                        next = next.nextSibling
                    }
                    newNode.append(tree)
                    newNode.append(...list)
                } else {
                    // 如果已有的树结构不是克隆出来的，并且 offset 左侧没有任何节点则直接复用 node
                    // 代码一定不会永远进入此分支，如果持续到 root 仍然进入此分支说明判断是否需要切割的代码存在问题
                    newNode = node
                }
            } else if (!offset && isBrNode(node)) { // 处理 br 节点
                // 如果 offset = 0 并且当前节点是 br 节点，则直接复用 node
                newNode = node
            } else if (isTextNode(node)) {  // 处理文本节点
                // 如果 offset = 0 并且 node 的左侧节点不在 root 中说明该切割点已经分离无需切割
                if (!offset && !root.contains(prevLeafNode(node, true))) return false
                const textContent = node.textContent
                // 如果 offset 指向了不存在的字符，那么尝试将切割点转移到下一个节点开头
                if (offset === textContent.length) {
                    const next = nextLeafNode(node, true)
                    // 如果下一个节点不在 root 中说明无需切割
                    return root.contains(next) ? splitNodeHelper(next, 0) : null
                }
                if (!offset) {
                    // 如果切割点在最左侧直接复用 node
                    newNode = node
                } else {
                    // 切割点在中间则进行拷贝并修改 node 的值
                    initNewNode()
                    newNode.textContent = textContent.substring(offset)
                    node.textContent = textContent.substring(0, offset)
                }
            } else {    // 处理非文本节点
                console.assert(typeof offset === 'number', 'offset 必须传入 number', offset)
                const childNodes = node.childNodes
                // 判断是否指向了一个 ebe
                const isEbe = !offset && isEmptyBodyElement(node)
                // 获取真实指向的节点
                const realNode = isEbe ? node : childNodes[offset]
                // 如果指向了一个不存在的节点，则尝试将切割点移动到 node 后方的节点的开头
                if (!realNode) {
                    const next = nextLeafNode(node, true)
                    // 如果下一个节点不在 root 当中说明无需切割
                    return root.contains(next) ? splitNodeHelper(next, 0) : null
                }
                // 当 offset = 0 时判断是否需要切割
                if (!offset) {
                    const prev = prevLeafNode(node, true)
                    // 上一个节点不在 root 中时表明无需切割
                    if (!root.contains(prev)) return false
                }
                if (isEbe) {
                    // 如果指向了 ebe 直接复用
                    newNode = node
                } else {
                    // 否则克隆结构
                    initNewNode()
                    while (offset !== childNodes.length)
                        newNode.append(childNodes[offset])
                }
            }
            if (node === root) {    // 切分到 root 时停止递归
                console.assert(newNode !== root, 'newNode 不应当等于 root')
                // 将新生成的结构插入到 root 右侧
                root.after(newNode)
                return newNode
            } else {    // 递归克隆父级结构（包括右侧在 root 中的节点）
                return splitNodeHelper(node.parentNode, node, newNode, node !== newNode)
            }
        }
        const {startContainer, startOffset, endContainer, endOffset, collapsed} = this
        const right = splitNodeHelper(endContainer, endOffset)
        if (collapsed) return right === false ? [null, root] : [root, right]
        const mid = splitNodeHelper(startContainer, startOffset)
        return [mid ? root : null, mid || root, right]
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
        const {startContainer, startOffset, endContainer, collapsed} = this
        const realStartContainer = this.realStartContainer()
        const fixed = startContainer !== realStartContainer
        let index = fixed ? 0 : startOffset
        /** @type {Text|Node} */
        let insertedNode
        if (collapsed) {
            if (!text || !isTextNode(realStartContainer)) return false
            insertedNode = realStartContainer
        } else {
            const startTopLine = findParentTag(startContainer, TOP_LIST)
            const endTopLine = findParentTag(endContainer, TOP_LIST)
            // 判断修改文本后是否需要合并前后行
            const merge = startTopLine !== endTopLine && !this.isCompleteInclude(startTopLine) && !this.isCompleteInclude(endTopLine)
            const tmpBox = createElement('div', ['tmp'])
            this.surroundContents(tmpBox)
            const left = tmpBox.previousSibling
            const right = tmpBox.nextSibling
            tmpBox.remove()
            index = 0
            if (text) {
                insertedNode = createElement('br')
                if (merge) {
                    left.append(insertedNode, ...right.childNodes)
                }
            } else {
                if (left) {
                    const pos = getLastChildNode(left)
                    if (merge) left.append(...right.childNodes)
                    setCursorPositionAfter(pos)
                } else if (right) {
                    setCursorPositionBefore(right)
                } else {
                    KRICH_EDITOR.innerHTML = '<p><br></p>'
                    setCursorPositionBefore(KRICH_EDITOR)
                }
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
     * 将指定元素滚动到 KRange 可见
     * @param ref {Element}
     * @param behavior {ScrollBehavior}
     */
    scroll(ref, behavior) {
        const rect = this.getBoundingClientRect()
        const {b: bottom, t: top} = calcDomRectDif(rect, KRICH_EDITOR.getBoundingClientRect())
        if (top < 10) {
            ref.scroll({
                behavior,
                top: ref.scrollTop - Math.abs(top) - 10
            })
        } else {
            const difBottom = ref.clientHeight - bottom
            if (difBottom < 40) {
                ref.scroll({
                    behavior,
                    top: ref.scrollTop + Math.abs(difBottom) + 40
                })
            }
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
            result = new KRange(document.caretRangeFromPoint(x, y), true)
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