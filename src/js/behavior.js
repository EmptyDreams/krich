/** @type {string} */
import headerSelectStyle from '../resources/html/tools/headerSelect.html'
/** @type {string} */
import blockquoteStyle from '../resources/html/tools/blockquote.html'
/** @type {string} */
import boldStyle from '../resources/html/tools/bold.html'
/** @type {string} */
import underlineStyle from '../resources/html/tools/underline.html'
/** @type {string} */
import italicStyle from '../resources/html/tools/italic.html'
/** @type {string} */
import throughStyle from '../resources/html/tools/through.html'
/** @type {string} */
import inlineCodeStyle from '../resources/html/tools/inlineCode.html'
/** @type {string} */
import supStyle from '../resources/html/tools/sup.html'
/** @type {string} */
import subStyle from '../resources/html/tools/sub.html'
/** @type {string} */
import clearStyle from '../resources/html/tools/clear.html'
/** @type {string} */
import colorStyle from '../resources/html/tools/color.html'
/** @type {string} */
import backgroundStyle from '../resources/html/tools/background.html'
/** @type {string} */
import ulStyle from '../resources/html/tools/ul.html'
/** @type {string} */
import olStyle from '../resources/html/tools/ol.html'
/** @type {string} */
import todoStyle from '../resources/html/tools/todo.html'
/** @type {string} */
import hrStyle from '../resources/html/tools/hr.html'
import {
    behaviors,
    initBehaviors,
    KRICH_CONTAINER,
    KRICH_EDITOR,
    SELECT_VALUE,
    TITLE_LIST,
    TOP_LIST
} from './global-fileds'
import {behaviorHeader} from './behaviors/header'
import {KRange, setCursorPositionAfter} from './utils/range'
import {findParentTag, splitElementByContainer, zipTree} from './utils/dom'
import {createElement, isEmptyBodyElement, readSelectedColor} from './utils/tools'
import {handleTemplate} from './utils/template'
import {onclickMultiElementStructure} from './behaviors/multi-element-structure'
import {onclickHr} from './behaviors/hr'

/** 代办列表的 marker */
export const TODO_MARKER = createElement('input', {
    class: 'marker',
    type: 'checkbox'
})

initBehaviors({
    headerSelect: {
        exp: ['P', ...TITLE_LIST].join(','),
        noStatus: true,
        render: () => headerSelectStyle,
        onclick: behaviorHeader
    },
    blockquote: {
        multi: true,
        exp: 'blockquote',
        render: () => blockquoteStyle,
        onclick: range => onclickMultiElementStructure(range, 'blockquote'),
        verify: () => true,
        builder: () => createElement('blockquote')
    },
    bold: {
        exp: 'b',
        render: () => boldStyle,
        onclick: range => execCommonCommand('bold', range),
        builder: () => createElement('b')
    },
    underline: {
        exp: 'u',
        render: () => underlineStyle,
        onclick: range => execCommonCommand('underline', range),
        builder: () => createElement('u')
    },
    italic: {
        exp: 'i',
        render: () => italicStyle,
        onclick: range => execCommonCommand('italic', range),
        builder: () => createElement('i')
    },
    through: {
        exp: 'span.through',
        render: () => throughStyle,
        onclick: range => execCommonCommand('through', range, false),
        builder: () => createElement('span', ['through'])
    },
    inlineCode: {
        exp: 'code',
        render: () => inlineCodeStyle,
        onclick: range => execCommonCommand('inlineCode', range),
        builder: () => createElement('code')
    },
    sup: {
        exp: 'sup',
        render: () => supStyle,
        onclick: range => execCommonCommand('sup', range, false, ['sub']),
        builder: () => createElement('sup')
    },
    sub: {
        exp: 'sub',
        render: () => subStyle,
        onclick: range => execCommonCommand('sub', range, false, ['sup']),
        builder: () => createElement('sub')
    },
    color: {
        exp: 'span[style^="color:"]',
        render: () => handleTemplate(colorStyle),
        onclick: (range, btn) => colorOnclick(range, btn, 'color'),
        builder: btn => createElement('span', {style: 'color:' + readSelectedColor(btn)}),
        verify: (btn, item) => readSelectedColor(btn) === item.getAttribute('style').substring(6),
        setter: (btn, item) => {
            const value = item ? item.getAttribute('style').substring(6) : btn.getAttribute(SELECT_VALUE)
            btn.getElementsByClassName('value')[0].setAttribute('style', `background:${value}`)
        }
    },
    background: {
        exp: 'span[style^="background:"]',
        render: () => handleTemplate(backgroundStyle),
        onclick: (range, btn) => colorOnclick(range, btn, 'background'),
        builder: btn => createElement('span', {style: 'background:' + readSelectedColor(btn)}),
        verify: (btn, item) => readSelectedColor(btn) === item.getAttribute('style').substring(11),
        setter: (btn, item) => {
            const value = item ? item.getAttribute('style').substring(11) : btn.getAttribute(SELECT_VALUE)
            btn.getElementsByClassName('value')[0].setAttribute('style', `background:${value}`)
        }
    },
    clear: {
        noStatus: true,
        render: () => clearStyle,
        onclick: range => {
            if (range.collapsed) return
            const offlineData = range.serialization()
            const tmpBox = createElement('div', ['tmp'])
            for (let lineRange of range.splitLine()) {
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
        exp: 'hr',
        noStatus: true,
        render: () => hrStyle,
        onclick: onclickHr
    },
    ul: {
        multi: true,
        exp: 'ul',
        render: () => ulStyle,
        onclick: range => onclickMultiElementStructure(range, 'ul', 'li'),
        builder: () => createElement('ul')
    },
    ol: {
        multi: true,
        exp: 'ol',
        render: () => olStyle,
        onclick: range => onclickMultiElementStructure(range, 'ol', 'li'),
        builder: () => createElement('ol')
    },
    todo: {
        multi: true,
        exp: 'div.todo',
        render: () => todoStyle,
        onclick: range => onclickMultiElementStructure(range, 'todo', 'li', TODO_MARKER),
        builder: () => createElement('div', ['todo'])
    }
})

/**
 * 执行一次通用修改指令
 * @param key {string} 样式对象的 key
 * @param range {KRange} 使用的 Range
 * @param removed {boolean} 是否已经移除过元素
 * @param conflicts {string[]?} 相互冲突的样式的 ID
 * @param type {0|1|2} 任务模式，0-默认，1-强制添加，2-仅删除
 */
export function execCommonCommand(
    key, range, removed = false, conflicts, type = 0
) {
    if (range.collapsed) return true
    const behavior = behaviors[key]
    const selectionRange = KRange.activated()
    const isEquals = selectionRange.equals(range)
    let rangeArray = range.splitLine()
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
        rangeArray = setStyleInRange(key, rangeArray, behavior)
    let offline = isEquals ? KRange.join(rangeArray).serialization() : null
    const lastItem = rangeArray[lastIndex].endContainer
    for (let kRange of rangeArray) {
        zipTree(findParentTag(kRange.startContainer, TOP_LIST))
    }
    if (isEquals) {
        KRange.deserialized(offline).active()
    } else {
        setCursorPositionAfter(lastItem)
    }
}

/**
 * 为指定区域内的文本设置样式
 * @param key {string} 样式的 key
 * @param ranges {KRange|KRange[]} 选择的区域，如果为数组区域必须连续
 * @param behavior {ButtonBehavior} 按钮对象
 * @return {KRange[]} 设置后的选择范围
 */
export function setStyleInRange(key, ranges, behavior) {
    const rangeArray = Array.isArray(ranges) ? ranges : ranges.splitLine()
    for (let i = 0; i < rangeArray.length; i++) {
        const element = behavior.builder(KRICH_CONTAINER.querySelector(`*[data-id="${key}"]`))
        rangeArray[i].surroundContents(element)
        rangeArray[i] = KRange.selectNodeContents(element)
    }
    return rangeArray
}

/**
 * 删除选择范围内的指定样式
 * @param range {KRange} 选择范围
 * @param behaviors {ButtonBehavior} 要删除的标签名
 * @return {boolean} 是否存在元素没有修改
 */
export function removeStylesInRange(range, ...behaviors) {
    const offlineData = range.serialization()
    /** @param it {HTMLElement} */
    const checker = it => behaviors.some(behavior => it.matches(behavior.exp))
    const tmpBox = document.createElement('div')
    tmpBox.classList.add('tmp')
    range.surroundContents(tmpBox)
    range.deserialized(offlineData)
    const {startContainer, startOffset, endContainer, endOffset} = range
    const boxTop = findParentTag(tmpBox, checker)
    if (boxTop) {
        const {list, index} = splitElementByContainer(boxTop, startContainer, startOffset, endContainer, endOffset)
        removeNodeReserveChild(list[index])
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
    const parent = node.parentNode
    while (node.firstChild) {
        parent.insertBefore(node.firstChild, node)
    }
    node.remove()
}

/**
 * 颜色选择器点击事件
 * @param range {KRange} 选择范围
 * @param btn {HTMLElement} 按钮对象
 * @param key {string} 样式名称
 * @return {boolean}
 */
function colorOnclick(range, btn, key) {
    const isDef = readSelectedColor(btn) === btn.getAttribute(SELECT_VALUE)
    return execCommonCommand(key, range, false, null, isDef ? 2 : 1)
}