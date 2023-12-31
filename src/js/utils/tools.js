/*
    本文件用于放置一些通用的工具函数
 */

import {behaviors, DATA_ID} from '../global-fileds'

/**
 * 构建一个新的元素
 * @param tagName {string} 标签名称
 * @param classNames {string} 想要添加的类名
 */
export function createElement(tagName, ...classNames) {
    const element = document.createElement(tagName)
    element.className = classNames.join(' ')
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
    if (arg0.className !== arg1.className || arg0.attributes) return false
    const h0 = getElementBehavior(arg0)
    const h1 = getElementBehavior(arg1)
    return h0 === h1
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