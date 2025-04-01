import BaseViewport from '../../../node_modules/neo.mjs/src/container/Viewport.mjs';
import MainView     from './MainView.mjs';

class Viewport extends BaseViewport {
    static config = {
        className: 'MyApp.view.Viewport',
        layout   : {ntype: 'fit'},
        items    : [{module:MainView}]
    }
}

export default Neo.setupClass(Viewport);
