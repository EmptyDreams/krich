import {highlightLanguagesGetter, KRICH_EDITOR, KRICH_HOVER_TIP} from '../vars/global-fileds'
import {getRelCoords} from './dom'

const HOVER_TIP_LIST = {
    code: () => {
        const list = highlightLanguagesGetter()
        return `<div class="select" data-value="0"><span class="value">${list[0][0]}</span><div class="items">${list.map((it, index) => '<div data-value="' + index + '">' + it[0] + '</div>').join('')}</div></div>`
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
    const tipTarget = KRICH_HOVER_TIP.tip
    if (!tipTarget) return
    const {t: top, l: left, b: bottom} = getRelCoords(tipTarget, KRICH_EDITOR)
    let styleTop, styleLeft = left + 5
    const tipHeight = KRICH_HOVER_TIP.offsetHeight
    const editorHeight = KRICH_EDITOR.offsetHeight
    if (top - tipHeight > 6)
        styleTop = top - tipHeight - 5
    else if (bottom + tipHeight + 6 < editorHeight)
        styleTop = bottom + 5
    else {
        styleTop = 5
        styleLeft = -10
    }
    const style = KRICH_HOVER_TIP.style
    style.left = style.right = ''
    style.top = styleTop + 'px'
    if (styleLeft > 0)
        style.left = styleLeft + 'px'
    else
        style.right = -styleLeft + 'px'
}