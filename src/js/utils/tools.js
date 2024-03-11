/*
    本文件用于放置一些通用的工具函数
 */

import {
    DATA_ID, KRICH_EC,
    KRICH_EDITOR,
    KRICH_TOOL_BAR, TITLE_LIST
} from '../vars/global-fileds'
import {behaviors} from '../behavior'
import {getFirstChildNode} from './dom'

/**
 * 构建一个新的元素
 * @param tagName {string & keyof HTMLElementTagNameMap} 标签名称
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
 * @param element {Node|Element}
 * @return {ButtonBehavior|undefined}
 */
export function getElementBehavior(element) {
    if (!element.classList) return
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
    return element && element.classList && !element.firstChild && !isBrNode(element)
}

/**
 * 判断指定节点是否是编辑区或编辑区容器
 * @param node {Element|Node}
 * @return {boolean}
 */
export function isKrichEditor(node) {
    return node === KRICH_EDITOR || node === KRICH_EC
}

/**
 * 判断指定节点是否是工具栏容器
 * @param node {Element|Node}
 * @return {boolean}
 */
export function isKrichToolBar(node) {
    return node === KRICH_TOOL_BAR
}

/**
 * 判断指定节点是否是文本节点
 * @param node {Node}
 * @return {boolean}
 */
export function isTextNode(node) {
    return node.nodeName === '#text' || isBrNode(node)
}

/**
 * 判断指定节点是否是 BR 节点
 * @param node {Node}
 * @return {boolean}
 */
export function isBrNode(node) {
    return node.nodeName === 'BR'
}

/**
 * 判断是否为空行
 * @param node {Node}
 * @return {boolean}
 */
export function isEmptyLine(node) {
    return ['P', ...TITLE_LIST].includes(node.nodeName) && (!node.firstChild || isBrNode(node.firstChild))
}

/**
 * 判断当前的 LI 标签是否为空行
 * @param node {Node|Element}
 * @return {boolean}
 */
export function isEmptyListLine(node) {
    console.assert(node.nodeName === 'LI', '调用 isEmptyListLine 时传入的 Node 应当为 LI 标签')
    const firstChild = node.firstChild
    const amount = node.childNodes.length
    return isBrNode(getFirstChildNode(node, true)) && (amount === 1 || (isMarkerNode(firstChild) && amount === 2))
}

/**
 * 判断指定节点是否是 marker
 * @param node {Node|Element}
 * @return {boolean | undefined}
 */
export function isMarkerNode(node) {
    return node.classList?.contains?.('marker')
}

/**
 * 判断指定节点是否是 `li`
 * @param node {Node}
 * @return {boolean}
 */
export function isListLine(node) {
    return node.nodeName === 'LI'
}

/** 判断是否是普通行 */
export function isCommonLine(node) {
    return node.nodeName === 'P'
}

let hashRecord = 0

/**
 * 创建一个 hash
 * @return {string}
 */
export function createHash() {
    return (++hashRecord).toString(16)
}

/**
 * 判断两个富文本节点是否相同（不判断节点内容）
 * @param arg0 {Node|Element}
 * @param arg1 {Node|Element}
 */
export function equalsKrichNode(arg0, arg1) {
    console.assert(!!arg0 && arg1, '参数不能为 null/undefined', arg0, arg1)
    if (arg0.nodeName !== arg1.nodeName) return false
    const {classList: classList0, attributes: attributes0} = arg0
    const {classList: classList1, attributes: attributes1} = arg1
    if (!classList0) return true
    return classList0.length === classList1.length &&
        attributes0.length === attributes1.length &&
        Array.from(classList0).every(it => classList1.contains(it)) &&
        Array.from(attributes0)
            .filter(it => it.name !== 'class')
            .every(it => it.value === arg1.getAttribute(it.name))
}

/**
 * 获取一个颜色选择器选择的结果
 * @param btn {HTMLElement} 按钮对象
 * @return {string} `#` 开头的 16 进制的 RGB 色码
 */
export function readSelectedColor(btn) {
    // noinspection JSUnresolvedReference
    return btn.lastChild.value
}

/**
 * 设置一个颜色选择器的值
 * @param btn {HTMLElement}
 * @param value {string} `#开头的` 16 进制的 RGB 色码
 */
export function setSelectedColor(btn, value) {
    btn.lastChild.value = value
}

/**
 * 移除一个节点上的所有属性
 * @param item {Element}
 */
export function removeAllAttributes(item) {
    while (item.hasAttributes()) {
        item.removeAttribute(item.attributes[0].name)
    }
    return item
}

/**
 * 延迟指定时间后执行
 * @param timeout {number}
 * @return {Promise<void>}
 */
export function waitTime(timeout) {
    return new Promise(resolve => setTimeout(resolve, timeout))
}