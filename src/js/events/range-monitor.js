import {
    ACTIVE_FLAG,
    DISABLE_FLAG,
    EMPTY_BODY_ACTIVE_FLAG,
    KRICH_CONTAINER,
    KRICH_EDITOR,
    KRICH_TOOL_BAR
} from '../vars/global-fileds'
import {KRange} from '../utils/range'
import {syncButtonsStatus} from '../utils/btn'
import {getElementBehavior, isEmptyBodyElement} from '../utils/tools'
import {findParentTag} from '../utils/dom'
import {isIndependent} from '../types/button-behavior'
import {closeHoverTip} from '../utils/hover-tip'
import {isNewClickCycle, markClickCycleStart} from './mouse-click-event'
import {isDragging} from './paste-event'
import {isInputtingStage} from './before-input-event'
import {behaviors} from '../behavior'
import {highlightCode} from '../utils/highlight'

/**
 * 编辑区最新的已激活的 KRange 对象
 * @type {KRange}
 */
export let editorRange
/**
 * 标识当前 range 获取前编辑器是否没有获得焦点
 * @type {boolean|undefined}
 */
export let isFirstRange = true

/** 注册选区变化监听 */
export function registryRangeMonitor() {
    document.addEventListener('selectionchange', updateEditorRange)
}

/**
 * 手动设置 editor range
 * @param range {KRange}
 */
export function modifyEditorRange(range) {
    if (isNewClickCycle) {
        isFirstRange = !editorRange
        markClickCycleStart()
    }
    editorRange = range
}

/** 自动更新 editor range */
export function updateEditorRange() {
    if (isInputtingStage || isDragging) return
    const disableToolBar = () => KRICH_TOOL_BAR.classList.add(DISABLE_FLAG)
    if (!KRICH_CONTAINER.contains(document.activeElement)) {
        editorRange = null
        isFirstRange = true
        disableToolBar()
        closeHoverTip()
        return
    }
    if (KRICH_EDITOR !== document.activeElement) return
    let independent
    const prev = editorRange
    const range = KRange.activated()
    const rangeBody = range.body
    modifyEditorRange(range)
    KRICH_EDITOR.querySelectorAll(`.${EMPTY_BODY_ACTIVE_FLAG}`)
        .forEach(it => it.classList.remove(EMPTY_BODY_ACTIVE_FLAG))
    updateLinkButtonStatus(range)
    if (rangeBody || (independent = range.some(findIndependent))) {
        disableToolBar()
        if (rangeBody) {
            rangeBody.classList.add(EMPTY_BODY_ACTIVE_FLAG)
            range.active()
        }
        if (findIndependent(rangeBody ?? range.commonAncestorContainer)) {
            const target = rangeBody ?? independent
            getElementBehavior(target)?.hover?.(target)
        }
    } else {
        if (range.startContainer !== prev?.startContainer || range.startOffset !== prev.startOffset)
            closeHoverTip()
        KRICH_TOOL_BAR.classList.remove(DISABLE_FLAG)
        range.eachAllNode(it => {
            if (isEmptyBodyElement(it))
                it.classList.add(EMPTY_BODY_ACTIVE_FLAG)
        })
    }
    if (!range.collapsed) {
        syncButtonsStatus(range.commonAncestorContainer)
    } else if (!prev?.collapsed || range.endContainer !== prev?.endContainer) {
        syncButtonsStatus(range.startContainer)
    }
    if (!findParentTag(range.realStartContainer(), ['PRE'])) {
        KRICH_EDITOR.querySelectorAll(`pre.${ACTIVE_FLAG}`)
            .forEach(it => {
                it.classList.remove(ACTIVE_FLAG)
                // noinspection JSIgnoredPromiseFromCall
                highlightCode(null, it)
            })
    }
}

function findIndependent(it) {
    return findParentTag(it, isIndependent)
}

/**
 * 更新超链接按钮的状态
 * @param range {KRange}
 */
function updateLinkButtonStatus(range) {
    const classList = behaviors.link.button.classList
    if (range.collapsed) classList.remove(DISABLE_FLAG)
    else classList.add(DISABLE_FLAG)
}