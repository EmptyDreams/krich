import {behaviors, DATA_ID, KRICH_TOOL_BAR, markStatusCacheInvalid, SELECT_VALUE} from '../global-fileds'
import {getElementBehavior, parseRgbToHex} from '../utils/tools'
import {editorRange} from './range-monitor'

export function registryMouseClickEvent() {
    KRICH_TOOL_BAR.addEventListener('click', event => {
        /** @type {HTMLElement} */
        const original = event.target
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
        const range = editorRange
        const classList = target.classList
        if (classList.contains('select')) {
            if (original === target) return
            if (original.hasAttribute(SELECT_VALUE)) {
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
        const correct = behaviors[dataKey].onclick?.(range, target, event)
        if (correct) range.active()
        markStatusCacheInvalid()
    })
}