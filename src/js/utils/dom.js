/*
    本文件用于放置与操作 DOM 有关的 util 函数
 */

import {
    createNewLine,
    equalsKrichNode,
    isBrNode, isCommonLine, isEmptyBodyElement,
    isKrichEditor,
    isKrichToolBar, isListLine,
    isMarkerNode,
    isTextNode
} from './tools'
import {
    attributesWhiteList,
    EMPTY_BODY_ACTIVE_FLAG,
    HASH_NAME,
    inputImageList,
    KRICH_EDITOR,
    TOP_LIST
} from '../vars/global-fileds'
import {TODO_MARKER} from '../vars/global-tag'
import {isMultiEleStruct, isTextArea} from '../types/button-behavior'
import {behaviors} from '../behavior'
import {KRange, setCursorAt, setCursorPositionAfter} from './range'
import {imageMapper} from '../vars/global-exports-funtions'
import {handlePaste, TRANSFER_KEY_HTML} from '../events/paste-event'

/**
 * 从起点开始遍历 DOM 树
 * @param start {Node} 起点
 * @param forward {boolean} 是否正向遍历
 * @param first {boolean} 首个元素是否触发 consumer
 * @param consumer {function(Node|Element): any} 返回 true 或其它为 true 的值结束遍历
 * @param limit {Node|Element?} 遍历范围限制，留空表示 KRICH_EDITOR
 * @param includeMarker {boolean?} 是否遍历 marker
 * @return {any} consumer 的返回值将会从此返回，若 consumer 返回了 true 则返回 consumer 最后一次传入的节点对象
 */
export function eachDomTree(start, forward, first, consumer, limit, includeMarker) {
    function calcResult(node, value) {
        return value === true ? node : value
    }
    /**
     * 深度优先遍历
     * @param item {Element|Node}
     * @return {any} 为 true 时中断
     */
    function dfs(item) {
        if (!includeMarker && isMarkerNode(item)) return
        let result
        const childNodes = Array.from(item.childNodes ?? [])
        if (forward) {
            result = consumer(item)
            if (result) return calcResult(item, result)
        }
        if (!forward) childNodes.reverse()
        for (let item of childNodes) {
            result = dfs(item)
            if (result) return result
        }
        if (!forward) {
            result = consumer(item)
            if (result) return calcResult(item, result)
        }
    }
    const parentNode = start.parentNode
    const isTail = !parentNode || (start === (limit ?? KRICH_EDITOR))
    const childNodes = isTail ? [start] : Array.from(start.parentNode.childNodes)
    if (forward) childNodes.reverse()
    const index = childNodes.indexOf(start)
    for (let i = index; i >= 0; --i) {
        if (!first) {
            first = true
        } else {
            const result = dfs(childNodes[i])
            if (result) return result
        }
    }
    return isTail ? null : eachDomTree(parentNode, forward, false, consumer, limit, includeMarker)
}

/**
 * 获取最邻近的下一个叶子节点
 * @param node {Node}
 * @param includeMarker {boolean?} 是否包含 marker
 * @param limit {Node|Element?} 遍历范围限制
 * @return {Node|null}
 */
export function nextLeafNode(node, includeMarker, limit) {
    return eachDomTree(node, true, false, it => !it.firstChild, limit, includeMarker)
}

/**
 * 获取最邻近的上一个叶子节点
 * @param node {Node}
 * @param includeMarker {boolean?} 是否包含 marker
 * @param limit {Node|Element?} 遍历范围限制
 * @return {Node|undefined}
 */
export function prevLeafNode(node, includeMarker, limit) {
    return eachDomTree(node, false, false, it => !it.firstChild, limit, includeMarker)
}

/**
 * 获取指定节点的第一个文本子节点
 * @param node {Node} 指定节点
 * @param limit {Node?} 搜索区域限制，留空为 [node]
 * @return {Node}
 */
export function getFirstTextNode(node, limit) {
    const item = getFirstChildNode(node)
    return isTextNode(item) ? item : nextSiblingText(item, limit ?? node)
}

/**
 * 获取指定节点的最后一个文本子结点
 * @param node {Node} 指定节点
 * @param limit {Node?} 搜索区域限制，留空为 [node]
 * @return {Node}
 */
export function getLastTextNode(node, limit) {
    const item = getLastChildNode(node)
    return isTextNode(item) ? item : prevSiblingText(item, limit ?? node)
}

/**
 * 获取节点的第一个（间接）子节点，没有子节点返回其本身
 * @param node {Node}
 * @param skipMarker {boolean?} 是否跳过 marker
 * @return {Node}
 */
export function getFirstChildNode(node, skipMarker) {
    let result = getSideNode(node, 'firstChild')
    if (skipMarker && isMarkerNode(result)) result = nextLeafNode(result)
    return result
}

/**
 * 获取节点的最后一个（间接）子节点，没有子节点返回其本身
 * @param node {Node}
 * @return {Node}
 */
export function getLastChildNode(node) {
    return getSideNode(node, 'lastChild')
}

/**
 * 获取一个节点的端点
 * @param node {Node}
 * @param varName {'firstChild'|'lastChild'}
 * @return {Node}
 */
function getSideNode(node, varName) {
    let item = node
    while (item[varName]) {
        item = item[varName]
    }
    return item
}

/**
 * 查找距离当前节点最近的满足指定要求的节点
 * @param node {Node} 指定的节点
 * @param checker {string[]|function(HTMLElement|Node):boolean} 标签名称或判断表达式
 * @return {Element|undefined}
 */
export function findParentTag(node, checker) {
    if (Array.isArray(checker)) {
        const array = checker
        checker = it => array.includes(it.nodeName)
    }
    /** @type {Node|Element} */
    let item = node
    while (!isKrichEditor(item) && !isKrichToolBar(item)) {
        if (checker(item)) return item
        item = item.parentElement
    }
}

/**
 * 设置指定标签的 `contenteditable` 值
 * @param element {Element}
 * @param value {boolean}
 */
export function modifyContenteditableStatus(element, value) {
    // noinspection JSCheckFunctionSignatures
    element.setAttribute('contenteditable', value)
}

/**
 * 尝试修复 DOM 中的结构错误
 * @param keepRange {boolean?} 是否在修复可能会修改指针位置时保持当前指针位置
 */
export function tryFixDom(keepRange) {
    // 删除没有内容的列表行
    KRICH_EDITOR.querySelectorAll('li')
        .forEach(it => {
            const lastChild = it.lastChild
            if (!lastChild || isMarkerNode(lastChild)) {
                const parent = it.parentNode
                if (parent.childElementCount < 2) {
                    parent.remove()
                } else {
                    it.remove()
                }
            }
        })
    // 自动将没有内容的 code 添加换行符
    for (let pre of KRICH_EDITOR.getElementsByTagName('pre')) {
        const code = pre.firstChild
        console.assert(code === pre.lastChild, 'pre 应当有且仅有一个子节点')
        if (code) {
            const firstChild = code.firstChild
            if (!firstChild || (firstChild === code.lastChild && isBrNode(firstChild)))
                code.textContent = '\n'
        } else {
            pre.innerHTML = '<code>\n</code>'
        }
    }
    // 自动为没有多选框的代办列表的 li 添加多选框
    Array.from(KRICH_EDITOR.querySelectorAll(`${behaviors.todo.exp}>li`))
        .filter(it => !it.firstElementChild?.classList?.contains?.('marker'))
        .forEach(it => it.prepend(TODO_MARKER.cloneNode(false)))
    // 将不在不是唯一子节点的 <br> 替换为空行
    Array.from(KRICH_EDITOR.getElementsByTagName('br'))
        .filter(it => !findParentTag(it, isTextArea) && (it.previousSibling || it.nextSibling))
        .forEach(it => it.replaceWith(createNewLine()))
    // 为超链接前后添加空格
    const linkList = KRICH_EDITOR.getElementsByTagName('a')
    if (linkList.length) {
        let offlineData
        if (keepRange)
            offlineData = KRange.activated().serialization()
        for (let item of linkList) {
            insertSpaceBetweenNode(item, false)
        }
        if (offlineData)
            KRange.deserialized(offlineData).active()
    }
}

/**
 * 在指定节点两侧添加空格（若其两侧是文本节点的话，后方没有节点时会创建一个 text 节点）
 * @param node {Node} 要被空格包裹的节点
 * @param focus {boolean} 是否聚焦到插入的最后一个空格后方
 */
export function insertSpaceBetweenNode(node, focus) {
    const line = findParentTag(node, TOP_LIST)
    const prev = prevLeafNode(node, true, line)
    const next = nextLeafNode(node, true, line)
    if (prev && isTextNode(prev) && !prev.textContent.endsWith(' ')) {
        prev.textContent += ' '
    }
    if (next) {
        console.assert(isTextNode(next), 'next 应当为文本节点')
        const content = next.textContent
        if (!content.startsWith(' ')) {
            next.textContent = ' ' + content
        }
        if (focus)
            setCursorAt(next, 1)
    } else {
        node.after(' ')
        if (focus)
            setCursorPositionAfter(node.nextSibling)
    }
}

/**
 * 移除指定标签及其子节点中所有的运行时标记
 * @param root {Element}
 */
export function removeRuntimeFlag(root) {
    // 移除需要移除的类名
    const removedClassName = [EMPTY_BODY_ACTIVE_FLAG]
    for (let name of removedClassName) {
        for (let item of root.getElementsByClassName(name)) {
            item.classList.remove(name)
        }
    }
    // 类名为空时移除 class 属性
    root.querySelectorAll('*[class=""]').forEach(it => {
        it.removeAttribute('class')
    })
    // 移除需要移除的属性
    eachDomTree(root, true, true, item => {
        const attributes = item.attributes
        if (attributes) {
            for (let attr of Array.from(attributes)) {
                if (!attributesWhiteList.includes(attr.name))
                    item.removeAttribute(attr.name)
            }
        }
    })
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
 * 查找最邻近的下一个文本节点
 * @param node {Node} 起始节点
 * @param limit {(HTMLElement|Node)?} 父节点约束，查询范围不会超过该节点的范围
 * @return {Node|null}
 */
export function nextSiblingText(node, limit) {
    return eachDomTree(node, true, false, isTextNode, limit)
}

/**
 * 查找最邻近的上一个文本节点
 * @param node {Node} 起始节点
 * @param limit {(HTMLElement|Node)?} 父节点约束，查询范围不会超过该节点的范围
 * @return {Node|null}
 */
export function prevSiblingText(node, limit) {
    return eachDomTree(node, false, false, isTextNode, limit)
}

/**
 * 计算一个 {@link DOMRect} 相对于另一个 {@link DOMRect} 的偏移量
 * @param target {DOMRect} 当前 rect
 * @param ref {DOMRect} 参考系
 * @return {{
 *     t: number,
 *     l: number,
 *     r: number,
 *     b: number
 * }}
 */
export function calcDomRectDif(target, ref) {
    return {
        t: target.y - ref.y,
        l: target.x - ref.x,
        r: target.right - ref.x,
        b: target.bottom - ref.y
    }
}

/**
 * 获取某个节点相对于其某个父节点的坐标
 * @param target {Element}
 * @param parent {Element|Node}
 * @return {{
 *     t: number,
 *     l: number,
 *     r: number,
 *     b: number
 * }}
 */
export function getRelCoords(target, parent) {
    const targetBox = target.getBoundingClientRect()
    const parentBox = parent.getBoundingClientRect()
    return calcDomRectDif(targetBox, parentBox)
}

/**
 * 合并列表
 * @param top {Node|Element?} 上层标签
 * @param bottom {Node|Element?} 下层标签
 * @return {boolean|undefined} 是否进行了合并操作
 */
export function mergeSameElement(top, bottom) {
    if (!top || !bottom || !equalsKrichNode(top, bottom)) return
    const topLastChild = top.lastChild
    const bottomFirstChild = bottom.firstChild
    if (isListLine(top)) {
        const result = mergeSameElement(topLastChild, bottomFirstChild)
        if (result) bottom.remove()
        return result
    }
    if (isMultiEleStruct(top) &&
        top.getAttribute(HASH_NAME) === bottom.getAttribute(HASH_NAME)
    ) {
        mergeSameElement(topLastChild, bottomFirstChild)
        top.append(...bottom.childNodes)
        bottom.remove()
        return true
    }
    if (topLastChild) {
        mergeSameElement(topLastChild, bottomFirstChild)
        top.append(...bottom.childNodes)
    } else if (isTextNode(top)) {
        top.textContent += bottom.textContent
    }
    bottom.remove()
}

/**
 * 压缩 DOM 树结构
 * @param container {Element}
 */
export function zipTree(container) {
    if (isKrichEditor(container)) {
        for (let line of container.children) {
            zipTree(line)
        }
        return
    }
    /** 移除为空的节点 */
    const removeEmptyNode = () => {
        let item = getFirstTextNode(container)
        while (item) {
            const nextText = nextSiblingText(item, container)
            if (!isBrNode(item)) {
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
        let sibling = item?.nextSibling
        while (sibling) {
            const nextSibling = sibling.nextSibling
            // 不合并 p、li 标签、ebe 和不相同的节点
            if (!isCommonLine(item) && !isListLine(item) && !isEmptyBodyElement(item) && equalsKrichNode(item, sibling)) {
                if (isTextNode(item)) {
                    item.textContent += sibling.textContent
                } else {
                    while (sibling.firstChild)
                        item.appendChild(sibling.firstChild)
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

/**
 * 导出编辑器所有数据
 * @return {Promise<{
 *     html: Element,
 *     image?: ExportImageData
 * }>}
 */
export async function exportData() {
    /** @type {Element} */
    const root = KRICH_EDITOR.cloneNode(true)
    removeRuntimeFlag(root)
    const result = {
        html: root
    }
    if (imageMapper != null) {
        const urls = new Set()
        const imageList = result.image = {
            upload: new Map(),
            remove: new Set()
        }
        const {upload, remove} = imageList
        for (let img of root.getElementsByTagName('img')) {
            const src = img.getAttribute('src')
            if (src.startsWith('data:')) {
                const url = await imageMapper(src)
                upload.set(url, src)
                img.setAttribute('src', url)
            } else {
                urls.add(src)
            }
        }
        for (let item of inputImageList) {
            if (upload.has(item)) {
                upload.delete(item)
            } else if (!urls.has(item)) {
                remove.add(item)
            }
        }
    }
    return result
}

/**
 * 导入已有数据
 * @param html {string}
 * @return {Promise<void>}
 */
export async function importData(html) {
    console.assert(
        KRICH_EDITOR.childNodes.length === 1 && isCommonLine(KRICH_EDITOR.firstChild) && !KRICH_EDITOR.textContent,
        "导入数据时编辑器内容应当为空"
    )
    const range = new KRange()
    const transfer = new DataTransfer()
    range.selectNode(KRICH_EDITOR)
    transfer.setData(TRANSFER_KEY_HTML, html)
    await handlePaste(range, transfer, false)
    KRICH_EDITOR.querySelectorAll('img:not([src^="data:"])').forEach(image => {
        inputImageList.add(image.getAttribute('src'))
    })
}