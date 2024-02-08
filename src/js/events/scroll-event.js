import {KRICH_EDITOR} from '../vars/global-fileds'
import {updateHoverTipPosition} from '../utils/hover-tip'

export function registryEditorScrollEvent() {
    KRICH_EDITOR.addEventListener('scroll', updateHoverTipPosition)
}