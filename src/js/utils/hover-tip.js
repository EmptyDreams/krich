/** @type {string} */
import imageHoverHtml from '../../resources/html/hoverTips/imageHover.html'
/** @type {string} */
import linkHoverHtml from '../../resources/html/hoverTips/linkHover.html'
import {
    HOVER_TIP_NAME,
    KRICH_EDITOR,
    KRICH_HOVER_TIP,
    SELECT_VALUE, TOP_LIST
} from '../vars/global-fileds'
import {findParentTag, getRelCoords, nextLeafNode, prevLeafNode} from './dom'
import {highlightCode} from './highlight'
import {editorRange} from '../events/range-monitor'
import {highlightLanguagesGetter, imageHandler, imageStatusChecker} from '../vars/global-exports-funtions'
import {createElement, isEmptyLine, isTextNode, waitTime} from './tools'
import {KRange, setCursorPositionAfter} from './range'
import {uploadImage} from './image-handler'
import {isHttpUrl} from './string-utils'
import {syncButtonsStatus} from './btn'

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
            let language = pre.className || 'language-' + list[0][1]
            pre.className = language
            KRICH_HOVER_TIP.innerHTML = `<div class="select" data-value="0"><span class="value">${list.find(it => language.endsWith('-' + it[1]))[0]}</span><div class="items">${list.map((it, index) => '<div data-value="' + index + '">' + it[0] + '</div>').join('')}</div></div>`
        },
        onchange: async (select) => {
            const pre = KRICH_HOVER_TIP.tip
            const list = highlightLanguagesGetter()
            pre.className = 'language-' + list[parseInt(select.getAttribute(SELECT_VALUE))][1]
            await highlightCode(editorRange, pre)
        }
    },
    link: {
        init: target => {
            const topLine = findParentTag(target, TOP_LIST)
            KRICH_HOVER_TIP.innerHTML = linkHoverHtml
            const [
                descInput, urlInput, submitButton, errorSpan
            ] = ['desc-input', 'url-input', 'submit', 'error']
                .map(it => KRICH_HOVER_TIP.getElementsByClassName(it)[0])
            waitTime(0).then(() => descInput.select())
            if (target.nodeName !== 'A')
                target = null
            if (target) {
                descInput.value = target.textContent
                urlInput.value = target.getAttribute('href')
            }
            submitButton.onclick = () => {
                const desc = descInput.value
                const url = urlInput.value
                if (!desc || !isHttpUrl(url)) {
                    errorSpan.classList.add('active')
                    return
                }
                if (!target) {
                    target = createElement('a')
                    if (isEmptyLine(topLine)) {
                        topLine.firstChild.replaceWith(target)
                    } else {
                        const pos = findParentTag(
                            editorRange.realStartContainer(),
                            it => it.parentNode === topLine
                        )
                        const [left, right] = editorRange.splitNode(pos)
                        if (left) left.after(target)
                        else right.before(target)
                    }
                }
                target.setAttribute('href', url)
                target.setAttribute('target', location.hostname === new URL(url).hostname ? '_self' : '_blank')
                target.textContent = desc
                closeHoverTip()
                const prev = prevLeafNode(target, true, topLine)
                const next = nextLeafNode(target, true, topLine)
                if (prev && isTextNode(prev) && !prev.textContent.endsWith(' ')) {
                    prev.textContent += ' '
                }
                if (next) {
                    console.assert(isTextNode(next), '当后方有节点时一定是文本节点')
                    const content = next.textContent
                    if (!content.startsWith(' '))
                        next.textContent = ' ' + content
                    setCursorPositionAfter(target)
                } else {
                    target.after(' ')
                    setCursorPositionAfter(target.nextSibling)
                }
            }
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
                createElement('img')
            /** 将图片插入到 DOM 中 */
            submitButton.onclick = () => {
                if (imageElement.hasAttribute('src')) {
                    descrInput.disabled = sizeInput.disabled = false
                    imageElement.setAttribute('style', 'width:' + sizeInput.value + '%')
                    if (oldIsImage || isEmptyLine(target)) {
                        target.replaceWith(imageElement)
                    } else {
                        target.after(imageElement)
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
                    uploadImage(imageFile, imageElement).then(() => {
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
                if (!isHttpUrl(url)) {
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
    updateHoverTipPosition()
}

/** 关闭已打开的悬浮窗，若没有打开悬浮窗则该函数将什么都不处理 */
export function closeHoverTip() {
    KRICH_HOVER_TIP.classList.remove('active')
    KRICH_HOVER_TIP.tip = null
    syncButtonsStatus(editorRange.commonAncestorContainer)
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