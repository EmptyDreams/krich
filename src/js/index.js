import krichStyle from '../resources/css/main.styl'

import './behavior'
import {
    behaviors,
    DATA_ID,
    initContainerQuery,
    KRICH_TOOL_BAR,
    markStatusCacheInvalid,
    statusCheckCache
} from './global-fileds'
import {KRange} from './utils/range'
import {registryBeforeInputEventListener} from './events/before-input'
import {compareBtnListStatusWith} from './utils/btn'
import {registryKeyboardEvent} from './events/keyboard-event'
import {registryMouseClickEvent} from './events/mouse-click-event'
import {registryRangeMonitor} from './events/range-monitor'

export {behaviors}

// noinspection JSUnusedGlobalSymbols
/**
 * 在指定容器内初始化编辑器，该容器应当是一个内容为空的标签
 *
 * @param optional {string|Element} 元素选择器或容器
 */
export function initEditor(optional) {
    const container = typeof optional === 'string' ? document.querySelector(optional) : optional
    console.assert(!!container.firstChild, "指定的容器内容不为空：", container)
    container.insertAdjacentHTML('beforebegin', `<style>${krichStyle}</style>`)
    container.innerHTML = `<div class="krich-tools">${
        Object.getOwnPropertyNames(behaviors)
            .map(it => behaviors[it].render())
            .join('')
    }</div><div class="krich-editor" spellcheck contenteditable><p><br></p></div>`
    initContainerQuery(container)
    registryMouseClickEvent()
    registryKeyboardEvent()
    registryRangeMonitor()
    registryBeforeInputEventListener(KRICH_TOOL_BAR, event => {
        // noinspection JSUnresolvedReference
        const data = event.data
        if (statusCheckCache || !data) return
        markStatusCacheInvalid()
        setTimeout(() => {
            let kRange = KRange.activated()
            let range = kRange.item
            if (!range.collapsed) return
            const {startContainer, startOffset} = range
            const buttonList = compareBtnListStatusWith(startContainer)
            if (!buttonList) return
            const newRange = new KRange()
            newRange.setStart(startContainer, startOffset - data.length)
            newRange.setEnd(startContainer, startOffset)
            const offline = newRange.serialization()
            for (let child of buttonList) {
                const dataId = child.getAttribute(DATA_ID)
                const behavior = behaviors[dataId]
                behavior.onclick(KRange.deserialized(offline), child, null)
            }
        }, 0)
    })
}