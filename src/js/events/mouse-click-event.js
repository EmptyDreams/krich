import {
    behaviors,
    DATA_ID,
    KRICH_TOOL_BAR,
    markStatusCacheInvalid,
    SELECT_VALUE
} from '../global-fileds'
import {getElementBehavior, parseRgbToHex} from '../utils/tools'
import {editorRange} from './range-monitor'
import {findParentTag} from '../utils/dom'

export function registryMouseClickEvent() {
    KRICH_TOOL_BAR.addEventListener('click', event => {
        const range = editorRange
        if (!range || range.body) return
        /** @type {HTMLElement} */
        let original = event.target
        let target = original
        if (target.classList.contains('krich-tools')) return
        let type, dataKey
        while (true) {
            dataKey = target.getAttribute(DATA_ID)
            if (dataKey) {
                type = dataKey
                break
            }
            target = target.parentNode
        }
        const classList = target.classList
        if (classList.contains('select')) {
            if (original === target) return
            const selectValueChecker = it => it.hasAttribute(SELECT_VALUE)
            // 判断是否需要修正点击区域（点击到选择框的选项的子标签时需要进行修正）
            const needFix = findParentTag(original, item => item.classList?.contains('items')) && !selectValueChecker(original)
            if (needFix)
                original = findParentTag(original, selectValueChecker)
            if (selectValueChecker(original)) {
                target.getElementsByClassName('value')[0].innerHTML = original.innerHTML
                const value = original.getAttribute(SELECT_VALUE)
                target.setAttribute(SELECT_VALUE, value)
            } else if (original.hasAttribute('title')) {
                target.getElementsByClassName('value')[0]
                    .setAttribute('style', original.getAttribute('style'))
            } else if (original.classList.contains('submit')) {
                const input = original.previousElementSibling
                const value = input.value
                    .replaceAll(/\s/g, '')
                    .replaceAll('，', ',')
                    .toLowerCase()
                const color = parseRgbToHex(value)
                if (color) {
                    input.classList.remove('error')
                    target.getElementsByClassName('value')[0]
                        .setAttribute('style', 'background:' + color)
                } else {
                    return input.classList.add('error')
                }
            } else return
        } else {
            target.classList.toggle('active')
            if (getElementBehavior(target).noStatus) {
                setTimeout(() => target.classList.remove('active'), 333)
            }
        }
        const correct = behaviors[dataKey].onclick?.(range, target)
        if (correct) range.active()
        markStatusCacheInvalid()
    })
}