import {correctStartContainer} from '../range'
import * as RangeUtils from '../range'

/**
 * 引用按钮的点击事件
 */
export function behaviorBlockquote() {
    const isBlockquote = container =>
        container && [container.nodeName, container.parentNode.nodeName].includes('BLOCKQUOTE')
    /**
     * 查找最近的一行的起点
     * @param blockquote {HTMLQuoteElement}
     * @param startOffset {number}
     * @return {number}
     */
    const findLineStartIndex = (blockquote, startOffset) =>
        blockquote.textContent.lastIndexOf('\n', startOffset) + 1
    /**
     * 查找最近的一行的终点
     * @param blockquote {HTMLQuoteElement}
     * @param endOffset {number}
     * @return {number}
     */
    const findLineEndIndex = (blockquote, endOffset) =>
        blockquote.textContent.indexOf('\n', endOffset)
    const buildBlockquote = content => {
        const blockquote = document.createElement('blockquote')
        blockquote.setAttribute('data-id', 'blockquote')
        blockquote.setAttribute('data-stamp', Date.now().toString(16))
        blockquote.textContent = content
        return blockquote
    }
    const range = getSelection().getRangeAt(0)
    let {startContainer, endContainer, startOffset, endOffset} = range
    if (range.collapsed) endContainer = startContainer = correctStartContainer(range)
    if (isBlockquote(startContainer) && startContainer.parentNode === endContainer.parentNode) {
        /* 如果选择范围在一个引用中，则取消选择的区域的引用 */
        const blockquote = startContainer.parentElement
        const content = blockquote.textContent
        const selectedContents = (start, end) => content
            .substring(start, end)
            .split('\n')
            .map(it => `<p>${it}</p>`)
            .join('')
        /** 清除整个引用 */
        const removeAll = () => {
            blockquote.insertAdjacentHTML('afterend', selectedContents(0))
            blockquote.remove()
        }
        // 如果是只点击了一下则判定为选择了全部
        if (range.collapsed) return removeAll()
        const start = findLineStartIndex(blockquote, startOffset)
        const end = findLineEndIndex(blockquote, endOffset)
        if (start === 0 && end === -1) {    // 如果包含了整个引用
            removeAll()
        } else if (start === 0) {   // 如果包含第一行
            blockquote.insertAdjacentHTML('beforebegin', selectedContents(0, end))
            blockquote.textContent = content.substring(end + 1)
        } else if (end === -1) {    // 如果包含了最后一行
            blockquote.insertAdjacentHTML('afterend', selectedContents(start))
            blockquote.textContent = content.substring(0, start)
        } else {    // 如果是夹在中间
            const ps = selectedContents(start, end)
            const bottomBlockquote = buildBlockquote(content.substring(end + 1))
            blockquote.textContent = content.substring(0, start)
            blockquote.insertAdjacentElement('afterend', bottomBlockquote)
            blockquote.insertAdjacentHTML('afterend', ps)
        }
        return
    }
    const lines = RangeUtils.getTopLines(range)
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
    let newContent = lines.map(it => {
        const content = it.textContent
        return content.endsWith('\n') ? content.substring(0, content.length - 1) : content
    }).join('\n')
    if (newContent.length === 0) newContent = '\n'
    if (existing) { // 如果已经存在一个引用，则将所有内容合并到这个引用中
        switch (mode) {
            case 0:
                existing.textContent = newContent
                break
            case 1: // 0b01
                existing.textContent = newContent + '\n' + existing.textContent
                break
            case 2: // 0b10
                existing.textContent += '\n' + newContent
                break
            case 3: // 0b11
                lines[0].previousSibling.textContent += '\n' + newContent + '\n' + existing.textContent
                existing.remove()
                break
        }
    } else {    // 否则新建一个引用
        const blockquote = buildBlockquote(newContent)
        lines[0].parentNode.insertBefore(blockquote, lines[0])
    }
    // 移除原有的标签
    lines.filter(it => it !== existing)
        .forEach(it => it.remove())
}