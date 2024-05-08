import {editorRange, updateEditorRange} from './range-monitor'
import {
    GLOBAL_HISTORY,
    KRICH_EDITOR,
    markStatusCacheEffect,
    statusCheckCache, TOP_LIST
} from '../vars/global-fileds'
import {
    findParentTag, getFirstChildNode,
    getLastChildNode,
    nextLeafNodeInline,
    prevLeafNodeInline,
    tryFixDom
} from '../utils/dom'
import {KRange, setCursorPositionBefore} from '../utils/range'
import {compareBtnListStatusWith, isActive, setButtonStatus} from '../utils/btn'
import {getElementBehavior, isBrNode, isEmptyLine, isTextNode, waitTime} from '../utils/tools'
import {TODO_MARKER} from '../vars/global-tag'
import {behaviors, clickButton} from '../behavior'
import {isNoStatus, isTextArea} from '../types/button-behavior'
import {deleting} from './keyboard-event'

/** 是否正在处理输入的阶段 */
export let isInputtingStage

/** 输入更新历史记录的计时器 */
let inputTimeoutId
/**
 * 输入时的 lca
 * @type {Node}
 */
let inputLca
/**
 * 输入时的 lca 的拷贝
 * @type {Node}
 */
let inputLcaCpy

/**
 * 注册 before input 事件
 */
export function registryBeforeInputEventListener() {
    KRICH_EDITOR.addEventListener('beforeinput', async event => {
        const {isComposing, inputType} = event
        if (isComposing) {
            if (isInputtingStage) return
            isInputtingStage = true
            recordInput(true)
        }
        GLOBAL_HISTORY.initRange()
        let lca = event.getTargetRanges()
            .map(it => new KRange(it).commonAncestorContainer)
            .reduce((prev, current) => KRange.lca(prev, current))
        if (isBrNode(lca)) lca = lca.parentNode
        function init() {
            inputLca = lca
            inputLcaCpy = lca.cloneNode(true)
        }
        if (isComposing) {
            init()
            return
        }
        if (inputLca && inputLca !== lca) {
            recordInput(true)
            GLOBAL_HISTORY.initRange()
        }
        if (!inputTimeoutId) {
            inputTimeoutId = setTimeout(() => {
                if (!deleting)
                    recordInput(true)
            }, 500)
            init()
        }
        if (inputType.startsWith('insert')) {
            isInputtingStage = true
            await handleInput(event)
            isInputtingStage = false
            updateEditorRange()
        } else if (inputType.startsWith('delete')) {
            // 判断是 Delete 还是 Backspace
            const isDelete = inputType.endsWith('Forward')
            const range = KRange.activated()
            const {startContainer, startOffset} = range
            const node = KRange.activated().realStartContainer()
            let wait
            if (isDelete) {
                // 判断 delete 操作是否会将下一行的内容移动到当前行
                const atLast = (
                    isTextNode(startContainer) ? startContainer.textContent : startContainer.childNodes
                ).length === startOffset
                if (atLast) {
                    const [next, isInline] = nextLeafNodeInline(node)
                    if (!isInline) {
                        const nextParent = findParentTag(next, TOP_LIST)
                        GLOBAL_HISTORY.removeAuto([nextParent])
                    }
                }
            } else if (startOffset) {
                // 判断 backspace 操作是否会删除 lca
                if (
                    isTextNode(startContainer) && startContainer.textContent.length === 1 &&
                    getFirstChildNode(inputLca, true) === startContainer && getLastChildNode(inputLca) === startContainer
                ) {
                    const lca = isTextNode(inputLca) ? inputLca.parentNode : inputLca
                    const {previousSibling, nextSibling, parentNode} = lca
                    await waitTime(0)
                    wait = true
                    if (inputLca === lca) recordInput(true)
                    else {
                        const range = KRange.activated()
                        GLOBAL_HISTORY.initRange(range)
                        if (lca.isConnected) {  // 如果 lca 还在 DOM 中，则在其内部进行编辑
                            recordInput(true, null, () => {
                                GLOBAL_HISTORY.removeChild(lca, [inputLcaCpy])
                                if (isEmptyLine(lca)) GLOBAL_HISTORY.addChild(lca, [lca.firstChild])
                            })
                        } else {
                            if (previousSibling) {
                                GLOBAL_HISTORY.removeAfter(previousSibling, [lca])
                            } else if (nextSibling) {
                                GLOBAL_HISTORY.removeBefore(nextSibling, [lca])
                            } else {
                                GLOBAL_HISTORY.removeChild(parentNode, [lca])
                            }
                        }
                    }
                }
            } else {
                // 判断 backspace 操作是否会将当前行移动到上一行
                const [_, isInline] = prevLeafNodeInline(node)
                if (!isInline) {
                    recordInput(true, () => {
                        GLOBAL_HISTORY.removeAuto([findParentTag(node, TOP_LIST)])
                    })
                }
            }
            if (!wait) await waitTime(0)
            tryFixDom(isDelete)
        }
    })
    KRICH_EDITOR.addEventListener('compositionend', async event => {
        await handleInput(event)
        isInputtingStage = false
        updateEditorRange()
        recordInput(true)
    })
}

/**
 * 更新输入记录并清除 timeout
 * @param force {boolean} 是否强制更新，为 false 时若存在 timeoutId 则不进行更新
 * @param before {VoidFunction?} 在记录历史记录前触发的操作
 * @param after {VoidFunction?} 在记录历史记录后触发的操作
 */
export function recordInput(force, before, after) {
    if (inputLca && (force || !inputTimeoutId)) {
        clearTimeout(inputTimeoutId)
        before?.()
        if (inputLca.textContent && inputLca.textContent !== inputLcaCpy.textContent) {
            GLOBAL_HISTORY.modifyNode(inputLcaCpy, inputLca)
        }
        after?.()
        GLOBAL_HISTORY.next()
        inputTimeoutId = 0
        inputLca = inputLcaCpy = null
    }
}

/**
 * 处理字符输入事件
 * @param event {InputEvent|CompositionEvent}
 * @return {Promise<void>|void}
 */
function handleInput(event) {
    const {data, inputType} = event
    const {collapsed, commonAncestorContainer} = editorRange
    const isEnter = inputType === 'insertParagraph'
    if (findParentTag(commonAncestorContainer, ['A'])) {
        if (isEnter) {
            // 屏蔽超链接中的换行操作
            event.preventDefault()
            return
        } else if (collapsed) {
            event.preventDefault()
            editorRange.insertText(data)
            return
        }
    }
    if (isTextArea(findParentTag(commonAncestorContainer, TOP_LIST))) return
    const needEditStyle = data && !statusCheckCache && collapsed
    if (needEditStyle) {
        recordInput(true)
        GLOBAL_HISTORY.initRange(editorRange)
        inputLca = commonAncestorContainer
        inputLcaCpy = inputLca.cloneNode(true)
    }
    return waitTime(0).then(() => {
        const range = KRange.activated()
        const {startContainer, startOffset} = range
        if (isEnter) {
            // 在代办列表中换行时自动在 li 中插入 <input>
            const todoList = findParentTag(startContainer, item => item.classList?.contains?.('todo'))
            if (todoList) {
                const item = todoList.querySelector('&>li>p:first-child')
                if (item) item.before(TODO_MARKER.cloneNode(true))
            }
            // 重置样式
            const topLine = findParentTag(startContainer, ['P'])
            console.assert(!topLine.textContent && topLine.childNodes.length === 1, 'topLine 应当为空')
            topLine.innerHTML = '<br>'
            GLOBAL_HISTORY.addAuto([topLine])
            setCursorPositionBefore(topLine)
            for (let key in behaviors) {
                const behavior = behaviors[key]
                const button = behavior.button
                if (!isNoStatus(behavior) && isActive(button)) {
                    setButtonStatus(button)
                }
            }
        }
        /* 当用户输入位置所在文本与按钮列表不同时，将新输入的文本样式与按钮状态同步 */
        if (needEditStyle) {
            markStatusCacheEffect()
            const buttonList = compareBtnListStatusWith(startContainer)
            if (!buttonList) return
            const newRange = new KRange()
            newRange.setStart(startContainer, startOffset - data.length)
            newRange.setEnd(startContainer, startOffset)
            const offline = newRange.serialization()
            for (let child of buttonList) {
                clickButton(getElementBehavior(child), newRange, false, true)
                newRange.deserialized(offline)
            }
            newRange.collapse(false)
            newRange.active()
        }
    })
}