import {KRange} from '../utils/range'
import {findParentTag, getFirstChildNode, getLastChildNode} from '../utils/dom'
import {isMultiEleStruct, isTextArea} from '../types/button-behavior'
import {KRICH_EDITOR} from '../vars/global-fileds'

const checker = it => isTextArea(it) || isMultiEleStruct(it)

/**
 * 进行全选操作
 * @param range {KRange} 当前选择的范围
 * @return {KRange}
 */
export function selectAll(range) {
    const {commonAncestorContainer, startOffset, endOffset, startContainer, endContainer} = range
    const resultRange = new KRange()
    let scope = findParentTag(commonAncestorContainer, checker)
    if (scope && (
        !startOffset && startContainer === getFirstChildNode(commonAncestorContainer) &&
        endOffset === (endContainer.firstChild ? endContainer.childNodes : endContainer.textContent).length &&
        endContainer === getLastChildNode(commonAncestorContainer)
    )) {
        scope = findParentTag(scope.parentNode, checker)
    }
    resultRange.selectNode(scope ?? KRICH_EDITOR)
    return resultRange
}