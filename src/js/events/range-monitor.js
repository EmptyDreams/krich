import {KRICH_CONTAINER, KRICH_EDITOR, KRICH_TOOL_BAR} from '../global-fileds'
import {KRange} from '../utils/range'
import {syncButtonsStatus} from '../utils/btn'
import {IS_COMPOSING} from './before-input'

/**
 * 编辑区最新的已激活的 KRange 对象
 * @type {KRange}
 */
export let editorRange

export function registryRangeMonitor() {
    document.addEventListener('selectionchange', () => {
        if (IS_COMPOSING) return
        if (!KRICH_CONTAINER.contains(document.activeElement)) {
            editorRange = null
            KRICH_TOOL_BAR.classList.add('disable')
            return
        }
        if (KRICH_EDITOR !== document.activeElement) return
        const kRange = KRange.activated()
        if (kRange.body) {
            kRange.active()
            KRICH_TOOL_BAR.classList.add('disable')
            console.log('a')
            return
        } else {
            KRICH_TOOL_BAR.classList.remove('disable')
        }
        console.log('b')
        const range = kRange
        const prev = editorRange
        if (!range.collapsed) {
            const lca = range.commonAncestorContainer
            syncButtonsStatus(lca.firstChild ?? lca)
        } else if (!prev?.collapsed || range.endContainer !== prev?.endContainer) {
            syncButtonsStatus(range.startContainer)
        }
        editorRange = kRange
    })
}