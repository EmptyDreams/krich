import '../resources/css/main.styl'
import './behavior'
import {initKrich} from './utils/init'

// noinspection JSUnresolvedReference
initKrich(_optional)

export {setHighlight, setImgHandler, setImgStatusChecker, disconnect} from './vars/global-exports-funtions'

// ESM：封装终点