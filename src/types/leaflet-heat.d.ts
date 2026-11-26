declare module 'leaflet.heat' {
  import * as L from 'leaflet';

  export class HeatLayer extends L.Layer {
    constructor(
      latlngs: Array<L.LatLng | L.HeatLatLngTuple>,
      options?: L.HeatMapOptions & L.LayerOptions
    );
    setLatLngs(latlngs: Array<L.LatLng | L.HeatLatLngTuple>): this;
    setOptions(options: L.HeatMapOptions): this;
  }
}
