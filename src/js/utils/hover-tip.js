import {highlightLanguagesGetter, KRICH_EC_CLASS, KRICH_EDITOR, KRICH_HOVER_TIP} from '../vars/global-fileds'
import {getRelCoords} from './dom'

const HOVER_TIP_LIST = {
    code: () => {
        const list = highlightLanguagesGetter()
        return `<div class="select" data-value="0"><span class="value">${list[0][0]}</span><div class="items">${list.map((it, index) => '<div data-value="${index}>"' + it[0] + '</div>')}</div></div>`
    }
}

/**
 * 打开一个悬浮窗
 * @param name {string & keyof HoverTipNames} 悬浮窗名称
 * @param target {Element} 悬浮窗绑定的标签
 */
export function openHoverTip(name, target) {
    KRICH_HOVER_TIP.innerHTML = HOVER_TIP_LIST[name]()
    KRICH_HOVER_TIP.tip = target
    KRICH_HOVER_TIP.classList.add('active')
    updateHoverTipPosition()
}

/** 关闭已打开的悬浮窗，若没有打开悬浮窗则该函数将什么都不处理 */
export function closeHoverTip() {
    KRICH_HOVER_TIP.classList.remove('active')
    KRICH_HOVER_TIP.tip = null
}

/** 更新悬浮窗坐标 */
export function updateHoverTipPosition() {
    console.assert(KRICH_HOVER_TIP.tip, '悬浮窗没有绑定对象')
    const [x, y] = getRelCoords(KRICH_HOVER_TIP.tip, KRICH_EDITOR)
    KRICH_HOVER_TIP.style.top = Math.max(5, y - KRICH_HOVER_TIP.offsetHeight - 5) + 'px'
    KRICH_HOVER_TIP.style.left = (x + 5) + 'px'
}