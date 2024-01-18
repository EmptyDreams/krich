/*
    本文件用于放置一些通用的工具函数
 */

import {behaviors, DATA_ID} from '../global-fileds'

/**
 * 构建一个新的元素
 * @param tagName {string} 标签名称
 * @param optional {(string[]|{[p:string]:string})?} 类名数组或属性键值对
 */
export function createElement(tagName, optional) {
    const element = document.createElement(tagName)
    if (Array.isArray(optional))
        element.className = optional.join(' ')
    if (optional) {
        for (let key in optional) {
            element.setAttribute(key, optional[key])
        }
    }
    return element
}

/**
 * @param element {HTMLElement}
 * @return {ButtonBehavior|undefined}
 */
export function getElementBehavior(element) {
    const dataId = element.getAttribute(DATA_ID)
    if (dataId)
        return behaviors[dataId]
    for (let key in behaviors) {
        const value = behaviors[key]
        if (element.matches(value.exp))
            return value
    }
}

/**
 * 判断两个富文本节点是否相同（不判断节点内容）
 * @param arg0 {HTMLElement}
 * @param arg1 {HTMLElement}
 */
export function equalsKrichNode(arg0, arg1) {
    console.assert(!!arg0 && arg1, '参数不能为 null/undefined', arg0, arg1)
    return arg0.nodeName === arg1.nodeName &&
        arg0.classList.length === arg1.classList.length &&
        arg0.attributes.length !== arg1.attributes.length &&
        Array.from(arg0.classList).every(it => arg1.classList.contains(it)) &&
        Array.from(arg0.attributes).every(it => it.value === arg1.getAttribute(it.name))
}

/**
 * 查找指定元素在 Collection 中的下标
 * @param children {HTMLCollection}
 * @param item {HTMLElement}
 * @return {number}
 */
export function findIndexInCollection(children, item) {
    for (let i = 0; i < children.length; i++) {
        if (children[i] === item) return i
    }
    return -1
}

/**
 * 查找指定字符在字符串指定区域中出现的次数
 * @param item {string} 指定字符
 * @param str {string} 字符串
 * @param startIndex {number} 起始下标（包含）
 * @param endIndex {number?} 终止下标（不包含，缺省查询到结尾）
 */
export function countChar(item, str, startIndex, endIndex) {
    console.assert(item.length === 1, '[item] 的长度应当等于 1', item)
    const end = endIndex ?? str.length
    let count = 0
    for (let i = startIndex; i < end; ++i) {
        if (str[i] === item) ++count
    }
    return count
}

/**
 * 将一个“#abc”“#abcdef”或“0,1,2”格式的字符串转化为十六进制形式，并尽可能减少字符串长度
 * @param src {string}
 * @return {string|null} 转换失败时返回 null
 */
export function parseRgbToHex(src) {
    if (!src.startsWith('#')) {
        const list = src.split(',')
        if (list.length !== 3) {
            return null
        } else {
            src = '#' + list.map(it => parseInt(it).toString(16).padStart(2, '#')).join('')
        }
    }
    if (!/^#([0-9a-f]{3}){1,2}$/.test(src)) return null
    if (/^#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3$/.test(src))
        src = '#' + src[1] + src[2] + src[4]
    return src
}

/**
 * 获取一个颜色选择器选择的结果
 * @param btn {HTMLElement} 按钮对象
 * @return {string} 16 进制的 RGB 色码
 */
export function readSelectedColor(btn) {
    return btn.getElementsByClassName('value')[0].style.background
}