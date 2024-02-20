import {GLOBAL_EVENT_FUN_LIST} from './global-fileds'

/**
 * 取消编辑器与 document 的绑定。
 *
 * 注意：该函数并非完全销毁编辑器，仅用于取消与编辑器与 document 的绑定！
 */
export function disconnect() {
    for (let key in GLOBAL_EVENT_FUN_LIST) {
        document.removeEventListener(key, GLOBAL_EVENT_FUN_LIST[key])
    }
}

/**
 * 代码高亮器，留空表示不支持高亮
 *
 * 传入的参数为 pre 对象，直接修改传入的对象即可，无返回值
 *
 * @type {undefined|function(Element)}
 */
export let highlight
/**
 * 代码高亮支持的语言列表
 *
 * 数组第一个为默认选项
 *
 * 每个数组中的元素的第一个值是外部显示的值，第二个值是要赋值给 pre 的值
 *
 * @type {undefined|function(): ([string, string])[]}
 */
export let highlightLanguagesGetter

/**
 * 设置代码高亮
 * @param highlighter {function(Element): Promise<void>|undefined} 代码高亮函数
 * @param languages {function(): ([string, string])[]} 获取支持的语言列表，该函数的返回值内部不会缓存
 */
export function setHighlight(highlighter, languages) {
    highlight = highlighter
    highlightLanguagesGetter = languages
}

/**
 * 图片处理
 * @type {undefined|function(HTMLImageElement, File): Promise<void>}
 */
export let imageHandler

/**
 * 设置图片处理器，用于将用户选择的图片上传到服务器或内嵌到 DOM 中
 * @param handler {function(HTMLImageElement, File)}
 */
export function setImgHandler(handler) {
    imageHandler = handler
}

/**
 * 检查图片是否能够成功拉取
 * @type {function(Response): boolean}
 */
export let imageStatusChecker

/**
 * 设置图片状态检查器
 * @param checker {function(Response): boolean}
 */
export function setImgStatusChecker(checker) {
    imageStatusChecker = checker
}