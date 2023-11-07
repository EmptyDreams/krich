import {SELECT_VALUE} from '../constant'
import * as RangeUtils from '../range'

/**
 * 标题按钮的点击事件
 * @param event {Event}
 */
export function behaviorHeader(event) {
    const value = event.target.getAttribute(SELECT_VALUE)
    console.assert(value?.length === 1, `${value} 值异常`)
    const range = getSelection().getRangeAt(0)
    RangeUtils.getTopLines(range).forEach(item => {
        const novel = document.createElement(value === '0' ? 'p' : 'h' + value)
        novel.setAttribute('data-id', 'headerSelect')
        novel.innerHTML = item.textContent
        item.replaceWith(novel)
    })
}