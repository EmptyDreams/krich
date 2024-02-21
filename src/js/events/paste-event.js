import {KRICH_EDITOR, TOP_LIST} from '../vars/global-fileds'
import {eachDomTree, findParentTag, insertAfterEnd, prevLeafNode, zipTree} from '../utils/dom'
import {
    createElement,
    getElementBehavior,
    isBrNode, isEmptyBodyElement, isEmptyLine, isKrichEditor,
    isTextNode
} from '../utils/tools'
import {KRange} from '../utils/range'
import {highlightCode} from '../utils/highlight'
import {editorRange} from './range-monitor'

export function registryPasteEvent() {
    /**
     * 将 body 中所有内容通过 translator 转义为标准格式
     * @param body {Element}
     */
    function translate(body) {
        /** @type {Node|Element} */
        let node = body.firstChild
        /** @type {Node|Element|0} */
        let next = node
        while (true) {
            if (next === 0) break
            if (next) node = next
            next = node.firstChild ?? eachDomTree(node, true, false, () => true, body) ?? 0
            if (node.nodeName === 'LI') continue
            let behavior = getElementBehavior(node)
            if (!behavior) {
                if (!isTextNode(node)) {
                    if (node.hasChildNodes())
                        node.replaceWith(...node.childNodes)
                    else node.remove()
                }
                continue
            }
            let root, leaf
            while (behavior) {
                const newNode = behavior.translator(node)
                if (newNode === node) break
                if (newNode.firstChild) {
                    next = eachDomTree(node, true, false, _ => true, body) ?? 0
                    node.replaceWith(newNode)
                    root = null
                    break
                }
                if (leaf) leaf.append(newNode)
                else root = newNode
                leaf = newNode
                behavior = getElementBehavior(node)
            }
            if (root) {
                node.parentNode.insertBefore(root, node)
                // noinspection JSUnusedAssignment
                leaf.append(...node.childNodes)
            }
        }
    }

    /**
     * 按行封装
     * @param body {Element}
     */
    function packLine(body) {
        const result = []
        let line
        const submitLine = () => {
            if (line) {
                result.push(line)
                line = null
            }
        }
        for (let child of body.childNodes) {
            if (TOP_LIST.includes(child.nodeName)) {
                submitLine()
                result.push(child)
            } else {
                if (isBrNode(child)) {
                    submitLine()
                } else {
                    if (!line) line = createElement('p')
                    line.append(child)
                }
            }
        }
        return result
    }

    const KEY_HTML = 'text/html'
    const KEY_TEXT = 'text/plain'
    const htmlParser = new DOMParser()
    KRICH_EDITOR.addEventListener('paste', event => {
        const clipboardData = event.clipboardData
        const types = clipboardData.types
        if (types.includes(KEY_HTML)) {
            event.preventDefault()
            const content = clipboardData.getData(KEY_HTML)
                .replaceAll('\r', '')
                .replaceAll('\n', '<br>')
            const targetBody = htmlParser.parseFromString(content, KEY_HTML).querySelector('body')
            translate(targetBody)
            const lines = packLine(targetBody)
            for (let line of lines) {
                zipTree(line)
            }
            const range = KRange.activated()
            let realStart, tmpBox
            if (!range.collapsed) {
                tmpBox = createElement('div', ['tmp'])
                range.surroundContents(tmpBox)
                realStart = prevLeafNode(tmpBox) ?? tmpBox.parentNode
                tmpBox.remove()
            }
            if (!realStart) realStart = range.realStartContainer()
            if (isEmptyLine(realStart)) {
                realStart.replaceWith(...lines)
            } else if (isEmptyBodyElement(realStart)) {
                insertAfterEnd(realStart, ...lines)
            } else if (isBrNode(realStart)) {
                realStart.parentElement.replaceWith(...lines)
            } else {
                insertAfterEnd(findParentTag(realStart, TOP_LIST), ...lines)
            }
            lines.forEach(it => {
                if (it.nodeName === 'PRE') {
                    // noinspection JSIgnoredPromiseFromCall
                    highlightCode(KRange.activated(), it)
                } else {
                    it.querySelectorAll('pre')
                        .forEach(value => highlightCode(KRange.activated(), value))
                }
            })
        } else if (types.includes(KEY_TEXT)) {
            // empty body
        } else {
            event.preventDefault()
        }
    })
    KRICH_EDITOR.addEventListener('drop', event => {
        const body = editorRange?.body
        if (body) {
            event.preventDefault()
            const target = event.target
            if (isKrichEditor(target)) {
                target.append(body)
            } else {
                findParentTag(target, TOP_LIST).insertAdjacentElement('afterend', body)
            }
            new KRange(body).active()
        }
    })
}