/** @type {string} */
import imageHoverHtml from '../../resources/html/tools/libs/imageHover.html'
import {
    HOVER_TIP_NAME,
    KRICH_EDITOR,
    KRICH_HOVER_TIP,
    SELECT_VALUE, TOP_LIST
} from '../vars/global-fileds'
import {findParentTag, getRelCoords} from './dom'
import {highlightCode} from './highlight'
import {editorRange} from '../events/range-monitor'
import {highlightLanguagesGetter, imageHandler} from '../vars/global-exports-funtions'
import {createElement, isEmptyLine} from './tools'
import {KRange} from './range'

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
            KRICH_HOVER_TIP.innerHTML = `<div class="select" data-value="0"><span class="value">${list.find(it => language.endsWith('-' + it[1]))[0]}</span><div class="items">${list.map((it, index) => '<div data-value="' + index + '">' + it[0] + '</div>').join('')}</div></div>`
        },
        onchange: async (select) => {
            const pre = KRICH_HOVER_TIP.tip
            const list = highlightLanguagesGetter()
            pre.className = 'language-' + list[parseInt(select.getAttribute(SELECT_VALUE))][1]
            await highlightCode(editorRange, pre)
        }
    },
    img: {
        init: () => {
            KRICH_HOVER_TIP.innerHTML = imageHoverHtml
            const [
                uploaderInput, linkInput, descrInput,
                cancelButton, submitButton, resetButton,
                errorSpan
            ] = ['file-selector', 'file-link', 'img-descr', 'cancel', 'submit', 'reset', 'error']
                .map(it => KRICH_HOVER_TIP.getElementsByClassName(it)[0])
            const uploaderBackground = uploaderInput.parentElement
            let element
            if (imageHandler) {
                uploaderInput.onchange = event => {
                    const imageFile = event.target.files[0]
                    element = createElement('img')
                    imageHandler(element, imageFile).then(() => {
                        const url = element.getAttribute('src')
                        uploaderBackground.style.backgroundImage = `url(${url})`
                    })
                    linkInput.disabled = true
                }
            }
            cancelButton.onclick = () => closeHoverTip()
            submitButton.onclick = () => {
                errorSpan.classList.remove('active')
                if (!element) {
                    const url = linkInput.value
                    if (!url) return errorSpan.classList.add('active')
                    element = createElement('img', {
                        src: url
                    })
                }
                const descr = descrInput.value.trim()
                if (!descr) {
                    return errorSpan.classList.add('active')
                }
                element.setAttribute('alt', descr)
                const line = findParentTag(editorRange.realStartContainer(), TOP_LIST)
                if (isEmptyLine(line)) {
                    line.replaceWith(element)
                } else {
                    line.insertAdjacentElement('afterend', element)
                }
                new KRange(element).active()
                closeHoverTip()
            }
            resetButton.onclick = () => {
                errorSpan.classList.remove('active')
                uploaderInput.value = linkInput.value = descrInput.value = uploaderBackground.style.background = ''
                linkInput.disabled = false
            }
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
    HOVER_TIP_LIST[name].init()
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
    const {t: top, l: left, b: bottom} = getRelCoords(tipTarget, KRICH_EDITOR)
    let styleTop, styleLeft = left + 5
    const tipHeight = KRICH_HOVER_TIP.offsetHeight
    const editorHeight = KRICH_EDITOR.offsetHeight
    if (top - tipHeight > 6) {
        styleTop = top - tipHeight - 5
    } else if (bottom + tipHeight + 6 < editorHeight) {
        styleTop = bottom + 5
    } else {
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