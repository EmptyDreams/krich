import {findParentTag} from '../utils/dom'
import {GLOBAL_HISTORY, TOP_LIST} from '../vars/global-fileds'
import {createElement, isEmptyLine} from '../utils/tools'
import {KRange} from '../utils/range'

/**
 * 分割线的点击事件
 * @param range {KRange}
 */
export function onclickHr(range) {
    GLOBAL_HISTORY.initRange(range, true)
    const posLine = findParentTag(range.realEndContainer(), TOP_LIST)
    const hr = createElement('hr')
    if (isEmptyLine(posLine)) {
        GLOBAL_HISTORY.utils.replace(posLine, [hr])
    } else {
        posLine.after(hr)
        GLOBAL_HISTORY.addAfter(posLine, [hr])
    }
    new KRange(hr).active()
    GLOBAL_HISTORY.next()
}