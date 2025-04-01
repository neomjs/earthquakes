import StateProvider from '../../../node_modules/neo.mjs/src/state/Provider.mjs';
import Store         from '../../../node_modules/neo.mjs/src/data/Store.mjs';

class MainStateProvider extends StateProvider {
    static config = {
        className: 'Earthquakes.view.MainStateProvider',

        data: {},
        stores: {
            earthquakes: {
                module: Store,
                model: {
                    fields: [{
                        name: "location",
                    }, {
                        name: "magnitude",
                    }, {
                        name: "timestamp",
                        type: "Date",
                    }, {
                        name: 'title',
                        mapping: "location"
                    }, {
                        name: "position",
                        calculate: (data, field, item)=>({lat: item.latitude, lng: item.longitude})
                    }]
                },
                url: "https://nameless-tundra-27404.herokuapp.com/go/?fn=earthquakes",
                responseRoot: "data",
                autoLoad: true
            },
        }
    }
}

export default Neo.setupClass(MainStateProvider);
