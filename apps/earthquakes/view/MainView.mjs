import Container           from '../../../node_modules/neo.mjs/src/container/Base.mjs';
import Controller          from './MainViewController.mjs';
import EarthquakesTable    from './earthquakes/Table.mjs';
import GoogleMapsComponent from '../../../node_modules/neo.mjs/src/component/wrapper/GoogleMaps.mjs';
import MainStateProvider   from './MainStateProvider.mjs';

class MainView extends Container {
    static config = {
        className: 'Earthquakes.view.MainView',
        ntype: 'earthquakes-main',
        controller: {module: Controller},
        stateProvider: {
            module: MainStateProvider
        },

        layout: { ntype: 'vbox', align: 'stretch' },
        items: [{
            module: GoogleMapsComponent,
            flex: 1,
            center: {
                lat: 64.8014187,
                lng: -18.3096357
            },
            zoom: 6
        },{
            module: EarthquakesTable,
            bind: {
                store: 'stores.earthquakes'
            },
            style: {width: '100%'},
            wrapperStyle: {
                height: 'auto' // Because neo-table-wrapper sets height:'100%', which it probably shouldn't
            }
        }],
    }
}

export default Neo.setupClass(MainView);
