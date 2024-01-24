import {findParentTag} from '../utils/dom'
import {TOP_LIST} from '../global-fileds'
import {createElement} from '../utils/tools'
import {setCursorPositionIn} from '../utils/range'

/**
 * 分割线的点击事件
 * @param range {KRange}
 */
export function onclickHr(range) {
    const posLine = findParentTag(range.item.endContainer, TOP_LIST)
    const hr = createElement('div', {
        class: 'hr',
        contenteditable: false
    })
    hr.innerHTML = '<hr>'
    if (!posLine.nextSibling) {
        const newLine = createElement('p')
        newLine.innerHTML = '<br>'
        posLine.insertAdjacentElement('afterend', newLine)
    }
    if (posLine.innerHTML === '<br>') {
        posLine.replaceWith(hr)
    } else {
        posLine.insertAdjacentElement('afterend', hr)
    }
    setCursorPositionIn(hr.nextSibling, 0)
}