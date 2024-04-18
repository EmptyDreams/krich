import {diffChars} from 'diff'
import {insertTextToString, removeStringByIndex} from './string-utils'
import {historySize} from '../vars/global-exports-funtions'
import {KRICH_EDITOR} from '../vars/global-fileds'
import {KRange} from './range'
import {recordInput} from '../events/before-input-event'
import {readEditorHtml, removeRuntimeFlag} from './dom'

/**
 * 记录操作，以支持撤回
 * @type {DiffItem[]}
 */
const stack = []
/**
 * 记录已经被撤回地操作，以支持重做
 * @type {DiffItem[]}
 */
const redoStack = []

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
    const oldContent = readEditorHtml()
    const oldRange = KRange.activated().serialization()
    const result = await consumer()
    const newContent = readEditorHtml()
    const newRange = KRange.activated().serialization()
    pushOperate(oldContent, newContent, oldRange, newRange)
    return result
}

/**
 * 记录一次编辑操作
 * @param oldContent 旧内容
 * @param newContent 新内容
 * @param oldRangeData {KRangeData} 在旧内容时的 range 数据
 * @param newRangeData {KRangeData} 在新内容时的 range 数据
 */
export function pushOperate(oldContent, newContent, oldRangeData, newRangeData) {
    redoStack.length = 0
    const diff = diffChars(oldContent, newContent)
    let newIndex = 0, oldIndex = 0
    /** @type {DiffData[]} */
    const zipped = []
    for (let change of diff) {
        const {value, count} = change
        if (change.added) {
            zipped.push({
                add: true,
                newIndex, oldIndex, value
            })
            newIndex += count
        } else if (change.removed) {
            zipped.push({
                newIndex, oldIndex, value
            })
            oldIndex += count
        } else {
            newIndex += count
            oldIndex += count
        }
    }
    if (stack.length === historySize) {
        stack.shift()
    }
    stack.push({
        data: zipped,
        oldRange: oldRangeData,
        newRange: newRangeData
    })
}

/**
 * 撤回一次操作
 * @param content {string} 当前的内容
 * @return {[string, KRangeData]|undefined}
 */
export function undo(content) {
    const item = stack.pop()
    if (!item) return
    redoStack.push(item)
    const {data, oldRange} = item
    for (let i = data.length - 1; i >= 0; i--) {
        const {add, newIndex, value} = data[i]
        if (add) {
            // 如果是当前内容新加的文本，则将其移除
            content = removeStringByIndex(content, newIndex, value.length)
        } else {
            // 如果是在当前内容删除的文本，则将其放回
            content = insertTextToString(content, newIndex, value)
        }
    }
    return [content, oldRange]
}

/**
 * 重做一次操作
 * @param content {string} 当前的内容
 * @return {[string, KRangeData]|undefined}
 */
export function redo(content) {
    const item = redoStack.pop()
    if (!item) return
    stack.push(item)
    const {data, newRange} = item
    for (let i = data.length - 1; i >= 0; i--) {
        const {add, oldIndex, value} = data[i]
        if (add) {
            // 如果是在当前内容的基础上追加文本
            content = insertTextToString(content, oldIndex, value)
        } else {
            // 如果是在当前内容的基础上删除文本
            content = removeStringByIndex(content, oldIndex, value.length)
        }
    }
    return [content, newRange]
}