import '../resources/css/main.styl'
import './behavior'
import {initKrich} from './utils/init'

// noinspection JSUnresolvedReference
initKrich(_optional)

export {setHighlight, setImgMapper, setImgStatusChecker, disconnect, setHistorySize} from './vars/global-exports-funtions'

export {exportData, importData} from './utils/dom'

// ESM：封装终点