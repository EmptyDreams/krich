import {findParentTag, getFirstChildNode} from '../utils/dom'
import {isCommonLine, isEmptyLine} from '../utils/tools'
import {KRange, setCursorPositionBefore} from '../utils/range'
import {behaviors} from '../behavior'
import {GLOBAL_HISTORY} from '../vars/global-fileds'

/**
 * 代码高亮按钮点击
 * @param range {KRange}
 */
export function behaviorHighlight(range) {
    const offlineData = GLOBAL_HISTORY.initRange(range, true)
    const behavior = behaviors.code
    const pre = behavior.builder()
    const code = pre.firstChild
    if (range.collapsed) {
        const line = findParentTag(range.startContainer, isCommonLine)
        if (isEmptyLine(line)) {
            GLOBAL_HISTORY.utils.replace(line, [pre])
        } else {
            line.after(pre)
            GLOBAL_HISTORY.addAfter(line, [pre])
        }
        setCursorPositionBefore(getFirstChildNode(pre))
    } else {
        const allLines = range.getAllTopElements()
        GLOBAL_HISTORY.removeAuto(allLines)
        allLines[0].after(pre)
        let codeContent = ''
        for (let line of allLines) {
            codeContent += line.textContent + '\n'
            line.remove()
        }
        code.textContent = codeContent
        GLOBAL_HISTORY.addAuto([pre])
        range.deserialized(offlineData).active(true)
    }
    GLOBAL_HISTORY.next()
}