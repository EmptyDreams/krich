import {KRange} from './range'
import {editorRange} from '../events/range-monitor'
import {highlight} from '../vars/global-exports-funtions'

/**
 * 高亮代码
 * @param range {KRange|KRangeData|null} KRange 对象或者离线数据
 * @param pre {Element|Node} 代码块对象
 * @param force {boolean?} 是否强制恢复 range
 * @return {Promise<boolean>} 是否执行了高亮操作
 */
export async function highlightCode(range, pre, force) {
    console.assert(pre?.nodeName === 'PRE', '传入的 pre 必须是代码块对象', pre)
    if (!highlight) return false
    if (range) {
        const old = editorRange
        const isArray = Array.isArray(range)
        const offlineData = isArray ? range : range.serialization()
        const cb = highlight(pre)
        if (cb) await cb
        if (force || old === editorRange)
            KRange.deserialized(offlineData).active()
    } else {
        const cb = highlight(pre)
        if (cb) await cb
    }
    return true
}