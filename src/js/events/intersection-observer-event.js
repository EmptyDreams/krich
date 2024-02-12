import {closeHoverTip} from '../utils/hover-tip'
import {KRICH_EC} from '../vars/global-fileds'

let observer

export function registryIntersectionObserverEvent() {
    observer?.disconnect?.()
    // 当编辑区域从可视区域消失时关闭悬浮窗
    observer = new IntersectionObserver(it => {
        if (!it[0].isIntersecting)
            closeHoverTip()
    }, {threshold: 0.75})
    observer.observe(KRICH_EC)
}