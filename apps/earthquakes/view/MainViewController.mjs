import Base from '../../../node_modules/neo.mjs/src/controller/Component.mjs';

class MainViewController extends Base {
    static config = {
        className: 'MyApp.view.MainViewController'
    }
}

export default Neo.setupClass(MainViewController);
