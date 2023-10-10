/**
 * 元素列表
 * @type {{
 *     start: Number,
 *     end: Number
 *     map: Map<string, *>
 * }[]}
 */
const list = []
/** 编辑器文本 */
let editSrc = ''

/**
 * 转译器，用于将文本转换为指定的样式
 * @type {{[p:string]: {
 *  priority: number,
 *  convert: (function(?string): *),
 *  clash?: string[]
 * }}}
 */
const registry = {
    'headerSelector': {
        priority: 99,
        convert: (level) => {
            const symbol = level === '0' ? 'p' : `h$${level}`
            return {
                level,
                do: text => `<${symbol}>${text}</${symbol}>`,
                equals: that => that.level === level
            }
        }
    }
}

/**
 * 向指定位置插入一个新的元素
 * @param index {number} 插入的坐标
 * @param text {string} 要插入的文本
 * @param optionals {[string, selected?:*]} 文本附带的选项，每个数组第一个元素是类型名称，第二个元素为下拉菜单选中的值
 */
export function insert(index, text, ...optionals) {
    const translators = optionals.map(it => [registry[it[0]], it])
        .sort((a, b) => a[0].priority[1] - b[0].priority[1])
    const map = new Map()
    for (let item of translators) {
        const [translator, option] = item
        if (translator.clash?.find(it => map.has(it))) continue
        map.set(option[0], translator.convert(option[1]))
    }
    const node = {
        start: index, end: index + text.length, map
    }
    if (index === editSrc.length) { // 如果插入点在结尾二分结果一定为 false，所以特殊处理
        if (list.length === 0) list.push(node)
        else {
            const oldNode = list[list.length - 1]
            const compare = compareNode(node, oldNode)
            if (compare < 3) oldNode.end += text.length
            else list.push(node)
        }
    } else {    // 如果插入点不在结尾二分一定能匹配到一个节点
        const tryMerge = (old) => {
            const oldNode = list[old]
            if (compareNode(oldNode, node) < 3) {
                oldNode.end += text.length
                shift(old + 1, text.length)
                return true
            }
        }
        const old = binarySearch(index)
        if (!tryMerge(old)) {
            const isHead = list[old].start === index    // 插入点是否在当前节点的开头
            if (!(isHead && old > 0 && tryMerge(old - 1))) {
                const isTail = list[old].start === index + text.length  // 插入的文本是否在当前节点的结尾
                if (!(isTail && old + 1 < list.length && tryMerge(old + 1))) {
                    // 如果没有完成任何合并操作
                    if (isHead) {
                        list.splice(old, 0, node)
                        shift(old, text.length)
                    } else if (isTail) {
                        shift(old + 1, text.length)
                        list.splice(old + 1, 0, node)
                    } else {    // 当插入的文本在节点中间时对节点进行切割
                        const oldNode = list[old]
                        const right = {
                            start: index, end: oldNode.end, map: new Map(oldNode.map)
                        }
                        oldNode.end = index
                        list.splice(old + 1, 0, node, right)
                        shift(old + 2, text.length)
                    }
                }
            }
        }
    }
    editSrc = editSrc.substring(0, index) + text + editSrc.substring(index)
}

/** 使用二分法查找指定下标对应的 node */
function binarySearch(index) {
    let left = 0, right = list.length - 1
    while (left <= right) {
        const mid = (left + right) >>> 1
        const item = list[mid]
        if (item.start > index) right = item.start - 1
        else if (item.end <= index) left = item.end + 1
        else return mid
    }
    return -1
}

/**
 * 对比两个 node 是否相等
 * @return {number} 0 表示相等，1 表示 start 不等，2 表示 end 不等，3 表示 map 不等
 */
function compareNode(a, b) {
    if (a.start !== b.start) return 1
    else if (a.end !== b.end) return 2
    /** @type {Map<string, *>} */
    const mapA = a.map, mapB = b.map
    if (mapA.size !== mapB.size) return 3
    for (let [keyA, valueA] of mapA) {
        const valueB = mapB.get(keyA)
        if (!valueB || !valueA.equals(valueB)) return 3
    }
    return 0
}

/**
 * 将指定位置及其以后的所有 node 的位置向右便宜指定值
 * @param index node 在 list 中的下标（包括）
 * @param offset 偏移量
 */
function shift(index, offset) {
    for (let i = index; i < list.length; ++i) {
        list[i].start += offset
        list[i].end += offset
    }
}