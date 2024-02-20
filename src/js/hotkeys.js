import {setPostHeader} from './behaviors/header'
import {editorRange} from './events/range-monitor'
import {clickButton} from './behavior'

const KEY_CTRL  =   0b1
const KEY_ALT   =   0b10
const KEY_SHIFT =   0b100

/**
 * @type {{[code: string]: HotkeyValue[]|string}}
 */
const hotkeysList = {
    'KeyB': [{      // ctrl + b -> 粗体
        fn: KEY_CTRL,
        i: 'bold'
    }, {            // ctrl + shift + b -> 引用
        fn: KEY_CTRL | KEY_SHIFT,
        i: 'blockquote'
    }],
    'keyD': [{      // ctrl + shift + d -> 代办列表
        fn: KEY_CTRL | KEY_SHIFT,
        i: 'todo'
    }],
    'KeyE': [{      // ctrl + e -> 内联代码块
        fn: KEY_CTRL,
        i: 'inlineCode'
    }, {            // ctrl + alt + e -> 橡皮擦
        fn: KEY_CTRL | KEY_ALT,
        i: 'clear'
    }],
    'KeyF': [{      // ctrl + f -> 前景色
        fn: KEY_CTRL,
        i: 'color'
    }, {            // ctrl + shift + f -> 背景色
        fn: KEY_CTRL | KEY_SHIFT,
        i: 'background'
    }],
    'KeyH': [{      // ctrl + shift + h -> 分隔线
       fn: KEY_CTRL | KEY_SHIFT,
       i: 'hr'
    }],
    'KeyI': [{      // ctrl + i -> 斜体
        fn: KEY_CTRL,
        i: 'italic'
    }],
    'KeyM': [{      // ctrl + shift + M -> 图片
        fn: KEY_CTRL | KEY_SHIFT,
        i: 'img'
    }],
    'KeyO': [{      // ctrl + shift + o -> 有序列表
        fn: KEY_CTRL | KEY_SHIFT,
        i: 'ol'
    }],
    'KeyU': [{      // ctrl + u -> 下划线
        fn: KEY_CTRL,
        i: 'underline'
    }, {            // ctrl + shift + u -> 无序列表
        fn: KEY_CTRL | KEY_SHIFT,
        i: 'ul'
    }],
    'KeyX': [{      // ctrl + shift + x -> 删除线
        fn: KEY_CTRL | KEY_SHIFT,
        i: 'through'
    }],
    'Backquote': [{ // ctrl + ` -> 代码块
        fn: KEY_CTRL,
        i: 'code'
    }],
    'Comma': [{     // ctrl + , -> 下标
        fn: KEY_CTRL,
        i: 'sub'
    }],
    'Period': [{    // ctrl + . -> 上标
        fn: KEY_CTRL,
        i: 'sup'
    }]
}

export function initKeyList() {
    // 添加标题快捷键
    for (let level of ['0', '1', '2', '3', '4', '5', '6']) {
        const key = 'Digit' + level
        hotkeysList[key] = [{
            fn: KEY_CTRL,
            i: () => setPostHeader(editorRange, level)
        }]
        hotkeysList['Numpad' + level] = key
    }
}

/**
 * 处理快捷键
 * @param event {KeyboardEvent} 事件对象
 * @param doIt {boolean} 是否修改 DOM 结构
 */
export function handleHotkeys(event, doIt) {
    const item = lookup(event)?.i
    if (!item) return
    event.preventDefault()
    if (doIt) {
        if (typeof item === 'string') {
            clickButton(item, null, true)
        } else {
            item()
        }
    }
}

/**
 * 查表
 * @param event {KeyboardEvent}
 * @return {HotkeyValue|undefined}
 */
function lookup(event) {
    const {code, shiftKey, ctrlKey, altKey} = event
    let target = hotkeysList[code]
    while (typeof target === 'string') {
        target = hotkeysList[target]
    }
    if (!target) return
    for (let value of target) {
        const fn = value.fn
        // 检查是否有需要按下但没有按下的功能键
        if (
            ((fn & KEY_CTRL) && !ctrlKey) ||
            ((fn & KEY_SHIFT) && !shiftKey) ||
            ((fn & KEY_ALT) && !altKey)
        ) {
            continue
        }
        // 检查是否有不需要按下但按下的功能键
        if (
            (ctrlKey && !(fn & KEY_CTRL)) ||
            (shiftKey && !(fn & KEY_SHIFT)) ||
            (altKey && !(fn & KEY_ALT))
        ) {
            continue
        }
        return value
    }
}