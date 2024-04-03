/** @type {string} */
import imageHoverHtml from '../../resources/html/hoverTips/imageHover.html'
/** @type {string} */
import linkHoverHtml from '../../resources/html/hoverTips/linkHover.html'
import {
    ACTIVE_FLAG,
    HOVER_TIP_NAME,
    KRICH_EDITOR,
    KRICH_HOVER_TIP,
    SELECT_VALUE, TOP_LIST
} from '../vars/global-fileds'
import {findParentTag, getRelCoords, insertSpaceBetweenNode} from './dom'
import {editorRange} from '../events/range-monitor'
import {highlightLanguagesGetter, imageStatusChecker} from '../vars/global-exports-funtions'
import {createElement, isEmptyLine, waitTime} from './tools'
import {KRange} from './range'
import {isHttpUrl, readImageToBase64} from './string-utils'
import {syncButtonsStatus} from './btn'

const linkHoverNoDescHtml = linkHoverHtml.substring(linkHoverHtml.indexOf('</div>') + 6)

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
            const prefix = 'language-'
            let language
            for (let name of pre.classList) {
                if (name.startsWith(prefix)) {
                    language = name
                    break
                }
            }
            if (!language) {
                language = prefix + list[0][1]
                pre.classList.add(language)
            }
            KRICH_HOVER_TIP.innerHTML = `<div class="select" data-value="0"><span class="value">${list.find(it => language.endsWith('-' + it[1]))[0]}</span><div class="items">${list.map((it, index) => '<div data-value="' + index + '">' + it[0] + '</div>').join('')}</div></div>`
        },
        onchange: select => {
            const pre = KRICH_HOVER_TIP.tip
            const list = highlightLanguagesGetter()
            pre.className = 'language-' + list[parseInt(select.getAttribute(SELECT_VALUE))][1]
        }
    },
    link: {
        init: target => {
            const topLine = findParentTag(target, TOP_LIST)
            const isLink = target.nodeName === 'A'
            KRICH_HOVER_TIP.innerHTML = isLink ? linkHoverNoDescHtml : linkHoverHtml
            const [
                descInput, urlInput, submitButton, errorSpan
            ] = ['desc-input', 'url-input', 'submit', 'error']
                .map(it => KRICH_HOVER_TIP.getElementsByClassName(it)[0])
            if (isLink) {
                urlInput.value = target.getAttribute('href')
            } else {
                target = null
                waitTime(0).then(() => descInput.select())
            }
            urlInput.onkeydown = event => {
                if (!event.repeat && event.code.endsWith('Enter')) {
                    event.preventDefault()
                    submitButton.click()
                }
            }
            submitButton.onclick = () => {
                const desc = descInput?.value
                const url = urlInput.value
                if ((descInput && !desc) || !isHttpUrl(url)) {
                    errorSpan.classList.add(ACTIVE_FLAG)
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
                    target.textContent = desc
                }
                target.setAttribute('href', url)
                closeHoverTip()
                insertSpaceBetweenNode(target, true)
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
            uploaderInput.onchange = event => {
                sizeInput.disabled = true
                const imageFile = event.target.files[0]
                readImageToBase64(imageFile).then(src => {
                    imageElement.setAttribute('src', src)
                    uploaderBackground.style.backgroundImage = `url(${src})`
                    submitButton.disabled = false
                })
                linkInput.disabled = true
            }
            // 为 URL 输入栏添加事件
            linkInput.onchange = async () => {
                errorSpan.classList.remove(ACTIVE_FLAG)
                const url = linkInput.value.trim()
                uploaderInput.disabled = !!url
                if (!url) return
                if (!isHttpUrl(url)) {
                    errorSpan.classList.add(ACTIVE_FLAG)
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
                    errorSpan.classList.add(ACTIVE_FLAG)
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
    if (classList.contains(ACTIVE_FLAG)) return
    KRICH_HOVER_TIP.setAttribute(HOVER_TIP_NAME, name)
    KRICH_HOVER_TIP.tip = target
    HOVER_TIP_LIST[name].init(target, ...otherArgs)
    classList.add(ACTIVE_FLAG)
    updateHoverTipPosition()
}

/** 关闭已打开的悬浮窗，若没有打开悬浮窗则该函数将什么都不处理 */
export function closeHoverTip() {
    KRICH_HOVER_TIP.classList.remove(ACTIVE_FLAG)
    KRICH_HOVER_TIP.tip = null
    if (editorRange)
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