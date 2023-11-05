import krichStyle from '../resources/css/main.styl'

import './behavior'
import {behaviors} from './constant'
import {replaceElement} from './utils'
import {getTopLines, setCursorPosition} from './range'
import {addBeforeInputEvent} from './event'

export {behaviors}

// noinspection JSUnusedGlobalSymbols
/**
 * 在指定元素内初始化编辑器
 *
 * 内置支持以下选项：
 *
 * ```
 * headerSelect: 标题或正文选择器
 * blockquote: 引用
 * bold: 加粗
 * underline: 下划线
 * italic: 斜体
 * through: 删除线
 * code: 行内代码
 * sup: 上标
 * sub: 下标
 * clear: 清除格式
 * color: 文本颜色
 * background: 文本背景色
 * ul: 无序列表
 * ol: 有序列表
 * multi: 多选列表
 * ```
 *
 * @param selector {string} 元素选择器
 * @param elements {{[key: string]: (boolean | any)}} 要显示的选项元素，key 表示选项名称，填 true 或 false 表示启用或禁用，填其他值表示具体配置
 */
export function initEditor(selector, elements) {
    const container = document.querySelector(selector)
    container.insertAdjacentHTML('beforebegin', `<style>${krichStyle}</style>`)
    container.innerHTML = `<div class="krich-tools">${
        Object.getOwnPropertyNames(elements)
            .map(it => behaviors[it].render())
            .join('')
    }</div><div class="krich-editor" spellcheck contenteditable><p></p></div>`
    const editorTools = container.getElementsByClassName('krich-tools')[0]
    const editorContent = container.getElementsByClassName('krich-editor')[0]
    editorTools.addEventListener('click', event => {
        const original = event.target
        let target = original
        if (target.classList.contains('krich-tools')) return
        let type, dataKey
        while (true) {
            dataKey = target.getAttribute('data-key')
            if (dataKey) {
                type = dataKey
                break
            }
            target = target.parentNode
        }
        const classList = target.classList
        if (classList.contains('select')) {
            classList.toggle('show')
            if (!original.classList.contains('item')) {
                target.onblur = () => classList.remove('show')
                return
            }
            target.getElementsByTagName('span')[0].innerText = original.innerText
        }
        behaviors[dataKey].onclick?.(event, target)
    })
    const switchTask = key => {
        switch (key) {
            case 'Enter':
                return () => editorContent.querySelectorAll('&>div:not([data-id])')
                        .forEach(it => replaceElement(it, document.createElement('p')))
            case 'Backspace':
                return () => {
                    if (editorContent.childElementCount === 0)
                        editorContent.append(document.createElement('p'))
                }
        }
    }
    editorContent.addEventListener('keyup', event => {
        const task = switchTask(event.key)
        if (task) setTimeout(task, 0)
    })
    // 在引用中换行时合并引用，并纠正光标位置
    addBeforeInputEvent(editorContent, event => {
        let {data} = event
        if (!data && event.inputType === 'insertParagraph') data = '\n'
        if (!data) return
        const range = getSelection().getRangeAt(0)
        const name = 'BLOCKQUOTE'
        const lines = getTopLines(range)
        if (!lines.find(it => it.nodeName === name)) return
        if (range.collapsed) {  // 如果没有选中任何内容，则直接键入换行
            if (data !== '\n') return
            const blockquote = lines[0]
            let textContent = blockquote.textContent
            let interval = ''
            if (!textContent.endsWith('\n')) interval = data
            const index = range.startContainer.nodeType === Node.TEXT_NODE ? range.startOffset : textContent.length
            blockquote.textContent = textContent.substring(0, index) + data + textContent.substring(index) + interval
            setCursorPosition(blockquote.firstChild, index + 1)
        } else if (lines.length === 1) {    // 如果是范围选择并且限制在一个引用内，则删除选中的部分并替换为换行符
            const blockquote = lines[0]
            const textContent = blockquote.textContent
            const {startOffset} = range
            blockquote.textContent = textContent.substring(0, startOffset) + data + textContent.substring(range.endOffset)
            setCursorPosition(blockquote.firstChild, startOffset + data.length)
        } else {    // 如果是范围选择并且跨越了多个标签
            const first = lines[0]
            if (first.nodeName === name) {
                range.deleteContents()
                first.textContent += data
                setCursorPosition(first.firstChild, first.textContent.length)
            } else if (range.startOffset === 0) {
                const p = document.createElement('p')
                if (data !== '\n') p.textContent = data
                first.insertAdjacentElement('beforebegin', p)
                range.deleteContents()
                setCursorPosition(p.firstChild ?? p, p.textContent.length)
            } else {
                range.deleteContents()
                if (data === '\n') {
                    const p = document.createElement('p')
                    first.insertAdjacentElement('afterend', p)
                    setCursorPosition(p, 0)
                } else {
                    lines[0].textContent += data
                    setCursorPosition(lines[0].firstChild, lines[0].textContent.length)
                }
            }
        }
        event.preventDefault()
    })
}