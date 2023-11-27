import {
    KRange,
    setCursorPosition,
    setCursorPositionIn
} from '../range'
import {countChar, createElement} from '../utils'

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
        const blockquote = createElement('blockquote', 'blockquote')
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
        if (start === 0 && end === -1) {    // 如果包含了整个引用
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
    let mode = 0, existing
    if (isBlockquote(lines[0].previousSibling)) {
        mode = 0b10
        existing = lines[0].previousSibling
    }
    if (isBlockquote(lines[lines.length - 1].nextSibling)) {
        mode |= 0b01
        existing = lines[lines.length - 1].nextSibling
    } else if (!existing) {
        existing = lines.find(it => it.nodeName === 'BLOCKQUOTE')
    }
    let newHtml = lines.map(it => it.innerHTML).join('\n')
    let oldLength, fixLine
    if (newHtml.length === 0) newHtml = '\n'
    if (existing) { // 如果已经存在一个引用，则将所有内容合并到这个引用中
        switch (mode) {
            case 0: // 选取内存在一个引用，则将内容合并到该引用中
                existing.innerHTML = newHtml
                setCursorPosition(existing.firstChild, startOffset)
                break
            case 1: // 0b01 - 选取的下界与一个引用相邻，则将内容合并到下界的引用中
                existing.innerHTML = newHtml + '\n' + existing.innerHTML
                setCursorPosition(existing.firstChild, startOffset)
                break
            case 2: // 0b10 - 选取的上界与一个引用相邻，则将内容合并到上界的引用中
                oldLength = existing.textContent.length
                fixLine = !existing.textContent.endsWith('\n')
                existing.innerHTML += (fixLine ? '\n' : '') + newHtml
                setCursorPosition(existing.firstChild, oldLength + startOffset + (fixLine ? 1 : 0))
                break
            case 3: // 0b11 - 选取的上界和下界均与一个引用相邻，则将所有内容合并到上界的引用中
                const first = lines[0].previousSibling
                const oldTextContent = first.textContent
                fixLine = !oldTextContent.endsWith('\n')
                first.innerHTML += (fixLine ? '\n' : '') + newHtml + '\n' + existing.innerHTML
                existing.remove()
                setCursorPosition(first.firstChild, oldTextContent.length + startOffset + (fixLine ? 1 : 0))
                break
        }
    } else {    // 否则新建一个引用
        const blockquote = buildBlockquote(newHtml)
        lines[0].parentNode.insertBefore(blockquote, lines[0])
        setCursorPosition(blockquote.firstChild, startOffset)
    }
    // 移除原有的标签
    lines.filter(it => it !== existing)
        .forEach(it => it.remove())
}