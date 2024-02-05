import {behaviors} from '../vars/global-fileds'
import {findParentTag} from '../utils/dom'
import {highlightCode, isEmptyLine} from '../utils/tools'

/**
 * 代码高亮按钮点击
 * @param range {KRange}
 */
export function behaviorHighlight(range) {
    const behavior = behaviors.code
    const pre = behavior.builder()
    const code = pre.firstChild
    const offlineData = range.serialization()
    if (range.collapsed) {
        const line = findParentTag(range.startContainer, ['P'])
        if (isEmptyLine(line)) {
            line.replaceWith(pre)
        } else {
            line.insertAdjacentElement('afterend', pre)
        }
    } else {
        const allLines = range.getAllTopElements()
        allLines[0].insertAdjacentElement('afterend', pre)
        let codeContent = ''
        for (let line of allLines) {
            codeContent += line.textContent + '\n'
            line.remove()
        }
        code.textContent = codeContent
    }
    highlightCode(offlineData, pre)
    return true
}