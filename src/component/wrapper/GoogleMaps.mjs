import Base from '../../../node_modules/neo.mjs/src/component/Base.mjs';
import ClassSystemUtil from '../../../node_modules/neo.mjs/src/util/ClassSystem.mjs';
import Store from '../../../node_modules/neo.mjs/src/data/Store.mjs';

/**
 * @class Neo.component.wrapper.GoogleMaps
 * @extends Neo.component.Base
 */
class GoogleMaps extends Base {
    static config = {
        /**
         * @member {String} className='Neo.component.wrapper.GoogleMaps'
         * @protected
         */
        className: 'Neo.component.wrapper.GoogleMaps',
        /**
         * @member {String} ntype='googlemaps'
         * @protected
         */
        ntype: 'googlemaps',
        /**
         * Specify lat & lng for the current focus position
         * @member {Object} center_={lat: -34.397, lng: 150.644}
         */
        center_: { lat: -34.397, lng: 150.644 },
        /**
         * The selected map marker. The specified marker must be in the map's markerStore.
         * @member {Record} selected_=null
         *
         */

        /**
         * markerStore records are required to have
         * - position an object of the form {lat:0, lng:0} used to create the google.maps.LatLng
         * - title, used for the marker's title property
         * Prefer to use markerStoreConfig instead.
         * @member {Neo.data.Store|Object} markerStore_
         * @protected
         */
        markerStore_: null,

        /**
         * @member {Number} zoom_=8
         */
        zoom_: 8,

        stateProperty: 'selected',

        /**
         * This uses record.selected to determine the marker fill color (yellow or red).
         * @param {Record} record
         * @returns the marker config for classic google.maps.Marker
         */
        markerIconConfig: record => ({
            path: 0, // google.maps.SymbolPath.CIRCLE,
            scale: 10,
            strokeColor: 'black',
            strokeWeight: 3,
            fillColor: record.selected ? 'yellow' : 'red',
            fillOpacity: 1.0,
        })
    }

    /**
     * false hides the default fullscreen control
     * @member {Boolean} fullscreenControl=true
     */
    fullscreenControl = true
    /**
     * @member {Object} markerStoreConfig=null
     */
    markerStoreConfig = null
    /**
     * Internal flag. Gets set to true once Neo.main.addon.GoogleMaps.create() is finished.
     * @member {Boolean} mapCreated=false
     */
    mapCreated = false
    /**
     * Pass any options to the map instance which are not explicitly defined here
     * @member {Object} mapOptions={}
     */
    mapOptions = {}
    /**
     * null => the maximum zoom from the current map type is used instead
     * @member {Number|null} maxZoom=null
     */
    maxZoom = null
    /**
     null => the minimum zoom from the current map type is used instead
     * @member {Number|null} minZoom=null
     */
    minZoom = null
    /**
     * false hides the default zoom control
     * @member {Boolean} zoomControl=true
     */
    zoomControl = true

    /**
     * @param {Object} config
     */
    construct(config) {
        super.construct(config);

        let me = this;

        me.addDomListeners({
            googleMapZoomChange: me.onMapZoomChange,
            googleMarkerClick: me.parseMarkerClick,
            local: false,
            scope: me
        })
    }

    /**
     * @param {Object} data
     * @param {Object} [data.anchorPoint] x & y
     * @param {String} [data.icon]
     * @param {String} data.id
     * @param {String} [data.label]
     * @param {String} data.mapId
     * @param {Object} data.position
     * @param {String} [data.title]
     */
    // addMarker(data) {
    //     Neo.main.addon.GoogleMaps.addMarker({
    //         appName: this.appName,
    //         ...data
    //     })
    // }

    /**
     * Triggered after the center config changes
     * @param {Object} value
     * @param {Object} oldValue
     * @protected
     */
    afterSetCenter(value, oldValue) {
        let me = this;

        if (me.mapCreated) {
            Neo.main.addon.GoogleMaps.setCenter({
                appName: me.appName,
                id: me.id,
                value
            })
        }
    }

    /**
     * Triggered after the markerStore config changes
     * @param {Object} value
     * @param {Object} oldValue
     * @protected
     */
    afterSetMarkerStore(value, oldValue) {
        let me = this;
        if (oldValue) oldValue.un({
            load: me._onMarkerStoreLoadBuffered,
            scope: me
        });

        if (!value) return;

        value.on({
            load: me._onMarkerStoreLoadBuffered,
            scope: me
        });
        value.on('recordChange', data => {
            this.addMarkers([data.record]);
        });
        value.on('mutate', data => {
            let me = this;
            // data.addedItems
            // data.removedItems
            // data.addedItems.map(record=>me.getMarkerConfig
            // data.addedMarkers
            // this.addMarkers([me.getMarkerConfig(data.record)]);
            console.log(data);
        });
        me.onMarkerStoreLoad();

    }

    /**
     * Triggered after the mounted config changes
     * @param {Boolean} value
     * @param {Boolean} oldValue
     * @protected
     */
    afterSetMounted(value, oldValue) {
        let me = this;

        if (value === false && oldValue !== undefined) {
            me.removeMap();
        }

        super.afterSetMounted(value, oldValue);

        if (value) {
            let opts = {
                appName: me.appName,
                center: me.center,
                fullscreenControl: me.fullscreenControl,
                id: me.id,
                mapOptions: me.mapOptions,
                maxZoom: me.maxZoom,
                minZoom: me.minZoom,
                zoom: me.zoom,
                zoomControl: me.zoomControl
            };

            setTimeout(() => {
                Neo.main.addon.GoogleMaps.create(opts).then(() => {
                    me.mapCreated = true;
                    me.onComponentMounted()
                })
            }, 50)
        }
    }

    /**
     * Triggered after the zoom config got changed
     * @param {Number} value
     * @param {Number} oldValue
     * @protected
     */
    afterSetZoom(value, oldValue) {
        let me = this;

        if (me.mapCreated) {
            Neo.main.addon.GoogleMaps.setZoom({
                appName: me.appName,
                id: me.id,
                value
            });

            me.fire('zoomChange', { id: me.id, value })
        }
    }

    /**
     * Triggered before the markerStore config gets changed.
     * @param {Object} value
     * @param {Object} oldValue
     * @protected
     */
    beforeSetMarkerStore(value, oldValue) {
        oldValue?.destroy(); // TODO. This can't be a good idea.
        if (!value) return;

        return ClassSystemUtil.beforeSetInstance(value, Store, this.markerStoreConfig)
    }

    /**
     * @param {Boolean} updateParentVdom=false
     * @param {Boolean} silent=false
     */
    destroy(updateParentVdom = false, silent = false) {
        this.removeMap();
        super.destroy(updateParentVdom, silent)
    }

    /**
     * @param {Object} data
     */
    onMapZoomChange(data) {
        this.zoom = data.value
    }

    // If the store fires "load" in quick succession there are multiple calls to
    // destroyMarkers() *before* the calls to addMarkers are finished, and it's a mess.
    // Therefore, the event handler is buffered using this method.
    _onMarkerStoreLoadBuffered = this.debounce(this.onMarkerStoreLoad.bind(this), 10);

    onMarkerStoreLoad() {
        let me = this;
        Neo.main.addon.GoogleMaps.destroyMarkers({
            appName: me.appName,
            mapId: me.id,
        }).then(() => {
            this.addMarkers(me.markerStore.items);
        });

    }

    getMarkerConfig(record) {
        let me = this;
        return {
            appName: me.appName,
            mapId: me.id,
            icon: me.markerIconConfig(record),
            ...record
        };
    }

    addMarkers(records = []) {
        const markerConfigs = records.map(record => this.getMarkerConfig(record));
        Neo.main.addon.GoogleMaps.addMarkers(markerConfigs);
    }

    /**
     * Hook to use once the map instance got rendered
     */
    onComponentMounted() {
    }

    /**
     * @param {Object} position
     * @param {Number} position.lat
     * @param {Number} position.lng
     */
    panTo(position) {
        Neo.main.addon.GoogleMaps.panTo({
            appName: this.appName,
            mapId: this.id,
            position
        })
    }

    /**
     * Internal function. Use onMarkerClick() or the markerClick event instead
     * @param {Object} data
     * @protected
     */
    parseMarkerClick(data) {
        let me = this;
        data.record = me.markerStore.get(data.id);
        me.fire('markerClick', { id: me.id, ...data });
    }

    /**
     *
     */
    removeMap() {
        Neo.main.addon.GoogleMaps.removeMap({
            appName: this.appName,
            mapId: this.id
        })
    }

    /**
     * @param {String} id
     */
    removeMarker(id) {
        Neo.main.addon.GoogleMaps.removeMarker({
            appName: this.appName,
            mapId: this.id,
            id,
        })
    }

    // This should be a framework method.
    debounce(func, wait, immediate) {
        let timeout
        return function (...args) {
            clearTimeout(timeout)
            timeout = setTimeout(() => {
                timeout = null
                if (!immediate) func.apply(this, args)
            }, wait)
            if (immediate && !timeout) func.apply(this, [...args])
        }
    }
}

export default Neo.setupClass(GoogleMaps);
