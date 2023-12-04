import {SELECT_VALUE} from '../global-fileds'
import {KRange} from '../range'


import {createElement} from '../utils/tools'

/**
 * 标题按钮的点击事件
 * @param range {KRange}
 * @param target {HTMLElement}
 */
export function behaviorHeader(range, target) {
    const value = target.getAttribute(SELECT_VALUE)
    console.assert(value?.length === 1, `${value} 值异常`)
    const data = range.serialization()
    range.getAllTopElements().forEach(item => {
        const novel = createElement('headerSelect', value === '0' ? 'p' : 'h' + value)
        novel.innerHTML = item.textContent || '<br>'
        item.replaceWith(novel)
    })
    KRange.deserialized(data).active()
}