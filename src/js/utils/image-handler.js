import {createElement} from './tools'
import {imageHandler} from '../vars/global-exports-funtions'

/**
 * 上传图片
 * @param file {File}
 * @param element {HTMLImageElement?}
 * @return {Promise<HTMLImageElement>}
 */
export async function uploadImage(file, element) {
    if (!element) element = createElement('img', {
        style: 'width:30%'
    })
    await imageHandler(element, file)
    return element
}