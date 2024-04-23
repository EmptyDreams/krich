import {findParentTag} from '../utils/dom'
import {GLOBAL_HISTORY, HASH_NAME, KRICH_TOOL_BAR} from '../vars/global-fileds'
import {KRange} from '../utils/range'
import {isMultiEleStruct} from '../types/button-behavior'
import {createHash, isCommonLine} from '../utils/tools'
import {behaviors} from '../behavior'

/**
 * 多元素结构的点击事件
 * @param range {KRange} 选择范围
 * @param key {string} 在 behaviors 中的 key
 */
export function onclickMultiElementStructure(range, key) {
    const offlineData = GLOBAL_HISTORY.initRange(range, true)
    helper(range, key)
    KRange.deserialized(offlineData).active()
    GLOBAL_HISTORY.next()
}

/**
 * 辅助函数，承载实际功能
 * @param range {KRange} 选择范围
 * @param key {string} 在 behaviors 中的 key
 */
function helper(range, key) {
    const behavior = behaviors[key]
    /**
     * 构建一个结构
     * @return {HTMLElement}
     */
    const buildStructure = () => {
        const structure = behavior.builder(KRICH_TOOL_BAR.querySelector(`*[data-id="${key}"]`))
        structure.setAttribute(HASH_NAME, createHash())
        return structure
    }
    const startContainer = range.realStartContainer()
    const endContainer = range.realEndContainer()
    const startTopContainer = findParentTag(startContainer, isMultiEleStruct)
    const endTopContainer = findParentTag(endContainer, isMultiEleStruct)
    if (startTopContainer && startTopContainer === endTopContainer && startTopContainer.matches(behavior.exp)) {
        /* 如果选择范围在目标结构当中，且仅选中了一个结构的部分或全部内容 */
        /**
         * 从结构的 DOM 树中提取指定片段的行的对象
         * @param start {Element|Node} 起始（包含）
         * @param end {Element|Node?} 终止（包含），留空表示获取到结尾
         * @return {Element[]}
         */
        const selectLines = (start, end) => {
            console.assert(start instanceof Element, `start(${start.nodeName}) 必须是 Element 对象`)
            const array = []
            let item = start
            while (item) {
                array.push(...(isCommonLine(item) ? [item] : item.querySelectorAll('&>*:not(.marker)')))
                if (item === end) break
                item = item.nextElementSibling
            }
            return array
        }
        /** 清除整个结构 */
        const removeAll = () => {
            GLOBAL_HISTORY.utils.replace(startTopContainer, selectLines(startTopContainer.firstChild))
        }
        // 如果没有范围选中则判定为选中了全部
        if (range.collapsed) return removeAll()
        // 检查指定元素的父元素是否是结构对象
        const topElementChecker = item => item.parentNode === startTopContainer
        // 获取选区的起始行和终止行
        const start = findParentTag(startContainer, topElementChecker)
        const end = findParentTag(endContainer, topElementChecker)
        // 判断选区是否包含结构的起始和结尾
        const isStart = startTopContainer.firstChild === start
        const isEnd = startTopContainer.lastChild === end
        if (isStart && isEnd) {   // 如果选中了所有行
            removeAll()
        } else if (isStart) {   // 如果选区包含第一行
            const lines = selectLines(start, end)
            startTopContainer.before(...lines)
            GLOBAL_HISTORY.addBefore(startTopContainer, lines)
        } else if (isEnd) {   // 如果选区包含最后一行
            const lines = selectLines(start)
            startTopContainer.after(...lines)
            GLOBAL_HISTORY.addAfter(startTopContainer, lines)
        } else {    // 如果选区夹在中间
            const middle = selectLines(start, end)
            const bottom = selectLines(end.nextSibling)
            const bottomStructure = buildStructure()
            bottomStructure.append(...bottom)
            startTopContainer.after(bottomStructure)
            startTopContainer.after(...middle)
            GLOBAL_HISTORY.addAfter(startTopContainer, [...middle, bottomStructure])
        }
        return
    }
    const lines = range.getAllTopElements()
    const existing = lines.find(it => it.matches(behavior.exp))
    /**
     * 对行进行打包，在外部封装上 [lineTag]
     * @param item {HTMLElement}
     * @return {HTMLElement}
     */
    const pack = item => {
        const packing = behavior.newLine()
        if (!packing) return item
        packing.append(item)
        return packing
    }
    let structure = existing
    const packLines = lines.map(pack)
    if (existing) { // 如果顶层元素中包含一个同样的多元素结构，那么就将内容合并到其中
        let index = lines.indexOf(existing)
        if (index < 0) index = lines.length
        const left = packLines.slice(0, index).reverse()
        const right = packLines.splice(index + 1)
        existing.prepend(...left)
        GLOBAL_HISTORY.addAuto(left)
        const rightPos = existing.lastChild
        existing.append(...right)
        GLOBAL_HISTORY.addAfter(rightPos, right)
    } else {    // 否则新建一个结构容纳所有内容
        structure = buildStructure()
        lines[0].before(structure)
        GLOBAL_HISTORY.addBefore(lines[0], [structure])
        structure.append(...packLines)
        GLOBAL_HISTORY.removeAfter(structure, lines)
        GLOBAL_HISTORY.addChild(structure, packLines)
    }
}