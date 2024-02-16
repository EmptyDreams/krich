// noinspection JSAssignmentUsedAsCondition

import {EMPTY_BODY_ACTIVE_FLAG, isComposing, KRICH_CONTAINER, KRICH_EDITOR, KRICH_TOOL_BAR} from '../vars/global-fileds'
import {KRange} from '../utils/range'
import {syncButtonsStatus} from '../utils/btn'
import {getElementBehavior, isEmptyBodyElement} from '../utils/tools'
import {findParentTag} from '../utils/dom'
import {isTextArea} from '../types/button-behavior'
import {closeHoverTip} from '../utils/hover-tip'

/**
 * 编辑区最新的已激活的 KRange 对象
 * @type {KRange}
 */
export let editorRange

export function registryRangeMonitor() {
    document.addEventListener('selectionchange', updateEditorRange)
}

export function updateEditorRange() {
    if (isComposing) return
    const disableToolBar = () => KRICH_TOOL_BAR.classList.add('disable')
    if (!KRICH_CONTAINER.contains(document.activeElement)) {
        editorRange = null
        disableToolBar()
        return
    }
    if (KRICH_EDITOR !== document.activeElement) return
    let textArea
    const prev = editorRange
    const range = KRange.activated()
    editorRange = range
    KRICH_EDITOR.querySelectorAll(`.${EMPTY_BODY_ACTIVE_FLAG}`)
        .forEach(it => it.classList.remove(EMPTY_BODY_ACTIVE_FLAG))
    const rangeBody = range.body
    if (rangeBody ||
        (textArea = range.some(it => findParentTag(it, isTextArea)))
    ) {
        disableToolBar()
        if (rangeBody) {
            rangeBody.classList.add(EMPTY_BODY_ACTIVE_FLAG)
            range.active()
        }
        const target = rangeBody ?? textArea
        getElementBehavior(target)?.hover?.(target)
    } else {
        if (range.startContainer !== prev?.startContainer || range.startOffset !== prev.startOffset)
            closeHoverTip()
        KRICH_TOOL_BAR.classList.remove('disable')
        for (let element of range.getAllTopElements()) {
            for (let it of [element, ...element.querySelectorAll('*')]) {
                if (isEmptyBodyElement(it))
                    it.classList.add(EMPTY_BODY_ACTIVE_FLAG)
            }
        }
        if (!range.collapsed) {
            const lca = range.commonAncestorContainer
            syncButtonsStatus(lca.firstChild ?? lca)
        } else if (!prev?.collapsed || range.endContainer !== prev?.endContainer) {
            syncButtonsStatus(range.startContainer)
        }
    }
}