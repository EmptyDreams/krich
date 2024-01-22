import {findParentTag} from '../utils/dom'
import {behaviors, KRICH_TOOL_BAR} from '../global-fileds'
import {KRange} from '../utils/range'

/**
 * 多元素结构的点击事件
 * @param range {KRange} 选择范围
 * @param key {string} 在 behaviors 中的 key
 * @param lineHead {string} 每行打头的 HTML 语句
 * @param lineTail {string} 每行结尾的 HTML 语句
 * @param emptyBody {string} 当某一行为空时使用什么填充该行内容
 */
export function onclickMultiElementStructure(range, key, lineHead, lineTail, emptyBody) {
    const offlineData = range.serialization()
    console.assert(lineTail.length !== 0, 'lineTail 的值不能为空')
    helper(range, key, lineHead, lineTail, emptyBody)
    KRange.deserialized(offlineData).active()
}

/**
 * 辅助函数，承载实际功能
 * @param range {KRange} 选择范围
 * @param key {string} 在 behaviors 中的 key
 * @param lineHead {string} 每行打头的 HTML 语句
 * @param lineTail {string} 每行结尾的 HTML 语句
 * @param emptyBody {string} 当某一行为空时使用什么填充该行内容
 */
function helper(range, key, lineHead, lineTail, emptyBody) {
    const behavior = behaviors[key]
    /**
     * 检查指定标签是否是结构对象
     * @param item {Element}
     * @return {boolean}
     */
    const structureChecker = item => item.matches?.(behavior.exp)
    /**
     * 构建一个结构
     * @param html {string} 内嵌在结构当中的 HTML 代码
     * @return {HTMLElement}
     */
    const buildStructure = html => {
        const structure = behavior.builder(KRICH_TOOL_BAR.querySelector(`*[data-id="${key}"]`))
        structure.innerHTML = html
        return structure
    }
    const {startContainer, endContainer} = range.item
    const startTopContainer = findParentTag(startContainer, structureChecker)
    const endTopContainer = findParentTag(endContainer, structureChecker)
    if (startTopContainer && startTopContainer === endTopContainer) {
        /* 如果选择范围在目标结构当中，且仅选中了一个结构的部分或全部内容 */
        /**
         * 将列表中所有元素插入到指定位置
         * @param where {InsertPosition} 插入位置
         * @param elements {Element[]} 要插入的内容
         */
        const insertAll = (where, elements) => {
            for (let item of elements) {
                startTopContainer.insertAdjacentElement(where, item)
            }
        }
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
                array.push(item)
                if (item === end) break
                item = item.nextElementSibling
            }
            return array
        }
        /** 清除整个结构 */
        const removeAll = () => {
            insertAll('afterend', Array.from(startTopContainer.children))
            startTopContainer.remove()
        }
        // 如果没有范围选中则判定为选中了全部
        if (range.item.collapsed) return removeAll()
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
            insertAll('beforebegin', selectLines(start, end))
        } else if (isEnd) {   // 如果选区包含最后一行
            insertAll('afterend', selectLines(start))
        } else {    // 如果选区夹在中间
            const middle = selectLines(start, end)
            const bottom = selectLines(end.nextSibling)
            const bottomStructure = buildStructure('')
            bottomStructure.append(...bottom)
            startTopContainer.insertAdjacentElement('afterend', bottomStructure)
            insertAll('afterend', middle)
        }
        return
    }
    const lines = range.getAllTopElements()
    const existing = lines.find(structureChecker)
    const newHtml =
        lines.map(it => it.innerHTML)
            .map(it => `${lineHead}${it === '<br>' ? emptyBody : it}${lineTail}`)
            .join('') || `${lineHead}${emptyBody}${lineTail}`
    const structure = existing ?? buildStructure(newHtml)
    if (existing) {
        structure.innerHTML = newHtml
    } else {
        lines[0].insertAdjacentElement('afterend', structure)
    }
    for (let item of lines) {
        if (item !== existing)
            item.remove()
    }
}