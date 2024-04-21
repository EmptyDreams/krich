/** @type {string} */
import headerSelectHtml from '../resources/html/tools/headerSelect.html'
/** @type {string} */
import blockquoteHtml from '../resources/html/tools/blockquote.html'
/** @type {string} */
import boldHtml from '../resources/html/tools/bold.html'
/** @type {string} */
import underlineHtml from '../resources/html/tools/underline.html'
/** @type {string} */
import italicHtml from '../resources/html/tools/italic.html'
/** @type {string} */
import delHtml from '../resources/html/tools/del.html'
/** @type {string} */
import inlineCodeHtml from '../resources/html/tools/inlineCode.html'
/** @type {string} */
import supHtml from '../resources/html/tools/sup.html'
/** @type {string} */
import subHtml from '../resources/html/tools/sub.html'
/** @type {string} */
import clearHtml from '../resources/html/tools/clear.html'
/** @type {string} */
import colorHtml from '../resources/html/tools/color.html'
/** @type {string} */
import backgroundHtml from '../resources/html/tools/background.html'
/** @type {string} */
import ulHtml from '../resources/html/tools/ul.html'
/** @type {string} */
import olHtml from '../resources/html/tools/ol.html'
/** @type {string} */
import todoHtml from '../resources/html/tools/todo.html'
/** @type {string} */
import codeHtml from '../resources/html/tools/code.html'
/** @type {string} */
import imageHtml from '../resources/html/tools/image.html'
/** @type {string} */
import linkHtml from '../resources/html/tools/link.html'
/** @type {string} */
import hrHtml from '../resources/html/tools/hr.html'

import {
    ACTIVE_FLAG, GLOBAL_HISTORY,
    HASH_NAME,
    KRICH_EDITOR, markStatusCacheInvalid,
    SELECT_VALUE,
    TITLE_LIST,
    TOP_LIST
} from './vars/global-fileds'
import {behaviorHeader} from './behaviors/header'
import {KRange} from './utils/range'
import {findParentTag, prevLeafNode, zipTree} from './utils/dom'
import {
    createElement, createHash,
    isEmptyBodyElement, isListLine, isTextNode,
    readSelectedColor,
    removeAllAttributes,
    setSelectedColor
} from './utils/tools'
import {onclickMultiElementStructure} from './behaviors/multi-element-structure'
import {onclickHr} from './behaviors/hr'
import {TODO_MARKER} from './vars/global-tag'
import {editorRange} from './events/range-monitor'
import {behaviorHighlight} from './behaviors/highlight'
import {
    BEHAVIOR_STATE_MES, BEHAVIOR_STATE_NO_RECORD,
    BEHAVIOR_STATE_NO_STATUS,
    BEHAVIOR_STATE_TEXT_AREA,
    isNoStatus
} from './types/button-behavior'
import {openHoverTip} from './utils/hover-tip'
import {rgbToHex} from './utils/string-utils'
import {highlightCode} from './utils/highlight'

// noinspection JSUnusedGlobalSymbols
/**
 * 工具栏上的按钮的数据
 * @type {{[key: string]: ButtonBehavior}}
 */
export const behaviors = {
    headerSelect: {
        state: BEHAVIOR_STATE_NO_STATUS,
        exp: ['P', ...TITLE_LIST].join(','),
        render: () => headerSelectHtml,
        onclick: behaviorHeader,
        translator: removeAllAttributes,
    },
    blockquote: {
        state: BEHAVIOR_STATE_MES,
        exp: 'blockquote',
        render: () => blockquoteHtml,
        onclick: range => onclickMultiElementStructure(range, 'blockquote'),
        verify: () => true,
        builder: () => createElement('blockquote'),
        newLine: () => false,
        translator: removeAllAttributes
    },
    bold: {
        exp: 'b,strong',
        render: () => boldHtml,
        onclick: range => execCommonCommand('bold', range),
        builder: () => createElement('b'),
        translator: removeAllAttributes
    },
    underline: {
        exp: 'u',
        render: () => underlineHtml,
        onclick: range => execCommonCommand('underline', range),
        builder: () => createElement('u'),
        translator: removeAllAttributes
    },
    italic: {
        exp: 'i',
        render: () => italicHtml,
        onclick: range => execCommonCommand('italic', range),
        builder: () => createElement('i'),
        translator: removeAllAttributes
    },
    del: {
        exp: 'del',
        render: () => delHtml,
        onclick: range => execCommonCommand('del', range),
        builder: () => createElement('del'),
        translator: removeAllAttributes
    },
    link: {
        exp: 'a',
        render: () => linkHtml,
        onclick: range => openHoverTip(
            'link', findParentTag(range.startContainer, it => !isTextNode(it))
        ),
        translator: node => {
            const href = node.getAttribute('href')
            const target = node.getAttribute('target')
            removeAllAttributes(node)
            node.setAttribute('href', href)
            node.setAttribute('target', target)
            return node
        },
        hover: link => openHoverTip('link', link)
    },
    inlineCode: {
        exp: 'code.inline',
        render: () => inlineCodeHtml,
        onclick: range => execCommonCommand('inlineCode', range),
        builder: () => createElement('code', ['inline']),
        translator: removeAllAttributes
    },
    sub: {
        exp: 'sub',
        render: () => subHtml,
        onclick: range => execCommonCommand('sub', range, false, ['sup']),
        builder: () => createElement('sub'),
        translator: removeAllAttributes
    },
    sup: {
        exp: 'sup',
        render: () => supHtml,
        onclick: range => execCommonCommand('sup', range, false, ['sub']),
        builder: () => createElement('sup'),
        translator: removeAllAttributes
    },
    color: {
        exp: (() => {
            const exps = ['^="color:"', '*=";color:"']
            const names = ['span', 'font']
            return exps.map(it => '[style' + it + ']')
                .flatMap(it => names.map(name => name + it))
                .join()
        })(),
        render: () => colorHtml,
        onclick: (range, btn) => colorOnclick(range, btn, 'color'),
        builder: btn => createElement('span', {style: 'color:' + readSelectedColor(btn)}),
        verify: (btn, item) => readSelectedColor(btn) === item.getAttribute('style').substring(6),
        setter: (btn, item) => {
            setSelectedColor(btn, item ? item.getAttribute('style').substring(6) : btn.getAttribute(SELECT_VALUE))
        },
        translator: item => {
            const style = item.style
            const color = rgbToHex(style.color)
            style.color = ''
            return createElement('span', {
                style: 'color:' + color
            })
        }
    },
    background: {
        exp: (() => {
            const exps = ['background:#', 'background:rgb', 'background-color:']
            const names = ['span', 'font']
            return exps.map(it => '[style*="' + it + '"]')
                .flatMap(it => names.map(name => name + it))
                .join()
        })(),
        render: () => backgroundHtml,
        onclick: (range, btn) => colorOnclick(range, btn, 'background'),
        builder: btn => createElement('span', {style: 'background:' + readSelectedColor(btn)}),
        verify: (btn, item) => readSelectedColor(btn) === item.getAttribute('style').substring(11),
        setter: (btn, item) => {
            setSelectedColor(btn, item ? item.getAttribute('style').substring(11) : btn.getAttribute(SELECT_VALUE))
        },
        translator: item => {
            const style = item.style
            const color = rgbToHex(style.backgroundColor)
            style.backgroundColor = ''
            return createElement('span', {
                style: 'background:' + color
            })
        }
    },
    clear: {
        state: BEHAVIOR_STATE_NO_STATUS,
        render: () => clearHtml,
        onclick: range => {
            if (range.collapsed) return true
            const offlineData = range.serialization()
            const tmpBox = createElement('div', ['tmp'])
            for (let lineRange of range.splitRangeByLine()) {
                const top = findParentTag(lineRange.startContainer, TOP_LIST)
                lineRange.surroundContents(tmpBox, top)
                tmpBox.innerHTML = tmpBox.textContent
                removeNodeReserveChild(tmpBox)
                console.assert(!tmpBox.firstChild, '循环完毕后 tmpBox 内容应当为空')
            }
            console.assert(!KRICH_EDITOR.getElementsByClassName('tmp')[0], '样式清除完毕后不应当存在 tmp 标签')
            KRICH_EDITOR.querySelectorAll(`p:empty`)
                .forEach(it => it.innerHTML = '<br>')
            console.assert(
                Array.from(KRICH_EDITOR.querySelectorAll(TOP_LIST.map(it => `${it}:empty`).join()))
                    .every(it => isEmptyBodyElement(it)),
                '样式清除完成后不应当存在满足 :empty 的顶级标签'
            )
            range.deserialized(offlineData)
            return true
        }
    },
    hr: {
        state: BEHAVIOR_STATE_NO_STATUS,
        exp: 'hr',
        render: () => hrHtml,
        onclick: onclickHr,
        translator: removeAllAttributes
    },
    ul: {
        state: BEHAVIOR_STATE_MES,
        exp: 'ul:not(.todo)',
        render: () => ulHtml,
        onclick: range => onclickMultiElementStructure(range, 'ul'),
        builder: () => createElement('ul'),
        newLine: () => createElement('li'),
        translator: translateList
    },
    ol: {
        state: BEHAVIOR_STATE_MES,
        exp: 'ol',
        render: () => olHtml,
        onclick: range => onclickMultiElementStructure(range, 'ol'),
        builder: () => createElement('ol'),
        newLine: () => createElement('li'),
        translator: translateList
    },
    todo: {
        state: BEHAVIOR_STATE_MES,
        exp: 'ul.todo',
        render: () => todoHtml,
        onclick: range => onclickMultiElementStructure(range, 'todo'),
        builder: () => createElement('ul', ['todo']),
        newLine: () => {
            const line = createElement('li')
            line.append(TODO_MARKER.cloneNode(false))
            return line
        },
        translator: item => {
            translateList(item)
            item.className = 'todo'
            return item
        }
    },
    img: {
        state: BEHAVIOR_STATE_NO_STATUS | BEHAVIOR_STATE_NO_RECORD,
        exp: 'img:not(.inline)',
        render: () => imageHtml,
        onclick: range => {
            const line = findParentTag(range.realStartContainer(), TOP_LIST)
            openHoverTip('img', line)
            return true
        },
        hover: img => openHoverTip('img', img),
        translator: item => {
            const src = item.getAttribute('src')
            const width = item.style.width
            removeAllAttributes(item)
            item.setAttribute('src', src)
            item.style.width = width || '30%'
            return item
        }
    },
    code: {
        state: BEHAVIOR_STATE_TEXT_AREA,
        exp: 'pre',
        render: () => codeHtml,
        onclick: behaviorHighlight,
        builder: () => {
            const pre = createElement('pre', {
                spellcheck: false
            })
            const code = createElement('code')
            code.innerHTML = '\n'
            pre.append(code)
            return pre
        },
        hover: pre => {
            const code = pre.firstChild
            const classList = pre.classList
            if (!classList.contains(ACTIVE_FLAG)) {
                const offlineData = editorRange.serialization(prevLeafNode(pre))
                // noinspection SillyAssignmentJS
                code.textContent = code.textContent
                KRange.deserialized(offlineData).active()
                pre.classList.add(ACTIVE_FLAG)
                openHoverTip('code', pre)
            }
        },
        translator: async item => {
            const result = behaviors.code.builder()
            item.querySelectorAll('br').forEach(it => it.outerHTML = '\n')
            await highlightCode(null, result)
            return result
        }
    }
}

/**
 * 触发指定按钮的 click 事件
 * @param key {string|ButtonBehavior}
 * @param range {KRange?} 选区，留空使用 editorRange
 * @param force {boolean?} 是否强制直接访问 onclick 而不模拟点击
 * @return {boolean|void|undefined}
 */
export function clickButton(key, range, force) {
    const behavior = typeof key === 'string' ?  behaviors[key] : key
    console.assert(!!behavior, 'key 值不存在：' + key)
    const noStatus = isNoStatus(behavior)
    if (!force && noStatus) {
        behavior.button.click()
    } else {
        if (!noStatus) {
            behavior.button.classList.toggle(ACTIVE_FLAG)
            markStatusCacheInvalid()
        }
        return behavior.onclick(range ?? editorRange, behavior.button)
    }
}

/**
 * 执行一次通用修改指令
 * @param key {string} 样式对象的 key
 * @param range {KRange} 使用的 Range
 * @param removed {boolean} 是否已经移除过元素
 * @param conflicts {string[]?} 相互冲突的样式的 ID
 * @param type {0|1|2} 任务模式，0-默认，1-强制添加，2-仅删除
 */
function execCommonCommand(
    key, range, removed = false, conflicts, type = 0
) {
    if (range.collapsed) return true
    const offlineData = range === editorRange ? range.serialization() : null
    const behavior = behaviors[key]
    let rangeArray = range.splitRangeByLine()
    const topArray = rangeArray.map(it => findParentTag(it.realStartContainer(),TOP_LIST))
    const topCpyArray = topArray.map(it => it.cloneNode(true))
    const lastIndex = rangeArray.length - 1
    if (!removed) {
        if (conflicts)
            rangeArray.forEach(it => removeStylesInRange(it, ...conflicts.map(it => behaviors[it])))
        removed = removeStylesInRange(rangeArray[0], behavior) || removed
        if (rangeArray.length > 1) {
            for (let i = 1; i < lastIndex; ++i) {
                removed = removeStylesInRange(rangeArray[i], behavior) || removed
            }
            removed = removeStylesInRange(rangeArray[lastIndex], behavior) || removed
        }
    }
    if (type !== 2 && (removed || type === 1))
        setStyleInRange(key, rangeArray, behavior)
    topArray.forEach(zipTree)
    for (let i = 0; i < topCpyArray.length; i++) {
        GLOBAL_HISTORY.modifyNode(topCpyArray[i], topArray[i])
    }
    if (offlineData) {
        range.deserialized(offlineData).active()
    }
}

/**
 * 为指定区域内的文本设置样式
 * @param key {string} 样式的 key
 * @param ranges {KRange|KRange[]} 选择的区域，如果为数组区域必须连续
 * @param behavior {ButtonBehavior} 按钮对象
 * @return {KRange[]} 设置后的选择范围
 */
function setStyleInRange(key, ranges, behavior) {
    const rangeArray = Array.isArray(ranges) ? ranges : ranges.splitRangeByLine()
    for (let i = 0; i < rangeArray.length; i++) {
        const element = behavior.builder(behaviors[key].button)
        rangeArray[i].surroundContents(element)
        rangeArray[i].selectNode(element)
    }
    return rangeArray
}

/**
 * 删除选择范围内的指定样式
 * @param range {KRange} 选择范围
 * @param behaviors {ButtonBehavior} 要删除的标签名
 * @return {boolean} 是否存在元素没有修改
 */
function removeStylesInRange(range, ...behaviors) {
    const offlineData = range.serialization()
    /** @param it {HTMLElement} */
    const checker = it => behaviors.some(behavior => it.matches(behavior.exp))
    const tmpBox = createElement('div', ['tmp'])
    range.surroundContents(tmpBox)
    range.deserialized(offlineData)
    const boxTop = findParentTag(tmpBox, checker)
    if (boxTop) {
        const list = range.splitNode(boxTop)
        removeNodeReserveChild(list[1])
    } else {
        tmpBox.querySelectorAll(
            behaviors.map(it => it.exp).join(',')
        ).forEach(removeNodeReserveChild)
    }
    Array.from(KRICH_EDITOR.getElementsByClassName('tmp'))
        .forEach(removeNodeReserveChild)
    range.deserialized(offlineData)
    return !boxTop
}

/**
 * 将一个元素从 DOM 中移除，但保留其所有子元素
 * @param node {Node} 要删除的元素
 */
function removeNodeReserveChild(node) {
    node.replaceWith(...node.childNodes)
}

/**
 * 颜色选择器点击事件
 * @param range {KRange} 选择范围
 * @param btn {HTMLInputElement} 按钮对象
 * @param key {string} 样式名称
 * @return {boolean}
 */
function colorOnclick(range, btn, key) {
    const isDef = readSelectedColor(btn) === btn.getAttribute(SELECT_VALUE)
    return execCommonCommand(key, range, false, null, isDef ? 2 : 1)
}

/**
 * 转换指定列表
 * @param item {Element}
 */
function translateList(item) {
    removeAllAttributes(item)
    item.setAttribute(HASH_NAME, createHash())
    for (let value of Array.from(item.children)) {
        if (isListLine(value))
            removeAllAttributes(value)
        else
            value.remove()
    }
    return item
}