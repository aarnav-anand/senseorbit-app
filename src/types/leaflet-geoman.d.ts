import 'leaflet';
import '@geoman-io/leaflet-geoman-free';

declare module 'leaflet' {
  interface Map {
    pm: PM.PMMap;
  }

  interface Layer {
    pm: PM.PMLayer;
  }

  namespace PM {
    interface PMMap {
      addControls(options?: PM.DrawOptions): void;
      removeControls(): void;
      setGlobalOptions(options: PM.GlobalOptions): void;
    }

    interface PMLayer {
      disable(): void;
      enable(): void;
    }

    interface DrawOptions {
      position?: string;
      drawMarker?: boolean;
      drawCircleMarker?: boolean;
      drawPolyline?: boolean;
      drawRectangle?: boolean;
      drawCircle?: boolean;
      drawText?: boolean;
      drawPolygon?: boolean;
      editMode?: boolean;
      dragMode?: boolean;
      cutPolygon?: boolean;
      removalMode?: boolean;
      rotateMode?: boolean;
    }

    interface GlobalOptions {
      snappable?: boolean;
      snapDistance?: number;
      allowSelfIntersection?: boolean;
    }
  }
}

export {};
