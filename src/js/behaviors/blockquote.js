import {
    KRange, setCursorPositionAfter,
    setCursorPositionIn
} from '../range'
import {countChar, createElement} from '../utils/tools'
import {behaviors} from '../global-fileds'

/**
 * 引用按钮的点击事件
 * @param kRange {KRange}
 */
export function behaviorBlockquote(kRange) {
    const isBlockquote = container => {
        if (!container) return false
        const parent = container.parentNode
        return [container, parent, parent.parentNode].find(it => it.nodeName === 'BLOCKQUOTE')
    }
    /**
     * 查找最近的一行的起点
     * @param blockquote {HTMLQuoteElement}
     * @param startOffset {number}
     * @return {number}
     */
    const findLineStartIndex = (blockquote, startOffset) =>
        blockquote.innerHTML.lastIndexOf('\n', startOffset) + 1
    /**
     * 查找最近的一行的终点
     * @param blockquote {HTMLQuoteElement}
     * @param endOffset {number}
     * @return {number}
     */
    const findLineEndIndex = (blockquote, endOffset) =>
        blockquote.innerHTML.indexOf('\n', endOffset)
    const buildBlockquote = html => {
        const blockquote = createElement('blockquote')
        blockquote.innerHTML = html
        return blockquote
    }
    const range = kRange.item
    const {startContainer, endContainer, startOffset, endOffset} = range
    if (isBlockquote(startContainer) && startContainer.parentNode === endContainer.parentNode) {
        /* 如果选择范围在一个引用中，则取消选择的区域的引用 */
        const blockquote = startContainer.parentElement
        const html = blockquote.innerHTML
        let prevSelectedLine
        const selectedHtml = (start, end) => {
            const array = html.substring(start, end)
                .split('\n')
            prevSelectedLine = array.length
            return array.map(it => `<p>${it}</p>`).join('')
        }
        /** 清除整个引用 */
        const removeAll = () => {
            blockquote.insertAdjacentHTML('afterend', selectedHtml(0))
            const index = startOffset - countChar('\n', blockquote.textContent, 0, startOffset)
            const next = blockquote.nextSibling
            blockquote.remove()
            setCursorPositionIn(next, index)
        }
        // 如果是只点击了一下则判定为选择了全部
        if (range.collapsed) return removeAll()
        const start = findLineStartIndex(blockquote, startOffset)
        const end = findLineEndIndex(blockquote, endOffset)
        if (start === 0 && (end === -1 || end === html.length - 1)) {    // 如果包含了整个引用
            removeAll()
        } else if (start === 0) {   // 如果包含第一行
            blockquote.insertAdjacentHTML('beforebegin', selectedHtml(0, end))
            blockquote.innerHTML = html.substring(end + 1)
            let dist = blockquote
            for (let i = 0; i !== prevSelectedLine; ++i) {
                dist = dist.previousSibling
            }
            setCursorPositionIn(dist, startOffset)
        } else if (end === -1) {    // 如果包含了最后一行
            blockquote.insertAdjacentHTML('afterend', selectedHtml(start))
            blockquote.innerHTML = html.substring(0, start)
            setCursorPositionIn(blockquote.nextSibling, startOffset - start)
        } else {    // 如果是夹在中间
            const ps = selectedHtml(start, end)
            const bottomBlockquote = buildBlockquote(html.substring(end + 1))
            blockquote.innerHTML = html.substring(0, start)
            blockquote.insertAdjacentElement('afterend', bottomBlockquote)
            blockquote.insertAdjacentHTML('afterend', ps)
            setCursorPositionIn(blockquote.nextSibling, startOffset - start)
        }
        return
    }
    const lines = kRange.getAllTopElements()
    const existing = lines.find(it => it.nodeName === 'BLOCKQUOTE')
    const newHtml = lines.map(it => it.innerHTML).join('\n') || '\n'
    const blockquote = existing ?? buildBlockquote(newHtml)
    if (existing) { // 如果已经存在一个引用，则将所有内容合并到这个引用中
        blockquote.innerHTML = newHtml
    } else {    // 否则新建一个引用
        lines[0].parentNode.insertBefore(blockquote, lines[0])
    }
    // 移除原有的标签
    lines.filter(it => it !== existing)
        .forEach(it => it.remove())
    setCursorPositionAfter(blockquote)
}