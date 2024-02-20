import {SELECT_VALUE} from '../vars/global-fileds'
import {KRange} from '../utils/range'
import {createElement} from '../utils/tools'

/**
 * 标题按钮的点击事件
 * @param range {KRange}
 * @param target {HTMLElement}
 */
export function behaviorHeader(range, target) {
    const value = target.getAttribute(SELECT_VALUE)
    console.assert(value?.length === 1, `${value} 值异常`)
    setPostHeader(range, value)
}

/**
 * 设置标题
 * @param range {KRange}
 * @param level {'0'|'1'|'2'|'3'|'4'|'5'|'6'}
 */
export function setPostHeader(range, level) {
    const data = range.serialization()
    range.getAllTopElements().forEach(item => {
        const novel = createElement(level === '0' ? 'p' : 'h' + level)
        novel.innerHTML = item.textContent || '<br>'
        item.replaceWith(novel)
    })
    KRange.deserialized(data).active()
}