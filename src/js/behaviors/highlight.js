import {behaviors} from '../vars/global-fileds'
import {findParentTag, getFirstChildNode} from '../utils/dom'
import {isCommonLine, isEmptyLine} from '../utils/tools'
import {KRange, setCursorPositionBefore} from '../utils/range'

/**
 * 代码高亮按钮点击
 * @param range {KRange}
 */
export function behaviorHighlight(range) {
    const behavior = behaviors.code
    const pre = behavior.builder()
    const code = pre.firstChild
    if (range.collapsed) {
        const line = findParentTag(range.startContainer, isCommonLine)
        if (isEmptyLine(line)) {
            line.replaceWith(pre)
        } else {
            line.insertAdjacentElement('afterend', pre)
        }
        setCursorPositionBefore(getFirstChildNode(pre))
    } else {
        const offlineData = range.serialization()
        const allLines = range.getAllTopElements()
        allLines[0].insertAdjacentElement('afterend', pre)
        let codeContent = ''
        for (let line of allLines) {
            codeContent += line.textContent + '\n'
            line.remove()
        }
        code.textContent = codeContent
        range.deserialized(offlineData).active(true)
    }
}