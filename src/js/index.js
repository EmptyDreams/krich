import krichStyle from '../resources/css/main.styl'

import './behavior'
import {behaviors} from './constant'
import {replaceElement} from './utils'
import {getTopLines, setCursorPosition} from './range'

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
    }</div><div class="krich-editor" spellcheck contenteditable><p><br/></p></div>`
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
                        editorContent.innerHTML = '<p><br/></p>'
                }
        }
    }
    editorContent.addEventListener('keyup', event => {
        const task = switchTask(event.key)
        if (task) setTimeout(task, 0)
    })
    // 在引用中换行时合并引用，并纠正光标位置
    editorContent.addEventListener('keydown', event => {
        const {key} = event
        if (key !== 'Enter') return
        const range = getSelection().getRangeAt(0)
        const name = 'BLOCKQUOTE'
        const lines = getTopLines(range)
        const firstBlockquote = lines.find(it => it.nodeName === name)
        if (!firstBlockquote) return
        event.preventDefault()
        if (range.collapsed) {  // 如果没有选中任何内容，则直接键入换行
            let textContent = firstBlockquote.textContent
            let interval = ''
            if (!textContent.endsWith('\n')) interval = '\n'
            const index = range.startContainer.nodeType === Node.TEXT_NODE ? range.startOffset : textContent.length
            firstBlockquote.textContent = textContent.substring(0, index) + '\n' + textContent.substring(index) + interval
            setCursorPosition(firstBlockquote.firstChild, index + 1)
        } else if (lines.length === 1) {    // 如果是范围选择并且限制在一个引用内，则删除选中的部分并替换为换行符
            const textContent = firstBlockquote.textContent
            const {startOffset} = range
            firstBlockquote.textContent = textContent.substring(0, startOffset) + '\n' + textContent.substring(range.endOffset)
            setCursorPosition(firstBlockquote.firstChild, startOffset + 1)
        } else {    // 如果是范围选择并且跨越了多个标签
            const first = lines[0]
            const startOffset = range.startOffset
            range.deleteContents()
            if (first.nodeName === name) {
                first.textContent += first.textContent.endsWith('\n') ? '\n' : '\n\n'
                for (let i = 1; i < lines.length; i++)
                    lines[i].remove()
                setCursorPosition(first.firstChild, first.textContent.length)
            } else if (startOffset === 0) {
                first.insertAdjacentHTML('beforebegin', '<p><br/></p>')
                first.innerHTML = '<br/>'
                setCursorPosition(first.firstChild, 0)
            } else {
                first.insertAdjacentHTML('afterend', '<p><br/></p>')
                setCursorPosition(first.nextSibling.firstChild, 0)
            }
        }
    })
}