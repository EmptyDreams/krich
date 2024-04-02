import '../resources/css/main.styl'
import './behavior'
import {initKrich} from './utils/init'

// noinspection JSUnresolvedReference
initKrich(_optional)

export {setHighlight, setImgMapper, setImgStatusChecker, disconnect} from './vars/global-exports-funtions'

export {exportData} from './utils/dom'

// ESM：封装终点