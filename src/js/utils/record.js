import {KRange} from './range'
import {recordInput} from '../events/before-input-event'
import {KRICH_EDITOR} from '../vars/global-fileds'
import {eachArray, isBrNode, isEqualsArray, isTextNode} from './tools'
import {historySize} from '../vars/global-exports-funtions'

/**
 * 记录操作，以支持撤回
 * @type {UndoStackFrame[]}
 */
const undoStack = []
/**
 * 记录已经被撤回地操作，以支持重做
 * @type {UndoStackFrame[]}
 */
const redoStack = []

/** @type {MutationObserver} */
let observer
/**
 * 下一组要推入操作栈的操作
 * @type {UndoStackItem[]}
 */
let nextOperate = []

/**
 * 开始监听编辑区域的 DOM 变化
 */
export function startupObserveDom() {
    observer = new MutationObserver(list => {
        for (let record of list) {
            const {
                target, type: recordType,
                attributeName, oldValue,
                removedNodes, addedNodes, previousSibling, nextSibling
            } = record
            switch (recordType[2]) {
                case 't':   // attributes
                    nextOperate.push({
                        pos: position(KRICH_EDITOR, target),
                        type: 0,
                        oldAttr: [attributeName, oldValue]
                    })
                    break
                case 'a': { // characterData
                    const pos = position(KRICH_EDITOR, target)
                    // 查找是否有可以合并的内容
                    let oldItem = nextOperate.find(
                        it => !it.type && isEqualsArray(pos, it.pos)
                    )
                    if (!oldItem) {
                        nextOperate.push({
                            pos, type: 0, oldText: oldValue || '\u200B'
                        })
                    }
                    break
                }
                case 'i': { // childList
                    let pos, type
                    if (previousSibling) {
                        type = 2
                        pos = position(KRICH_EDITOR, previousSibling)
                    } else if (nextSibling) {
                        type = 1
                        pos = position(KRICH_EDITOR, addedNodes.length && isBrNode(nextSibling) ? addedNodes[0] : nextSibling)
                    } else {
                        type = 3
                        pos = position(KRICH_EDITOR, target)
                    }
                    if (addedNodes.length) {    // 插入元素
                        if (type === 1) {
                            pos[0] += addedNodes.length
                        }
                        nextOperate.push({
                            pos, type, nodes: Array.from(addedNodes).map(it => it.cloneNode(true))
                        })
                    } else {    // 删除元素
                        if (type === 1) {
                            pos[0] -= removedNodes.length
                        }
                        nextOperate.push({
                            pos, type: -type, nodes: Array.from(removedNodes).map(it => it.cloneNode(true))
                        })
                    }
                    break
                }
                default:
                    console.error("代码不应该进入此分支", recordType)
            }
        }
    })
    reObserve()
}

/** 注销监听器 */
export function interruptObserveDom() {
    observer.disconnect()
}

function reObserve() {
    observer.observe(KRICH_EDITOR, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'src', 'href'],
        characterData: true,
        attributeOldValue: true,
        characterDataOldValue: true
    })
}

/**
 * 推入一个操作
 * @param oldRange {KRangeData}
 */
export function pushUndoStack(oldRange) {
    if (!nextOperate.length) return
    if (undoStack.length === historySize) undoStack.shift()
    undoStack.push({
        data: nextOperate,
        oldRange, newRange: KRange.activated().serialization()
    })
    nextOperate = []
    redoStack.length = 0
}

/**
 * 记录对 KRICH_EDITOR 的操作
 * @template T
 * @param consumer {function(): Promise<T>|T}
 * @param notRecord {boolean?} 是否不对操作进行记录
 * @return {Promise<T>}
 */
export async function recordOperate(consumer, notRecord) {
    if (notRecord) return consumer()
    recordInput(true)
    const oldRange = KRange.activated().serialization()
    const result = await consumer()
    pushUndoStack(oldRange)
    return result
}

/**
 * 撤回一次操作
 */
export function undo() {
    const item = undoStack.pop()
    if (!item) return
    interruptObserveDom()
    const {data, oldRange} = item
    handleStackItem(data, false)
    redoStack.push(item)
    KRange.deserialized(oldRange).active()
    reObserve()
}

/**
 * 重做一次操作
 */
export function redo() {
    const item = redoStack.pop()
    if (!item) return
    interruptObserveDom()
    const {data, newRange} = item
    handleStackItem(data, true)
    undoStack.push(item)
    KRange.deserialized(newRange).active()
    reObserve()
}

/**
 * 处理 UndoStackItem
 * @param data {UndoStackItem[]}
 * @param isRedo {boolean}
 */
function handleStackItem(data, isRedo) {
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
        if (oldAttr) {
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