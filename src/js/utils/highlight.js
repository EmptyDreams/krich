import {highlight} from '../vars/global-fileds'
import {KRange} from './range'
import {editorRange} from '../events/range-monitor'

/**
 * 高亮代码
 * @param range {KRange|KRangeData}
 * @param pre {Element|Node}
 * @return {Promise<boolean>} 是否执行了高亮操作
 */
export async function highlightCode(range, pre) {
    console.assert(pre?.nodeName === 'PRE', '传入的 pre 必须是代码块对象', pre)
    if (!highlight) return false
    const old = editorRange
    const isArray = Array.isArray(range)
    const offlineData = isArray ? range : range.serialization()
    const cb = highlight(pre)
    if (cb) await cb
    if (old === editorRange)
        KRange.deserialized(offlineData).active()
    return true
}