/** @type {string} */
import imageHoverHtml from '../../resources/html/hoverTips/imageHover.html'
/** @type {string} */
import {
    HOVER_TIP_NAME,
    KRICH_EDITOR,
    KRICH_HOVER_TIP,
    SELECT_VALUE
} from '../vars/global-fileds'
import {getRelCoords} from './dom'
import {highlightCode} from './highlight'
import {editorRange} from '../events/range-monitor'
import {highlightLanguagesGetter, imageHandler, imageStatusChecker} from '../vars/global-exports-funtions'
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
        init: target => {
            KRICH_HOVER_TIP.innerHTML = imageHoverHtml
            const [
                uploaderInput, linkInput,
                sizeInput, descrInput,
                errorSpan,
                submitButton
            ] = ['file-selector', 'file-link', 'size', 'img-descr', 'error', 'submit']
                .map(it => KRICH_HOVER_TIP.getElementsByClassName(it)[0])
            const uploaderBackground = uploaderInput.parentElement
            let oldIsImage = target.nodeName === 'IMG'
            let imageElement = oldIsImage ? target.cloneNode(false) :
                createElement('img', ['img'])
            /** 将图片插入到 DOM 中 */
            submitButton.onclick = () => {
                if (imageElement.hasAttribute('src')) {
                    descrInput.disabled = sizeInput.disabled = false
                    imageElement.setAttribute('style', 'width:' + sizeInput.value + '%')
                    if (oldIsImage || isEmptyLine(target)) {
                        target.replaceWith(imageElement)
                    } else {
                        target.insertAdjacentElement('afterend', imageElement)
                    }
                    new KRange(imageElement).active()
                    target = imageElement
                    imageElement = imageElement.cloneNode(false)
                    oldIsImage = true
                    submitButton.disabled = true
                }
            }
            // 如果传入的 target 是 IMG 标签，则同步悬浮窗与图片的数据
            if (oldIsImage) {
                const url = imageElement.getAttribute('src')
                if (url.startsWith('data'))
                    uploaderBackground.style.backgroundImage = `url(${url})`
                else
                    linkInput.value = url
                descrInput.value = imageElement.getAttribute('alt')
                const style = imageElement.getAttribute('style')
                if (style) {
                    sizeInput.value = style.substring(6, style.length - 1)
                }
                descrInput.disabled = sizeInput.disabled = false
            }
            // 如果用户设置的图片处理器，则为 uploader 添加相关事件
            if (imageHandler) {
                uploaderInput.onchange = event => {
                    sizeInput.disabled = true
                    const imageFile = event.target.files[0]
                    imageHandler(imageElement, imageFile).then(() => {
                        const url = imageElement.getAttribute('src')
                        uploaderBackground.style.backgroundImage = `url(${url})`
                        submitButton.disabled = false
                    })
                    linkInput.disabled = true
                }
            } else uploaderInput.disabled = true
            // 为 URL 输入栏添加事件
            linkInput.onchange = async () => {
                errorSpan.classList.remove('active')
                const url = linkInput.value.trim()
                uploaderInput.disabled = !!url
                if (!url) return
                if (!/^https?:\/\/\S+\.\S+(.*)$/.test(url)) {
                    errorSpan.classList.add('active')
                    return
                }
                // 检查 URL 是否可用
                const status = await fetch(url, {
                    method: 'HEAD'
                }).then(response => {
                    if (!response.ok) return false
                    const type = response.headers.get('Content-Type')
                    if (type && !type.startsWith('image/')) return false
                    return imageStatusChecker?.(response) ?? true
                }).catch(() => false)
                if (status) {
                    imageElement.setAttribute('src', url)
                    submitButton.disabled = false
                } else {
                    errorSpan.classList.add('active')
                }
            }
            // 为尺寸调整添加事件
            sizeInput.oninput = () => {
                console.assert(target.nodeName === 'IMG', 'target 不是图片', target)
                const value = parseInt(sizeInput.value)
                target.setAttribute('style', `width:${value}%`)
            }
            // 为描述栏添加事件
            descrInput.onchange = () => {
                console.assert(target.nodeName === 'IMG', 'target 不是图片', target)
                target.setAttribute('alt', descrInput.value)
            }
        }
    }
}

/**
 * 打开一个悬浮窗
 * @param name {HoverTipNames} 悬浮窗名称
 * @param target {Element} 悬浮窗绑定的标签
 * @param otherArgs {any} 额外传入到 init 的参数
 */
export function openHoverTip(name, target, ...otherArgs) {
    console.assert(target instanceof Element, '只能绑定 Element，不能绑定 Node', target)
    const classList = KRICH_HOVER_TIP.classList
    if (classList.contains('active')) return
    KRICH_HOVER_TIP.setAttribute(HOVER_TIP_NAME, name)
    KRICH_HOVER_TIP.tip = target
    HOVER_TIP_LIST[name].init(target, ...otherArgs)
    classList.add('active')
    editorRange.active()
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