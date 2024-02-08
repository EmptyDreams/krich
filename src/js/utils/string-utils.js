/**
 * 向字符串中插入一段文本
 * @param src {string} 原始字符串
 * @param index {number} 插入位置，插入点及右侧字符会向后移动
 * @param value {string} 要插入的内容
 * @return {string}
 */
export function insertTextToString(src, index, value) {
    return replaceStringByIndex(src, index, index, value)
}

/**
 * 将指定区间的字符串替换为指定字符
 * @param src {string} 原始字符串
 * @param startInclude {number} 替换起点
 * @param endExclude {number} 替换终点
 * @param value {string} 要插入的内容
 * @return {string}
 */
export function replaceStringByIndex(src, startInclude, endExclude, value) {
    return src.substring(0, startInclude) + value + src.substring(endExclude)
}