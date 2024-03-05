import {KRange} from '../utils/range'
import {findParentTag} from '../utils/dom'
import {isMultiEleStruct, isTextArea} from '../types/button-behavior'
import {KRICH_EDITOR} from '../vars/global-fileds'

/**
 * 进行全选操作
 * @param range {KRange} 当前选择的范围
 * @return {KRange}
 */
export function selectAll(range) {
    const {commonAncestorContainer} = range
    const resultRange = new KRange()
    const scope = findParentTag(
        commonAncestorContainer,
            it => isTextArea(it) || isMultiEleStruct(it)
    )
    resultRange.selectNodeContents(scope ?? KRICH_EDITOR)
    return resultRange
}