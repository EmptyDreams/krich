import {DATA_ID, behaviors, TOP_LIST, DATA_HASH, BUTTON_STATUS, KRICH_CONTAINER} from './global-fileds'

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
    const button = KRICH_CONTAINER.querySelector(`.krich-tools>*[data-key=${key}]`)
    if (hash) element.setAttribute(DATA_HASH, hash(button))
    if (extra) {
        const attributes = extra(button)
        for (let key in attributes) {
            element.setAttribute(key, attributes[key])
        }
    }
    return element
}

/**
 * 获取指定节点的第一个文本子节点
 * @param node {Node}
 * @return {Node}
 */
export function getFirstTextNode(node) {
    while (!['#text', 'BR'].includes(node.nodeName)) {
        node = node.firstChild
    }
    return node
}

/**
 * 获取指定节点的最后一个文本子结点
 * @param node {Node}
 * @return {Node}
 */
export function getLastTextNode(node) {
    while (!['#text', 'BR'].includes(node.nodeName))
        node = node.lastChild
    return node
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
 * 判断指定节点是否被某个类型的标签包裹
 * @param node {Node} 指定的节点
 * @param names {string} 标签名称
 */
export function findParentTag(node, ...names) {
    console.assert(names && names.length !== 0, 'names 不应当为空')
    if (names.includes(node.nodeName)) return node
    let item = node.parentElement
    while (!item.classList.contains('krich-editor')) {
        if (names.includes(item.nodeName)) return item
        item = item.parentElement
    }
}

/**
 * 将指定的元素替换为指定元素，同时保留子元素
 * @param src {HTMLElement} 要被替换的元素
 * @param novel {HTMLElement} 新的元素
 */
export function replaceElement(src, novel) {
    novel.innerHTML = src.innerHTML
    src.replaceWith(novel)
}

/**
 * 判断指定节点是否是顶层节点
 * @param node {Node}
 * @return {boolean}
 */
export function isTopElement(node) {
    return TOP_LIST.includes(node.nodeName)
}

/**
 * 查找最邻近的文本节点
 * @param node {Node}
 */
export function nextSiblingText(node) {
    let dist = node
    while (true) {
        const next = dist.nextSibling
        if (next) {
            dist = next
            break
        }
        dist = dist.parentNode
        if (!dist) return null
    }
    return getFirstTextNode(dist)
}

/**
 * 判断一个节点持有的样式和按钮列表的样式是否相同
 * @param buttonContainer {HTMLElement} 按钮的父级控件
 * @param node {Node} 节点
 * @return {boolean} 返回按钮和节点状态是否一致
 */
export function compareWith(buttonContainer, node) {
    /**
     * @param behavior {ButtonBehavior}
     * @param button {HTMLElement}
     * @param element {HTMLElement}
     */
    const defComparator = (behavior, button, element) => {
        const buttonHash = behavior.hash?.(button)
        const elementHash = element.getAttribute(DATA_HASH)
        return buttonHash === elementHash
    }
    const record = new Set()
    let element = node.parentElement
    let dataId = element.getAttribute(DATA_ID)
    while (dataId) {
        record.add(dataId)
        const behavior = behaviors[dataId]
        const {verify, noStatus} = behavior
        if (noStatus) continue
        const button = buttonContainer.querySelector(`*[data-key=${dataId}]`)
        if (verify) {
            if (!verify(button, element))
                return false
        } else if (!defComparator(behavior, button, element)) {
            return false
        }
    }
    for (let child of buttonContainer.children) {
        const id = child.getAttribute('data-key')
        if (BUTTON_STATUS[id] && !record.has(id)) return false
    }
    return true
}