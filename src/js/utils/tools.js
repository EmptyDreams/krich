/*
    本文件用于放置一些通用的工具函数
 */

import {behaviors, DATA_ID} from '../global-fileds'

/**
 * 构建一个新的元素
 * @param tagName {string} 标签名称
 * @param optional {(string[]|{[p:string]:(string|boolean)})?} 类名数组或属性键值对
 * @return {HTMLElement}
 */
export function createElement(tagName, optional) {
    const element = document.createElement(tagName)
    if (Array.isArray(optional)) {
        element.className = optional.join(' ')
    } else if (optional) {
        for (let key in optional) {
            element.setAttribute(key, optional[key])
        }
    }
    return element
}

/**
 * 构建一个新的空行
 * @return {HTMLElement}
 */
export function createNewLine() {
    const line = createElement('p')
    line.innerHTML = '<br>'
    return line
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
        if (value.exp && element.matches(value.exp))
            return value
    }
}

/**
 * 判断一个标签是否是不包含子元素的标签
 * @param element {HTMLElement|Node?}
 * @return {boolean}
 */
export function isEmptyBodyElement(element) {
    return element && element.classList && !element.firstChild && element.nodeName !== 'BR'
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
    return btn.getElementsByClassName('value')[0].getAttribute('style').substring(11)
}