import Base       from '../../../node_modules/neo.mjs/src/core/Base.mjs';
import DomAccess  from '../../../node_modules/neo.mjs/src/main/DomAccess.mjs';
import DomEvents  from '../../../node_modules/neo.mjs/src/main/DomEvents.mjs';
import Observable from '../../../node_modules/neo.mjs/src/core/Observable.mjs';

/**
 * @class Neo.main.addon.GoogleMaps
 * @extends Neo.core.Base
 * @singleton
 */
class GoogleMaps extends Base {
    static config = {
        /**
         * @member {String} className='Neo.main.addon.GoogleMaps'
         * @protected
         */
        className: 'Neo.main.addon.GoogleMaps',
        /**
         * @member {Neo.core.Base[]} mixins=[Observable]
         */
        mixins: [Observable],
        /**
         * @member {Object} remote
         * @protected
         */
        remote: {
            app: [
                'addMarkers',
                'create',
                'destroyMarkers',
                'geocode',
                'panTo',
                'removeMap',
                'removeMarker',
                'setCenter',
                'setZoom',
            ]
        },
        /**
         * @member {Boolean} singleton=true
         * @protected
         */
        singleton: true
    }

    /**
     * @member {google.maps.Geocoder|null} maps=null
     */
    geoCoder = null
    /**
     * @member {Object} maps={}
     */
    maps = {}
    /**
     * @member {Object} markers={}
     */
    markers = {}

    /**
     * @param {Object} config
     */
    construct(config) {
        super.construct(config);
        this.loadApi();

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
    addMarker(data) {
        let me = this,
            mapId = data.mapId,
            listenerId, marker;

        if (me.maps[mapId]) {
            Neo.ns(`${mapId}`, true, me.markers);

            marker = me.getMarker(data); //

            // neoId and neoMapId are used in the click event
            marker.neoId = data.id;
            marker.neoMapId = data.mapId;

            me.cacheMarker(marker, data);

            marker.setMap(me.maps[data.mapId]);

            if (!google.maps.event.hasListeners(marker, 'click')) marker.addListener('click', me.onMarkerClick.bind(me, marker));

        } else {
            listenerId = me.on('mapCreated', id => {
                if (mapId === id) {
                    me.un(listenerId);
                    me.addMarker(data);
                }
            })
        }
    }

    /**
     * Markers are tagged with
     * - mapId, because there can be multiple maps
     * - id, which is the id of the record
     * Thus, markers are cached in this.markers[data.mapId][data.id]
     * The neoId is used to route click events to the right app.
     * @param {*} data
     * @returns true if the entry exists
     */
    getCachedMarker(data) {
        return this.markers[data.mapId]?.[data.id];
    }

    cacheMarker(marker, data) {
        this.markers[data.mapId][data.id] = marker;
    }

    getMap(data) {
        return this.maps[data.mapId];
    }

    /**
     * Markers are tagged with
     * - neoId, because there can be multiple Neo windows TODO is this used right?
     * - mapId, because there can be multiple maps
     * - id, which is the id of the record
     * Thus, markers are cached in this.markers[data.mapId][data.id]
     * The neoId is used to route click events to the right app.
     */
    getMarker(data) {
        // This method should be designed to be easy to override. Which becomes
        // a question of whether this code should decide when to reuse a marker versus
        // creating a new marker.
        let me = this;

        let marker = me.getCachedMarker(data);
        if (marker) {
            // I thought getIcon was an object with setters, but it looks like it's just a config.
            marker.setIcon(data.icon);
            // let icon = marker.getIcon();
            // for (const prop in icon) {
            //     const fnName = `set${prop.charAt(0).toUpperCase()}${prop.slice(1)}`;
            //     icon[fnName]?.(data.icon[prop]);
            // }
        } else {
            marker = new google.maps.Marker({
                icon: data.icon,
                label: data.label,
                position: data.position,
                title: data.title,
            });
        }
        return marker;
    }

    addMarkers(...config) {
        config.forEach(item => this.addMarker(item));
    }

    /**
     * Updates the marker by setting the value of each data property.
     * For example
     *      updateMarkers([{mapId: 'Neo-map-id-1', id: '-3', props: {title:'Foo'}}])
     * will run setTitle('Foo') on the marker with the specified mapId and marker id.
     * @param {Object | Object[]} data
     * @param {String} data.mapId
     * @param {String} data.id
     * @param {Object} data.props
     */
    // updateMarkers(...data) {
    //     data.forEach(item => {
    //         const marker = this.markers[item.mapId]?.[item.id];
    //         if (!marker) return;
    //         for (const prop in item.props) {
    //             const fnName = `set${prop.charAt(0).toUpperCase()}${prop.slice(1)}`;
    //             marker[fnName]?.(item.props[prop]);
    //         }
    //     });
    // }

    /**
     * @param {Object} data
     * @param {Object} data.center
     * @param {Boolean} data.fullscreenControl
     * @param {String} data.id -- the main thread GoogleMap wrapper instance id
     * @param {Object} data.mapOptions // Pass any options which are not explicitly defined here
     * @param {Number} data.maxZoom
     * @param {Number} data.minZoom
     * @param {Number} data.zoom
     * @param {Boolean} data.zoomControl
     */
    create(data) {
        let me = this,
            id = data.id,
            map;

        me.maps[id] = map = new google.maps.Map(DomAccess.getElement(id), {
            center: data.center,
            fullscreenControl: data.fullscreenControl,
            maxZoom: data.maxZoom,
            minZoom: data.minZoom,
            zoom: data.zoom,
            zoomControl: data.zoomControl,
            ...data.mapOptions
        });

        map.addListener('zoom_changed', me.onMapZoomChange.bind(me, map, id));

        me.fire('mapCreated', id);
    }

    /**
     * Destroys all markers for the specified map ID.
     * @param {Object} data
     * @param {String} data.mapId
     */
    destroyMarkers(data) {
        let me = this,
            markers = me.markers[data.mapId] || {};

        Object.values(markers).forEach(marker => marker.setMap(null));
        delete me.markers[data.mapId];
    }


    /**
     * Use either address, location or placeId
     * @param {Object} data
     * @param {String} data.address
     * @param {Object} data.location
     * @param {String} data.placeId
     * @returns {Object}
     */
    async geocode(data) {
        let me = this,
            response;

        if (!me.geoCoder) {
            me.geoCoder = new google.maps.Geocoder();
        }

        response = await me.geoCoder.geocode(data);

        return JSON.parse(JSON.stringify(response));
    }

    /**
     * @protected
     */
    async loadApi() {
        let key = Neo.config.googleMapsApiKey,
            url = 'https://maps.googleapis.com/maps/api/js';

        DomAccess.loadScript(`${url}?key=${key}&v=weekly&callback=Neo.emptyFn`).then(() => {
            console.log('GoogleMaps API loaded');
            google.maps.importLibrary('marker');
        })

    }

    /**
     * @param {google.maps.Map} map
     * @param {String} mapId
     */
    onMapZoomChange(map, mapId) {
        DomEvents.sendMessageToApp({
            id: mapId,
            path: [{ cls: [], id: mapId }],
            type: 'googleMapZoomChange',
            value: map.zoom
        });
    }

    /**
     * @param {google.maps.Marker} marker
     * @param {Object} event
     * @param {Object} event.domEvent
     */
    onMarkerClick(marker, event) {
        let transformedEvent = DomEvents.getMouseEventData(event.domEvent);

        DomEvents.sendMessageToApp({
            id: marker.neoId,
            path: [{ cls: [], id: marker.neoMapId }],
            type: 'googleMarkerClick',
            domEvent: transformedEvent
        })
    }

    /**
     * @param data
     * @param {String} data.mapId
     * @param {Object} data.position
     */
    panTo(data) {
        this.maps[data.mapId].panTo(data.position);
    }

    /**
     * @param {Object} data
     * @param {String} data.mapId
     */
    removeMap(data) {
        delete this.maps[data.mapId];
        delete this.markers[data.mapId];
    }

    /**
     * @param {Object} data
     * @param {String} data.id
     * @param {String} data.mapId
     */
    removeMarker(data) {
        let markers = this.markers[data.mapId];
        markers[data.id]?.setMap(null);
        delete markers[data.id];
    }

    /**
     * @param {Object} data
     * @param {String} data.id
     * @param {Object} data.value
     */
    setCenter(data) {
        this.maps[data.id].setCenter(data.value);
    }

    /**
     * @param {Object} data
     * @param {String} data.id
     * @param {Number} data.value
     */
    setZoom(data) {
        this.maps[data.id].setZoom(data.value);
    }

    /**
     * @param {Object} data
     * @param {String} data.id
     * @param {String} data.mapId
     */
    showMarker(data) {
        this.markers[data.mapId][data.id].setMap(this.maps[data.mapId]);
    }
}

export default Neo.setupClass(GoogleMaps);
