import {
    highlightLanguagesGetter,
    HOVER_TIP_NAME,
    KRICH_EDITOR,
    KRICH_HOVER_TIP,
    SELECT_VALUE
} from '../vars/global-fileds'
import {getRelCoords} from './dom'
import {highlightCode} from './highlight'
import {editorRange} from '../events/range-monitor'

/**
 * @type {{
 *     [p: HoverTipNames]: HoverTipValue
 * }}
 */
export const HOVER_TIP_LIST = {
    code: {
        init: () => {
            const pre = KRICH_HOVER_TIP.tip
            const list = highlightLanguagesGetter()
            let language = pre.className
            if (!language || language.endsWith('-none')) {
                language = 'language-' + list[0][1]
            }
            pre.className = language
            // noinspection JSIgnoredPromiseFromCall
            highlightCode(editorRange, pre)
            return `<div class="select" data-value="0"><span class="value">${list.find(it => language.endsWith('-' + it[1]))[0]}</span><div class="items">${list.map((it, index) => '<div data-value="' + index + '">' + it[0] + '</div>').join('')}</div></div>`
        },
        onchange: async (select) => {
            const pre = KRICH_HOVER_TIP.tip
            const list = highlightLanguagesGetter()
            pre.className = 'language-' + list[parseInt(select.getAttribute(SELECT_VALUE))][1]
            await highlightCode(editorRange, pre)
        }
    }
}

/**
 * 打开一个悬浮窗
 * @param name {HoverTipNames} 悬浮窗名称
 * @param target {Element} 悬浮窗绑定的标签
 */
export function openHoverTip(name, target) {
    const classList = KRICH_HOVER_TIP.classList
    if (classList.contains('active')) return
    KRICH_HOVER_TIP.setAttribute(HOVER_TIP_NAME, name)
    KRICH_HOVER_TIP.tip = target
    KRICH_HOVER_TIP.innerHTML = HOVER_TIP_LIST[name].init()
    classList.add('active')
    updateHoverTipPosition()
}

/** 关闭已打开的悬浮窗，若没有打开悬浮窗则该函数将什么都不处理 */
export function closeHoverTip() {
    KRICH_HOVER_TIP.classList.remove('active')
    KRICH_HOVER_TIP.tip = null
}

/** 更新悬浮窗坐标 */
export function updateHoverTipPosition() {
    // noinspection JSUnresolvedReference
    const tipTarget = KRICH_HOVER_TIP.tip
    if (!tipTarget) return
    const {t: top, l: left} = getRelCoords(tipTarget, KRICH_EDITOR)
    let styleTop, styleLeft = left + 5
    const tipHeight = KRICH_HOVER_TIP.offsetHeight
    if (top - tipHeight > 6)
        styleTop = top - tipHeight - 5
    else {
        styleTop = 5
        styleLeft = -35
    }
    const style = KRICH_HOVER_TIP.style
    style.left = style.right = ''
    style.top = styleTop + 'px'
    if (styleLeft > 0)
        style.left = styleLeft + 'px'
    else
        style.right = -styleLeft + 'px'
}