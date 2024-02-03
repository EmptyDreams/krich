import {updateEditorRange} from './range-monitor'
import {markComposingStart, markComposingStop} from '../vars/global-fileds'

/**
 * 注册 before input 事件。
 *
 * 该事件会在用户输入内容前触发，中文输入过程中不会触发该事件。
 *
 * @param target {HTMLElement}
 * @param consumer {function(InputEvent|CompositionEvent):Promise<void>}
 */
export function registryBeforeInputEventListener(target, consumer) {
    target.addEventListener('beforeinput', event => {
        if (event.isComposing) {
            markComposingStart()
        } else if (event.inputType.startsWith('insert')) {
            // noinspection JSIgnoredPromiseFromCall
            consumer(event)
        }
    })
    target.addEventListener('compositionend', event => {
        consumer(event).then(() => {
            markComposingStop()
            updateEditorRange()
        })
    })
}