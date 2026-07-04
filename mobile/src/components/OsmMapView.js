import { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { MAP_DEFAULTS } from '../config/constants';

function buildHtml(initialRegion) {
  const latitude = initialRegion?.latitude ?? MAP_DEFAULTS.latitude;
  const longitude = initialRegion?.longitude ?? MAP_DEFAULTS.longitude;
  const zoom = initialRegion?.zoom ?? MAP_DEFAULTS.zoom;

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>html, body, #map { height: 100%; margin: 0; padding: 0; }</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: true, attributionControl: false }).setView([${latitude}, ${longitude}], ${zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    var markersById = {};
    var polylineLayer = null;

    function post(message) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }

    map.on('click', function (e) {
      post({ type: 'mapPress', lat: e.latlng.lat, lng: e.latlng.lng });
    });

    function iconForMarker(id) {
      var color = id === 'destination' ? '#FFC629' : (id === 'driver' || id === 'me') ? '#3478F6' : '#1C1C1E';
      return L.divIcon({
        className: '',
        html: '<div style="width:16px;height:16px;border-radius:8px;background:' + color + ';border:3px solid #ffffff;box-shadow:0 1px 5px rgba(0,0,0,0.4);"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
    }

    window.setMarkers = function (markers) {
      var incomingIds = {};
      markers.forEach(function (m) {
        incomingIds[m.id] = true;
        var existing = markersById[m.id];
        if (existing) {
          existing.setLatLng([m.latitude, m.longitude]);
        } else {
          var marker = L.marker([m.latitude, m.longitude], { draggable: !!m.draggable, icon: iconForMarker(m.id) }).addTo(map);
          if (m.label) marker.bindTooltip(m.label, { permanent: false });
          marker.on('dragend', (function (id) {
            return function (e) {
              var pos = e.target.getLatLng();
              post({ type: 'markerDragEnd', id: id, lat: pos.lat, lng: pos.lng });
            };
          })(m.id));
          markersById[m.id] = marker;
        }
      });
      Object.keys(markersById).forEach(function (id) {
        if (!incomingIds[id]) {
          map.removeLayer(markersById[id]);
          delete markersById[id];
        }
      });
    };

    window.setPolyline = function (points) {
      if (polylineLayer) {
        map.removeLayer(polylineLayer);
        polylineLayer = null;
      }
      if (points && points.length > 1) {
        polylineLayer = L.polyline(points, { color: '#1C1C1E', weight: 4, opacity: 0.85 }).addTo(map);
      }
    };

    window.centerOn = function (lat, lng, zoom) {
      map.setView([lat, lng], zoom || map.getZoom());
    };

    post({ type: 'ready' });
  </script>
</body>
</html>`;
}

const OsmMapView = forwardRef(function OsmMapView({ initialRegion, markers = [], polyline = [], onMapPress, onMarkerDragEnd, style }, ref) {
  const webviewRef = useRef(null);
  const htmlRef = useRef(buildHtml(initialRegion));
  const readyRef = useRef(false);
  const pendingRef = useRef([]);

  const runJs = (js) => {
    if (readyRef.current && webviewRef.current) {
      webviewRef.current.injectJavaScript(`${js}; true;`);
    } else {
      pendingRef.current.push(js);
    }
  };

  useImperativeHandle(ref, () => ({
    centerOn: (latitude, longitude, zoom) => {
      runJs(`window.centerOn(${latitude}, ${longitude}${zoom ? `, ${zoom}` : ''})`);
    },
  }));

  const markersKey = JSON.stringify(markers);
  useEffect(() => {
    runJs(`window.setMarkers(${markersKey})`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markersKey]);

  const polylineKey = JSON.stringify(polyline);
  useEffect(() => {
    runJs(`window.setPolyline(${polylineKey})`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polylineKey]);

  const handleMessage = (event) => {
    let data;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch (err) {
      return;
    }

    if (data.type === 'ready') {
      readyRef.current = true;
      const queued = pendingRef.current;
      pendingRef.current = [];
      queued.forEach((js) => webviewRef.current?.injectJavaScript(`${js}; true;`));
    } else if (data.type === 'mapPress') {
      onMapPress?.(data.lat, data.lng);
    } else if (data.type === 'markerDragEnd') {
      onMarkerDragEnd?.(data.id, data.lat, data.lng);
    }
  };

  return (
    <WebView
      ref={webviewRef}
      originWhitelist={['*']}
      source={{ html: htmlRef.current }}
      onMessage={handleMessage}
      style={[styles.webview, style]}
      javaScriptEnabled
      domStorageEnabled
    />
  );
});

export default OsmMapView;

const styles = StyleSheet.create({
  webview: {
    flex: 1,
  },
});
