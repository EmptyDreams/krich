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

/**
 * 将指定区间的字符移除
 * @param src {string} 原始字符串
 * @param index {number} 删除的起点
 * @param length {number} 区间长度
 * @return {string} 修改后的字符串
 */
export function removeStringByIndex(src, index, length) {
    return replaceStringByIndex(src, index, index + length, '')
}

/**
 * 将 `rgb(x, x, x)` 格式的字符串转换为 `#xxxxxx` 格式的字符串
 * @param rgb {string}
 * @return {string} 返回转换后的 hex 色码，对于不为 rgb 格式的色码返回原始字符串
 */
export function rgbToHex(rgb) {
    const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(.*?)?\)$/i)
    let result = '#'
    if (match) {
        for (let i = 1; i < 4; ++i) {
            result += parseInt(match[i]).toString(16).padStart(2, '0')
        }
    } else {
        result = rgb
    }
    return result
}

/**
 * 判断一个字符串是否是合法的 http 或 https 链接
 * @param url {string}
 */
export function isHttpUrl(url) {
    return /^https?:\/\/\S+\.\S+(\S*)$/.test(url)
}

/**
 * 从文件中读取图片并转换为 base64 编码
 * @param file {File}
 * @return {Promise<string>}
 */
export function readImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = event => resolve(event.target.result)
        reader.onerror = event => reject(event)
        reader.readAsDataURL(file)
    })
}