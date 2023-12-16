/*
    本文件用于放置与操作编辑器工具栏按钮相关的 util 函数
*/

import {SELECT_VALUE} from '../global-fileds'
import {getElementBehavior} from './tools'

/**
 * 判断指定按钮是否激活
 * @param button {HTMLElement} 按钮对象
 * @return {boolean}
 */
export function isActive(button) {
    if (button.hasAttribute(SELECT_VALUE))
        return button.getAttribute(SELECT_VALUE) !== '0'
    return button.classList.contains('active')
}

/**
 * 比较按钮和标签的状态是否相同
 * @param element {HTMLElement} 标签对象
 * @return {boolean}
 */
export function compareBtnStatusWith(element) {
    const {verify, button} = getElementBehavior(element)
    return verify ? verify(button, element) : isActive(button)
}

/**
 * 判断一个节点持有的样式和按钮列表的样式是否相同
 * @param buttonContainer {HTMLElement} 按钮的父级控件
 * @param node {Node} 节点
 * @return {null|HTMLElement[]} 返回按钮和节点状态不一致的按钮列表
 */
export function compareBtnListStatusWith(buttonContainer, node) {
    const result = []
    findDiffButton(buttonContainer, node, (_, item) => result.push(item))
    return result.length === 0 ? null : result
}

/**
 * 同步按钮和指定节点的状态
 * @param buttonContainer {HTMLElement} 按钮的父级标签
 * @param node {Node} 文本节点
 */
export function syncButtonsStatus(buttonContainer, node) {
    const syncHelper = (button, element) => {
        const setter = element ? getElementBehavior(element).setter : null
        if (setter) {
            setter(button, element)
        } else if (button.classList.contains('select')) {
            const value = element?.getAttribute(SELECT_VALUE) ?? '0'
            button.setAttribute(SELECT_VALUE, value)
            const item = button.querySelector(`.item[${SELECT_VALUE}="${value}"]`)
            button.getElementsByClassName('value')[0].innerHTML = item.innerHTML
        } else if (element) {
            button.classList.add('active')
        } else {
            button.classList.remove('active')
        }
    }
    findDiffButton(buttonContainer, node, syncHelper)
}

/**
 * 查找与指定元素包含的样式不相同的所有按钮
 * @param buttonContainer {HTMLElement} 按钮列表的父级标签
 * @param node {Node} 文本节点对象
 * @param consumer {function(btn: HTMLElement, item: HTMLElement?)} 当查询到不同时触发的函数
 */
function findDiffButton(buttonContainer, node, consumer) {
    /** @type {Set<ButtonBehavior>} */
    const record = new Set()
    let item = node.parentElement
    while (item) {
        const behavior = getElementBehavior(item)
        if (!behavior) break
        record.add(behavior)
        if (!behavior.noStatus && !compareBtnStatusWith(item)) {
            consumer(behavior.button, item)
        }
        item = item.parentElement
    }
    for (let child of buttonContainer.children) {
        const behavior = getElementBehavior(child)
        const button = behavior.button
        if (!behavior.noStatus && !record.has(behavior) && isActive(button)) {
            consumer(button, null)
        }
    }
}