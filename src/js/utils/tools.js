/*
    本文件用于放置一些通用的工具函数
 */

import {behaviors, DATA_HASH, DATA_ID, KRICH_CONTAINER} from '../global-fileds'

/**
 * 构建一个新的元素
 * @param key {string} behavior 中的 key 名
 * @param tagName {string} 标签名称
 * @param classNames {string} 想要添加的类名
 */
export function createElement(key, tagName, ...classNames) {
    console.assert(key in behaviors, `${key} 不存在`)
    const {hash, extra} = behaviors[key]
    const element = document.createElement(tagName)
    element.className = classNames.join(' ')
    element.setAttribute(DATA_ID, key)
    const button = KRICH_CONTAINER.querySelector(`.krich-tools>*[${DATA_ID}=${key}]`)
    if (hash) element.setAttribute(DATA_HASH, hash(button))
    if (extra) {
        const attributes = extra(button)
        for (let key in attributes) {
            element.setAttribute(key, attributes[key])
        }
    }
    return element
}

/** @param element {HTMLElement} */
export function getElementBehavior(element) {
    return behaviors[element.getAttribute(DATA_ID)]
}

/**
 * 判断两个富文本节点是否相同（不判断节点内容）
 * @param arg0 {HTMLElement}
 * @param arg1 {HTMLElement}
 */
export function equalsKrichNode(arg0, arg1) {
    console.assert(!!arg0 && arg1, '参数不能为 null/undefined', arg0, arg1)
    const h0 = getElementBehavior(arg0)
    const h1 = getElementBehavior(arg1)
    console.assert(!!h0 && h1, `两个节点有一个不包含 ${DATA_ID} 属性或属性值错误`, arg0, arg1)
    return h0 === h1 && h0.hash?.(arg0) === h1.hash?.(arg1)
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