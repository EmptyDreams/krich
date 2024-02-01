import {findParentTag} from '../utils/dom'
import {TOP_LIST} from '../global-fileds'
import {createElement, createNewLine, isEmptyLine} from '../utils/tools'
import {setCursorPositionBefore} from '../utils/range'

/**
 * 分割线的点击事件
 * @param range {KRange}
 */
export function onclickHr(range) {
    const posLine = findParentTag(range.endContainer, TOP_LIST)
    const hr = createElement('hr')
    if (isEmptyLine(posLine)) {
        posLine.replaceWith(hr)
    } else {
        posLine.insertAdjacentElement('afterend', hr)
    }
    const {previousSibling, nextSibling} = hr
    if (!previousSibling || previousSibling.nodeName === 'HR') {
        hr.insertAdjacentElement('beforebegin', createNewLine())
    }
    if (!nextSibling || nextSibling.nodeName === 'HR') {
        hr.insertAdjacentElement('afterend', createNewLine())
    }
    setCursorPositionBefore(hr.nextSibling)
}