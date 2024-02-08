/*
    本文件用于放置与操作编辑器工具栏按钮相关的 util 函数
*/

import {behaviors, SELECT_VALUE} from '../vars/global-fileds'
import {getElementBehavior, isKrichEditor, readSelectedColor} from './tools'
import {isMultiEleStructBehavior, isNoStatusBehavior} from '../types/button-behavior'

/**
 * 判断指定按钮是否激活
 * @param button {HTMLElement} 按钮对象
 * @return {boolean}
 */
export function isActive(button) {
    const selectValue = button.getAttribute(SELECT_VALUE)
    if (button.classList.contains('color'))
        return readSelectedColor(button) !== selectValue
    if (selectValue)
        return selectValue !== '0'
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
 * @param node {Node} 节点
 * @return {null|HTMLElement[]} 返回按钮和节点状态不一致的按钮列表
 */
export function compareBtnListStatusWith(node) {
    const result = []
    findDiffButton(node, (btn) => result.push(btn))
    return result.length === 0 ? null : result
}

/**
 * 同步按钮和指定节点的状态
 * @param node {Node} 文本节点
 */
export function syncButtonsStatus(node) {
    const syncHelper = (button, element) => {
        const setter = element ? getElementBehavior(element).setter : null
        const buttonClassList = button.classList
        if (setter) {
            setter(button, element)
        } else if (buttonClassList.contains('select')) {
            const value = button.getElementsByClassName('value')[0]
            if (buttonClassList.contains('color')) {
                value.style.background = element?.getAttribute?.('style') ?? button.getAttribute(SELECT_VALUE)
            } else {
                const selectValue = element?.getAttribute(SELECT_VALUE) ?? '0'
                button.setAttribute(SELECT_VALUE, selectValue)
                const item = button.querySelector(`.item[${SELECT_VALUE}="${selectValue}"]`)
                value.innerHTML = item.innerHTML
            }
        } else if (element) {
            buttonClassList.add('active')
        } else {
            buttonClassList.remove('active')
        }
    }
    findDiffButton(node, syncHelper)
}

/**
 * 查找与指定元素包含的样式不相同的所有按钮
 * @param node {Node} 文本节点对象
 * @param consumer {function(btn: HTMLElement, item: HTMLElement?)} 当查询到不同时触发的函数
 */
function findDiffButton(node, consumer) {
    /** @type {Set<ButtonBehavior>} */
    const record = new Set()
    let item = node.parentElement
    let multiFlag
    while (!isKrichEditor(item)) {
        const behavior = getElementBehavior(item)
        if (behavior && !(isMultiEleStructBehavior(behavior) && multiFlag)) {
            if (isMultiEleStructBehavior(behavior)) multiFlag = true
            record.add(behavior)
            if (!isNoStatusBehavior(behavior) && !compareBtnStatusWith(item)) {
                consumer(behavior.button, item)
            }
        }
        item = item.parentElement
    }
    for (let key in behaviors) {
        const behavior = behaviors[key]
        const button = behavior.button
        if (!isNoStatusBehavior(behavior) && !record.has(behavior) && isActive(button)) {
            consumer(button, null)
        }
    }
}