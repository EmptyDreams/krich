import {findParentTag} from '../utils/dom'
import {TOP_LIST} from '../vars/global-fileds'
import {createElement, isEmptyLine} from '../utils/tools'
import {KRange} from '../utils/range'

/**
 * 分割线的点击事件
 * @param range {KRange}
 */
export function onclickHr(range) {
    const posLine = findParentTag(range.realEndContainer(), TOP_LIST)
    const hr = createElement('hr')
    if (isEmptyLine(posLine)) {
        posLine.replaceWith(hr)
    } else {
        posLine.insertAdjacentElement('afterend', hr)
    }
    new KRange(hr).active()
}