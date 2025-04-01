import Base from '../../../../node_modules/neo.mjs/src/table/Container.mjs';

class Table extends Base {
    static config = {
        className: 'Earthquakes.view.earthquakes.Table',
        ntype: 'earthquakes-table',
        layout: {ntype: 'vbox', align: 'stretch'},
        style: {width: '100%'},
        columns: [{
            dataField: "timestamp",
            text: "Date",
            renderer: (data) => data.value.toLocaleDateString(undefined, {weekday: "long", year: "numeric", month: "long", day: "numeric"})
        }, {
            dataField: "location",
            text: "Location"
        }, {
            dataField: "magnitude",
            text: "Magnitude",
            align: "right",
            renderer: (data) => data.value.toLocaleString()
        }]
    }
}

export default Neo.setupClass(Table);
