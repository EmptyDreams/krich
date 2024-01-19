import {KRICH_CONTAINER, KRICH_EDITOR} from '../global-fileds'
import {KRange} from '../utils/range'
import {syncButtonsStatus} from '../utils/btn'

/**
 * 编辑区最新的已激活的 KRange 对象
 * @type {KRange}
 */
export let editorRange

export function registryRangeMonitor() {
    document.addEventListener('selectionchange', () => {
        if (!KRICH_CONTAINER.contains(document.activeElement)) return editorRange = null
        if (KRICH_EDITOR !== document.activeElement) return
        const kRange = KRange.activated()
        const range = kRange.item
        const prev = editorRange?.item
        if (!range.collapsed) {
            const lca = range.commonAncestorContainer
            syncButtonsStatus(lca.firstChild ?? lca)
        } else if (!prev?.collapsed || range.endContainer !== prev?.endContainer) {
            syncButtonsStatus(range.startContainer)
        }
        editorRange = kRange
    })
}