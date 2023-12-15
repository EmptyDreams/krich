/*
    本文件用于放置与操作编辑器工具栏按钮相关的 util 函数
*/

import {behaviors, BUTTON_STATUS, DATA_ID, SELECT_VALUE} from '../global-fileds'
import {getElementBehavior} from './tools'

/**
 * 比较按钮和标签的状态是否相同
 * @param button {HTMLElement} 按钮对象
 * @param element {HTMLElement} 标签对象
 * @return {boolean}
 */
export function compareBtnStatusWith(button, element) {
    const {verify} = getElementBehavior(element)
    if (verify) {
        if (!verify(button, element))
            return false
    }
    return true
}

/**
 * 判断一个节点持有的样式和按钮列表的样式是否相同
 * @param buttonContainer {HTMLElement} 按钮的父级控件
 * @param node {Node} 节点
 * @return {null|HTMLElement[]} 返回按钮和节点状态不一致的按钮列表
 */
export function compareBtnListStatusWith(buttonContainer, node) {
    const record = new Set()
    let element = node.parentElement
    let dataId = element.getAttribute(DATA_ID)
    const result = []
    while (dataId) {
        record.add(dataId)
        if (!getElementBehavior(element).noStatus) {
            const button = buttonContainer.querySelector(`&>*[${DATA_ID}=${dataId}]`)
            if (!compareBtnStatusWith(button, element))
                result.push(button)
        }
        element = element.parentElement
        dataId = element?.getAttribute(DATA_ID)
    }
    for (let child of buttonContainer.children) {
        const id = child.getAttribute(DATA_ID)
        if (BUTTON_STATUS[id] && !record.has(id) && !behaviors[id].noStatus) result.push(child)
    }
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
        const key = button.getAttribute(DATA_ID)
        if (setter) {
            setter(button, element)
        } else if (button.classList.contains('select')) {
            const value = element?.getAttribute(SELECT_VALUE) ?? '0'
            button.setAttribute(SELECT_VALUE, value)
            const item = button.querySelector(`.item[${SELECT_VALUE}="${value}"]`)
            button.getElementsByClassName('value')[0].innerHTML = item.innerHTML
            BUTTON_STATUS[key] = value
        } else if (element) {
            button.classList.add('active')
            BUTTON_STATUS[key] = true
        } else {
            button.classList.remove('active')
            delete BUTTON_STATUS[key]
        }
    }
    let element = node.parentElement
    let dataId = element.getAttribute(DATA_ID)
    const record = new Set()
    while (dataId) {
        record.add(dataId)
        const button = buttonContainer.querySelector(`&>*[${DATA_ID}=${dataId}]`)
        if (!compareBtnStatusWith(button, element)) {
            syncHelper(button, element)
        }
        element = element.parentElement
        dataId = element?.getAttribute(DATA_ID)
    }
    for (let button of buttonContainer.children) {
        if (!record.has(button.getAttribute(DATA_ID))) {
            syncHelper(button, null)
        }
    }
}