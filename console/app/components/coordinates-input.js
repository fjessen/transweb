import CoordinatesInputComponent from '@fleetbase/ember-ui/components/coordinates-input';

export const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Transweb override of ember-ui's <CoordinatesInput /> (the "Select from map" picker on places,
 * contacts, etc.).
 *
 * ember-ui 0.4.2 loads CARTO's basemaps.cartocdn.com tiles, which now require an API key and show an
 * "API key required" watermark without one. Use the keyless OpenStreetMap tiles instead, as
 * ember-ui 0.4.3+ does upstream (its leaflet-tile-source util). OpenStreetMap has no dark style, so
 * dark mode uses the same tiles. Any https:// tile URL passed in is still used as given.
 *
 * Remove this file and coordinates-input.hbs after upgrading @fleetbase/ember-ui to 0.4.3 or later.
 */
export default class TranswebCoordinatesInputComponent extends CoordinatesInputComponent {
    tileAttribution = OSM_TILE_ATTRIBUTION;

    changeTileSource(sourceUrl = null) {
        if (typeof sourceUrl === 'string' && sourceUrl.startsWith('https://')) {
            this.mapTheme = 'custom';
            this.tileSourceUrl = sourceUrl;
            return;
        }

        this.mapTheme = sourceUrl === 'dark' || sourceUrl === 'dark_all' ? sourceUrl : 'light';
        this.tileSourceUrl = OSM_TILE_URL;
    }
}
