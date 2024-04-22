import {KRange} from './range'
import {recordInput} from '../events/before-input-event'
import {KRICH_EDITOR} from '../vars/global-fileds'
import {eachArray, isTextNode} from './tools'
import {historySize} from '../vars/global-exports-funtions'

/**
 * 管理历史记录
 * @param root {Element}
 * @constructor
 */
export function HistoryManager(root) {
    /** @type {UndoStackFrame[]} */
    const undoStack = []
    /** @type {UndoStackFrame[]} */
    const redoStack = []
    /** @type {UndoStackItem[]} */
    let buffer = []
    /** @type {KRangeData|undefined} */
    let oldRange

    /**
     * 将 buffer 中的内容推送到 undo stack
     */
    const next = this.next = function () {
        if (buffer.length) {
            console.assert(oldRange, '不存在 oldRange 记录')
            redoStack.length = 0
            if (undoStack.length === historySize)
                undoStack.shift()
            const newRange = KRange.activated().serialization()
            undoStack.push({
                data: buffer,
                newRange, oldRange
            })
            buffer = []
        }
        oldRange = null
    }

    /**
     * 初始化 oldRange 的值，若已经初始化则不进行任何操作，调用 {@link #next} 前必须调用该函数
     * @param range {KRange}
     * @param force {boolean?} 是否强制设置，设置为 true 时会先尝试提交一次历史记录
     */
    this.initRange = function (range = KRange.activated(), force) {
        if (force) next()
        if (oldRange) return
        oldRange = range.serialization()
    }

    /**
     * 标记某个节点的更新
     * @param oldNode {Node}
     * @param newNode {Node}
     */
    this.modifyNode = function (oldNode, newNode) {
        buffer.push({
            type: 0,
            pos: position(root, newNode),
            nodes: [oldNode]
        })
    }

    /**
     * 标记某个节点的属性的更新
     * @param element {Element}
     * @param name {string}
     * @param oldValue {string}
     */
    this.modifyAttr = function (element, name, oldValue) {
        buffer.push({
            type: 0,
            pos: position(root, element),
            attr: [name, oldValue]
        })
    }

    /** 工具函数，该分类下的函数会修改 DOM */
    this.utils = {
        /**
         * 将一个节点替换为多个子节点
         * @param oldNode {Node}
         * @param newNodes {Node[]}
         */
        replace: (oldNode, newNodes) => {
            removeAuto([oldNode])
            oldNode.replaceWith(...newNodes)
            addAuto(newNodes)
        }
    }

    /**
     * 推送一个操作
     * @param type {number}
     * @param node {Node}
     * @param nodeList {Node[]}
     * @param offset {number} 偏移量
     */
    function pushOperate(type, node, nodeList, offset = 0) {
        const pos = position(root, node)
        if (pos.length)
            pos[0] += offset
        buffer.push({
            type, pos,
            nodes: nodeList.map(it => it.cloneNode(true))
        })
    }

    /**
     * 标记从指定节点后方移除节点
     * @param node {Node} 定位节点
     * @param removedNodes {Node[]} 被移除的节点列表
     */
    const removeAfter = this.removeAfter = function (node, removedNodes) {
        pushOperate(-2, node, removedNodes)
    }

    /**
     * 标记从指定节点前方移除节点
     * @param node {Node} 定位节点
     * @param removedNodes {Node[]} 被移除的节点列表
     */
    const removeBefore = this.removeBefore = function (node, removedNodes) {
        pushOperate(-1, node, removedNodes, -removedNodes.length)
    }

    /**
     * 标记移除指定节点的所有子节点
     * @param node {Node} 定位节点
     * @param removedNodes {Node[]} 被移除的节点列表
     */
    const removeChild = this.removeChild = function (node, removedNodes) {
        pushOperate(-3, node, removedNodes)
    }

    /**
     * 标记移除指定节点，该函数要求在节点被移除前调用
     * @param removedNodes {Node[]} 被移除的节点列表
     */
    const removeAuto = this.removeAuto = function (removedNodes) {
        const first = removedNodes[0], last = removedNodes[removedNodes.length - 1]
        const prev = first.previousSibling, next = last.nextSibling
        if (prev) {
            removeAfter(prev, removedNodes)
        } else if (next) {
            removeBefore(next, removedNodes)
        } else {
            removeChild(first.parentNode, removedNodes)
        }
    }

    /**
     * 标记在指定节点右侧添加新的节点
     * @param node {Node} 定位节点
     * @param addedNodes {Node[]} 被添加的节点列表
     */
    const addAfter = this.addAfter = function (node, addedNodes) {
        pushOperate(2, node, addedNodes)
    }

    /**
     * 标记在指定节点左侧添加新的节点
     * @param node {Node} 定位节点
     * @param addedNodes {Node[]} 被添加的节点列表
     */
    const addBefore = this.addBefore = function (node, addedNodes) {
        pushOperate(1, node, addedNodes, addedNodes.length)
    }

    /**
     * 标记为指定节点添加子节点
     * @param node {Node}
     * @param addedNodes {Node[]}
     */
    const addChild = this.addChild = function (node, addedNodes) {
        pushOperate(3, node, addedNodes)
    }

    /**
     * 标记添加指定节点，该函数调用时要求节点已经被添加到 DOM 中
     * @param addedNodes {Node[]}
     */
    const addAuto = this.addAuto = function (addedNodes) {
        const first = addedNodes[0], last = addedNodes[addedNodes.length - 1]
        const prev = first.previousSibling, next = last.nextSibling
        if (prev) {
            addAfter(prev, addedNodes)
        } else if (next) {
            addBefore(next, addedNodes)
        } else {
            addChild(first.parentNode, addedNodes)
        }
    }

    /** 撤回 */
    this.undo = function () {
        recordInput(true)
        const item = undoStack.pop()
        if (!item) return
        handleStackItem(root, item.data, false)
        redoStack.push(item)
        KRange.deserialized(item.oldRange).active()
    }

    /** 重做 */
    this.redo = function () {
        recordInput(true)
        const item = redoStack.pop()
        if (!item) return
        handleStackItem(root, item.data, true)
        undoStack.push(item)
        KRange.deserialized(item.newRange).active()
    }
}

/**
 * 处理 UndoStackItem
 * @param root {Element}
 * @param data {UndoStackItem[]}
 * @param isRedo {boolean}
 */
function handleStackItem(root, data, isRedo) {
    eachArray(data, isRedo, (i, dataItem) => {
        const {
            pos, type,
            nodes, oldText, oldAttr
        } = dataItem
        const target = unPosition(KRICH_EDITOR, pos)
        data[i] = flipItem(dataItem, target)
        if (type < 0) { // 取消删除
            const nodesCopy = nodes.map(it => it.cloneNode(true))
            switch (type) {
                case -3:
                    target.append(...nodesCopy)
                    break
                case -2:
                    target.after(...nodesCopy)
                    break
                case -1:
                    target.before(...nodesCopy)
                    break
            }
        } else if (type > 0) {  // 取消插入
            let amount = nodes.length
            switch (type) {
                case 1:
                    while (amount--)
                        target.previousSibling.remove()
                    break
                case 2:
                    while (amount--)
                        target.nextSibling.remove()
                    break
                case 3:
                    console.assert(target.childNodes.length === amount, '进入此分支时子节点数量应当和插入数量相同')
                    target.innerHTML = ''
                    break
            }
        } else if (nodes) {     // 回退节点替换
            console.assert(nodes.length === 1, 'nodes 长度应当为 1')
            target.replaceWith(nodes[0])
        } else if (oldAttr) {   // 回退属性修改
            const [key, value] = oldAttr
            if (value) target.setAttribute(key, value)
            else target.removeAttribute(key)
        } else {    // 回退文本修改
            console.assert(isTextNode(target), "进入此分支时 target 应该为文本节点", target, pos, oldText)
            target.textContent = oldText
        }
    })
}

/**
 * 翻转 StackItem 的操作，不修改传入的对象
 * @param stackItem {UndoStackItem}
 * @param target {Node|Element}
 * @return {UndoStackItem}
 */
function flipItem(stackItem, target) {
    const {
        type, pos,
        oldAttr, nodes
    } = stackItem
    const cpyItem = {
        ...stackItem,
        type: -type
    }
    if (!type) {
        if (nodes) {
            cpyItem.nodes = [target.cloneNode(true)]
        } else if (oldAttr) {
            const key = oldAttr[0]
            cpyItem.oldAttr = [key, target.getAttribute(key)]
        } else {
            cpyItem.oldText = target.textContent
        }
    } else if (Math.abs(type) === 1) {
        const cpyPos = cpyItem.pos = [...pos]
        cpyPos[0] -= nodes.length * type
    }
    return cpyItem
}

/**
 * 获取一个节点的坐标
 * @param root {Node} 根节点对象
 * @param node {Node} 当前节点对象
 * @return {number[]}
 */
function position(root, node) {
    /**
     * 计算一个节点在其父节点中的位置
     * @param item {Node}
     * @return {number}
     */
    function indexOf(item) {
        let result = -1
        while (item) {
            ++result
            item = item.previousSibling
        }
        return result
    }
    const result = []
    let item = node
    while (item !== root) {
        result.push(indexOf(item))
        item = item.parentNode
    }
    return result
}

/**
 * 根据坐标定位节点
 * @param root {Node}
 * @param pos {number[]}
 * @return {Node|Element}
 */
function unPosition(root, pos) {
    let result = root
    for (let i = pos.length - 1; i >= 0; i--) {
        const index = pos[i]
        result = result.childNodes[index]
    }
    return result
}