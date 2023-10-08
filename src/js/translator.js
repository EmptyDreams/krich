/**
 * 转译器，用于将文本转换为指定的样式
 * @type {{[string]: {
 *     convert: function(string, string): any,
 *     append: function(string, any, string): any
 * }}}
 */
export default {
    headerSelector: {
        convert: (text, level) => {
            return {
                level: parseInt(level),
                text,
                toString: () => {
                    const symbol = this.level === 0 ? 'p' : `h$${this.level}`
                    return `<${symbol}>${text}</${symbol}>`
                }
            }
        },
        append: (text, prev) => {
            prev.text += text
            return prev
        }
    }
}