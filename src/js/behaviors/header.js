import {SELECT_VALUE} from '../global-fileds'
import * as RangeUtils from '../range'

/**
 * 标题按钮的点击事件
 * @param range {Range}
 * @param target {HTMLElement}
 */
export function behaviorHeader(range, target) {
    const value = target.getAttribute(SELECT_VALUE)
    console.assert(value?.length === 1, `${value} 值异常`)
    RangeUtils.getTopLines(range).forEach(item => {
        const novel = document.createElement(value === '0' ? 'p' : 'h' + value)
        novel.setAttribute('data-id', 'headerSelect')
        novel.innerHTML = item.textContent
        item.replaceWith(novel)
    })
}