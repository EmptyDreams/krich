/**
 * 转译器，用于将文本转换为指定的样式
 * @type {{[p:string]: {
 *  priority: number,
 *  convert: (function(?string): *),
 *  clash?: string[]
 * }}}
 */
export default {
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