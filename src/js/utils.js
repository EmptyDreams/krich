import {DATA_ID, behaviors, DATA_HASH, BUTTON_STATUS, KRICH_CONTAINER, SELECT_VALUE} from './global-fileds'

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
 * @param checker {string[]|function(HTMLElement|Node):boolean} 标签名称
 */
export function findParentTag(node, checker) {
    if (Array.isArray(checker)) {
        const array = checker
        checker = it => array.includes(it.nodeName)
    }
    if (checker(node)) return node
    let item = node.parentElement
    while (!item.classList.contains('krich-editor')) {
        if (checker(item)) return item
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
 * @param node {Node} 起始节点
 * @param limit {(HTMLElement|Node)?} 父节点约束
 * @param varName {string} 变量名
 * @param fun {function(Node):Node} 终止函数
 * @return {Node|null}
 */
function getSiblingText(node, limit, varName, fun) {
    if (node === limit) return null
    let dist = node
    while (true) {
        const sibling = dist[varName]
        if (sibling) {
            dist = sibling
            break
        }
        dist = dist.parentNode
        if (!dist || dist === limit) return null
    }
    return fun(dist)
}

/**
 * 查找最邻近的下一个文本节点
 * @param node {Node} 起始节点
 * @param limit {(HTMLElement|Node)?} 父节点约束，查询范围不会超过该节点的范围
 * @return {Node|null}
 */
export function nextSiblingText(node, limit) {
    return getSiblingText(node, limit, 'nextSibling', getFirstTextNode)
}

/**
 * 查找最邻近的上一个文本节点
 * @param node {Node} 起始节点
 * @param limit {(HTMLElement|Node)?} 父节点约束，查询范围不会超过该节点的范围
 * @return {Node|null}
 */
export function prevSiblingText(node, limit) {
    return getSiblingText(node, limit, 'previousSibling', getLastTextNode)
}

/**
 * 通过指定节点切割父级标签
 * @param element {HTMLElement|Node} 父级标签
 * @param startContainer {Node} 起始节点
 * @param startOffset {number} 切割位置在起始节点中的下标
 * @param endContainer {Node?} 终止节点
 * @param endOffset {number?} 切割位置在终止节点中的下标
 * @return {{
 *     list: (HTMLElement|Node)[],
 *     index: 0|1
 * }} list 是切分后的结果序列，index 表示选中的是哪部分
 */
export function splitElementByContainer(
    element,
    startContainer, startOffset, endContainer, endOffset
) {
    let index = 1
    const buildResult = list => ({index, list})
    const breaker = it => it === element
    if (startOffset === 0) {
        const prev = prevSiblingText(startContainer, element)
        if (prev) {
            startContainer = prev
            startOffset = prev.textContent.length
        } else {
            startContainer = endContainer
            startOffset = endOffset
            endContainer = null
            index = 0
        }
    }
    /**
     * 从终点开始向前复制
     * @param node {Node} 最右侧的节点
     * @param offset {number} 切割位点
     * @return {HTMLElement}
     */
    const cloneFromEnd = (node, offset) => {
        const textContent = node.textContent
        const firstNode = cloneDomTree(node, textContent.substring(0, offset), breaker)[0]
        node.textContent = textContent.substring(offset)
        if (element.nodeType === Node.TEXT_NODE)
            return firstNode
        const container = element.cloneNode(false)
        container.append(firstNode)
        let item = prevSiblingText(node, element)
        while (item?.textContent) {
            container.insertBefore(cloneDomTree(item, item.textContent, breaker)[0], container.firstChild)
            item.textContent = ''
            item = prevSiblingText(item, element)
        }
        return container
    }
    const left = cloneFromEnd(startContainer, startOffset)
    element.parentNode.insertBefore(left, element)
    if (endContainer && endOffset === 0) {
        endContainer = prevSiblingText(endContainer, element)
        endOffset = endContainer.textContent.length
    }
    if (!endContainer) return buildResult([left, element])
    const next = nextSiblingText(endContainer, element)
    if (!next && endOffset === endContainer.textContent.length) return buildResult([left, element])
    const mid = cloneFromEnd(endContainer, endOffset)
    element.parentNode.insertBefore(mid, element)
    return buildResult([left, mid, element])
}

/**
 * 比较按钮和标签的状态是否相同
 * @param button {HTMLElement} 按钮对象
 * @param element {HTMLElement} 标签对象
 * @return {boolean}
 */
export function compareBtnStatusWith(button, element) {
    const {verify, hash} = getElementBehavior(element)
    /**
     * @param button {HTMLElement}
     * @param element {HTMLElement}
     */
    const defComparator = (button, element) => {
        const buttonHash = hash?.(button)
        const elementHash = element.getAttribute(DATA_HASH)
        return buttonHash === elementHash
    }
    if (verify) {
        if (!verify(button, element))
            return false
    } else if (!defComparator(button, element)) {
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

/**
 * 复制 DOM 树
 * @param node {Node} #text 节点
 * @param text {string} 文本节点的内容
 * @param breaker {function(Node):boolean} 断路器，判断是否终止复制
 * @return {[Text|HTMLElement, Text]} 克隆出来的文本节点
 */
export function cloneDomTree(node, text, breaker) {
    const textNode = document.createTextNode(text)
    if (breaker(node)) return [textNode, textNode]
    /** @type {Text|HTMLElement} */
    let tree = textNode
    let pos = node
    node = node.parentElement
    while (!breaker(node)) {
        const item = node.cloneNode(false)
        item.appendChild(tree)
        tree = item
        pos = node
        node = node.parentElement
    }
    return [tree, textNode]
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
 * 压缩 DOM 树结构
 * @param container {HTMLElement}
 */
export function zipTree(container) {
    console.assert(!container.classList.contains('krich-editor'), '不能直接对编辑器 content 进行压缩')
    /** 移除为空的节点 */
    const removeEmptyNode = () => {
        let item = getFirstTextNode(container)
        while (item) {
            const nextText = nextSiblingText(item, container)
            if (item.nodeName !== 'BR') {
                if (!item.textContent) {
                    let parent = item.parentElement
                    item.remove()
                    while (parent.childNodes.length === 0) {
                        const next = parent.parentElement
                        parent.remove()
                        parent = next
                    }
                }
            }
            item = nextText
        }
    }
    /**
     * 合并相邻且相同的节点
     * @param firstNode {Node}
     */
    const mergeEqualsNode = firstNode => {
        let item = firstNode
        let sibling = item.nextSibling
        while (sibling) {
            const nextSibling = sibling.nextSibling
            if (item.nodeName === sibling.nodeName) {   // 判断两个节点是同一种节点
                if (item.nodeType === Node.TEXT_NODE) { // 判断是否是文本节点
                    item.textContent += sibling.textContent
                } else {
                    // 能够到这里说明这两个节点都是 HTMLElement
                    // noinspection JSCheckFunctionSignatures
                    if (equalsKrichNode(item, sibling)) {
                        while (sibling.firstChild)
                            item.appendChild(sibling.firstChild)
                    }
                }
                sibling.remove()
            } else {
                item = sibling
            }
            sibling = nextSibling
        }
    }
    /**
     * 递归合并
     * @param parent {HTMLElement}
     */
    const recursionMerge = parent => {
        mergeEqualsNode(parent.firstChild)
        for (let child of parent.children) {
            recursionMerge(child)
        }
    }
    removeEmptyNode()
    recursionMerge(container)
}