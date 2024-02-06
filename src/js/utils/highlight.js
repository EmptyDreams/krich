import {highlight} from '../vars/global-fileds'
import {KRange} from './range'

/**
 * 高亮代码
 * @param range {KRange|KRangeData}
 * @param pre {Element|Node}
 * @return {boolean} 是否执行了高亮操作
 */
export function highlightCode(range, pre) {
    console.assert(pre?.nodeName === 'PRE', '传入的 pre 必须是代码块对象', pre)
    if (!highlight) return false
    const offlineData = Array.isArray(range) ? range : range.serialization()
    highlight(pre)
    KRange.deserialized(offlineData).active()
    return true
}