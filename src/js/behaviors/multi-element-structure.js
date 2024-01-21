import {findParentTag} from '../utils/dom'
import {behaviors, KRICH_TOOL_BAR} from '../global-fileds'
import {countChar} from '../utils/tools'
import {setCursorPositionAfter, setCursorPositionIn} from '../utils/range'
/**
 *
 * @param range {KRange} 选择范围
 * @param key {string} 在 behaviors 中的 key
 * @param lineHead {string} 每行打头的 HTML 语句
 * @param lineTail {string} 每行结尾的 HTML 语句
 * @param emptyBody {string} 当某一行为空时使用什么填充该行内容
 */
export function onclickMultiElementStructure(range, key, lineHead, lineTail, emptyBody) {
    const headLength = lineHead.length
    const tailLength = lineTail.length
    console.assert(lineTail.length !== 0, 'lineTail 的值不能为空')
    const behavior = behaviors[key]
    /**
     * 检查指定标签是否是结构对象
     * @param item {Element}
     * @return {boolean}
     */
    const structureChecker = item => item.matches?.(behavior.exp)
    /**
     * 查找最近一行的起点
     * @param structure {Element} 结构对象
     * @param offset {number} 偏移量
     * @return {number}
     */
    const findLineStartIndex = (structure, offset) => {
        const index = structure.innerHTML.lastIndexOf(lineTail, offset)
        return index + headLength + (index < 0 ? 0 : tailLength)
    }
    /**
     * 查找最近一行的终点（下标指向 tail 后面的第一个字符）
     * @param structure {Element} 结构对象
     * @param offset {number} 偏移量
     * @return {number}
     */
    const findLineEndIndex = (structure, offset) => {
        const html = structure.innerHTML
        const index = html.indexOf(lineTail, offset)
        return index < 0 ? html.length : index + tailLength
    }
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
    const {startContainer, endContainer, startOffset, endOffset} = range.item
    const startTopContainer = findParentTag(startContainer, structureChecker)
    const endTopContainer = findParentTag(endContainer, structureChecker)
    if (startTopContainer && startTopContainer === endTopContainer) {
        /* 如果选择范围在目标结构当中，且仅选中了一个结构的部分或全部内容 */
        const html = startTopContainer.innerHTML
        let prevSelectedLine
        /**
         * 从结构的 HTML 代码中提取指定片段的 HTML，并拼接为普通文本
         * @param start {number}
         * @param end {number?}
         * @return {string}
         */
        const selectHtml = (start, end) => {
            const array = html.substring(start, end)
                .split(lineTail)
                .map(it => `<p>${it.substring(it.indexOf(lineHead) + headLength)}</p>`)
            prevSelectedLine = array.length
            return array.join('')
        }
        /** 清除整个结构 */
        const removeAll = () => {
            const index = startOffset - countChar(lineTail, html, 0, startOffset)
            startTopContainer.insertAdjacentHTML('afterend', selectHtml(0))
            const next = startTopContainer.nextSibling
            startTopContainer.remove()
            setCursorPositionIn(next, index)
        }
        // 如果没有范围选中则判定为选中了全部
        if (range.item.collapsed) return removeAll()
        const start = findLineStartIndex(startTopContainer, startOffset)
        const end = findLineEndIndex(startTopContainer, endOffset)
        if (start === 0 && end === html.length) {   // 如果选中了所有行
            removeAll()
        } else if (start === 0) {   // 如果选区包含第一行
            startTopContainer.insertAdjacentHTML('beforebegin', selectHtml(0, end))
            startTopContainer.innerHTML = html.substring(end)
            let dist = startTopContainer
            for (let i = 0; i !== prevSelectedLine; ++i) {
                dist = dist.previousSibling
            }
            setCursorPositionIn(dist, startOffset)
        } else if (end === html.length) {   // 如果选区包含最后一行
            startTopContainer.insertAdjacentHTML('afterend', selectHtml(start))
            startTopContainer.innerHTML = html.substring(0, start)
            setCursorPositionIn(startTopContainer.nextSibling, startOffset - start)
        } else {    // 如果选区夹在中间
            const ps = selectHtml(start, end)
            const bottomStructure = buildStructure(html.substring(end))
            startTopContainer.innerHTML = html.substring(0, start)
            startTopContainer.insertAdjacentElement('afterend', bottomStructure)
            startTopContainer.insertAdjacentHTML('afterend', ps)
            setCursorPositionIn(startTopContainer.nextSibling, startOffset - start)
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
    setCursorPositionAfter(structure)

}