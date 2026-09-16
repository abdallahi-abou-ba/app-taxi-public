import { forwardRef, useImperativeHandle, useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { MAP_DEFAULTS } from '../config/constants';
import { LANDMARKS } from '../config/landmarks';
import { shadow } from '../theme/theme';
import { useTheme } from '../context/ThemeContext';

// Material "directions_car" glyph, reused for both the driver marker and the recenter button.
const CAR_SVG_PATH =
  'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z';

// Below this zoom the ~dozen landmark labels would overlap and clutter a city-wide view.
const LANDMARK_MIN_ZOOM = 13;

function buildHtml(initialRegion, isArabic) {
  const latitude = initialRegion?.latitude ?? MAP_DEFAULTS.latitude;
  const longitude = initialRegion?.longitude ?? MAP_DEFAULTS.longitude;
  const zoom = initialRegion?.zoom ?? MAP_DEFAULTS.zoom;
  const landmarks = LANDMARKS.map((lm) => ({ lat: lm.latitude, lng: lm.longitude, name: isArabic ? lm.nameAr : lm.name }));

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #DDE3E8; }
    .landmark-label { background: rgba(255,255,255,0.92); border: none; box-shadow: 0 1px 3px rgba(0,0,0,0.25); font-size: 11px; font-weight: 600; color: #1C1C1E; padding: 2px 7px; border-radius: 6px; }
    .landmark-label::before { display: none; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: true, attributionControl: false }).setView([${latitude}, ${longitude}], ${zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    var LANDMARKS = ${JSON.stringify(landmarks)};
    var landmarkMarkers = LANDMARKS.map(function (lm) {
      var marker = L.circleMarker([lm.lat, lm.lng], { radius: 5, color: '#ffffff', weight: 2, fillColor: '#6C6C72', fillOpacity: 1 });
      marker.bindTooltip(lm.name, { permanent: true, direction: 'right', offset: [6, 0], className: 'landmark-label' });
      return marker;
    });
    function updateLandmarkVisibility() {
      var show = map.getZoom() >= ${LANDMARK_MIN_ZOOM};
      landmarkMarkers.forEach(function (marker) {
        var onMap = map.hasLayer(marker);
        if (show && !onMap) marker.addTo(map);
        if (!show && onMap) map.removeLayer(marker);
      });
    }
    map.on('zoomend', updateLandmarkVisibility);
    updateLandmarkVisibility();

    var markersById = {};
    var polylineLayer = null;
    var polylineCasingLayer = null;

    function post(message) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }

    map.on('click', function (e) {
      post({ type: 'mapPress', lat: e.latlng.lat, lng: e.latlng.lng });
    });

    var CAR_SVG_PATH = '${CAR_SVG_PATH}';
    var PERSON_SVG_PATH = 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z';

    function iconForMarker(id) {
      if (id === 'driver' || id === 'me') {
        return L.divIcon({
          className: '',
          html: '<div style="width:34px;height:34px;border-radius:17px;background:#3478F6;border:3px solid #ffffff;' +
            'box-shadow:0 3px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">' +
            '<svg width="17" height="17" viewBox="0 0 24 24" fill="#ffffff"><path d="' + CAR_SVG_PATH + '"/></svg></div>',
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });
      }
      if (id === 'client') {
        return L.divIcon({
          className: '',
          html: '<div style="width:30px;height:30px;border-radius:15px;background:#34C759;border:3px solid #ffffff;' +
            'box-shadow:0 3px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="#ffffff"><path d="' + PERSON_SVG_PATH + '"/></svg></div>',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
      }
      var isStop = id.indexOf('stop-') === 0;
      var color = id === 'destination' ? '#FFC629' : (isStop ? '#3478F6' : '#1C1C1E');
      var stopNumber = isStop ? (parseInt(id.slice(5), 10) + 1) : null;
      var innerDot = stopNumber
        ? '<div style="position:absolute;left:8px;top:7px;width:14px;height:14px;border-radius:50%;background:#fff;' +
          'display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:' + color + ';">' + stopNumber + '</div>'
        : '<div style="position:absolute;left:10px;top:10px;width:10px;height:10px;border-radius:50%;background:#fff;"></div>';
      return L.divIcon({
        className: '',
        html: '<div style="position:relative;width:30px;height:40px;">' +
          '<div style="position:absolute;left:1px;top:1px;width:28px;height:28px;border-radius:50% 50% 50% 0;' +
          'background:' + color + ';transform:rotate(-45deg);box-shadow:0 3px 6px rgba(0,0,0,0.35);border:2px solid #fff;"></div>' +
          innerDot + '</div>',
        iconSize: [30, 40],
        iconAnchor: [15, 40],
      });
    }

    function animateMarkerTo(marker, lat, lng) {
      var from = marker.getLatLng();
      var start = null;
      var duration = 600;
      function step(timestamp) {
        if (!start) start = timestamp;
        var t = Math.min(1, (timestamp - start) / duration);
        marker.setLatLng([from.lat + (lat - from.lat) * t, from.lng + (lng - from.lng) * t]);
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    window.setMarkers = function (markers) {
      var incomingIds = {};
      markers.forEach(function (m) {
        incomingIds[m.id] = true;
        var existing = markersById[m.id];
        if (existing) {
          if (m.id === 'driver' || m.id === 'me' || m.id === 'client') {
            animateMarkerTo(existing, m.latitude, m.longitude);
          } else {
            existing.setLatLng([m.latitude, m.longitude]);
          }
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
      if (polylineCasingLayer) {
        map.removeLayer(polylineCasingLayer);
        polylineCasingLayer = null;
      }
      if (points && points.length > 1) {
        polylineCasingLayer = L.polyline(points, { color: '#ffffff', weight: 8, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }).addTo(map);
        polylineLayer = L.polyline(points, { color: '#FFC629', weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round' }).addTo(map);
      }
    };

    window.centerOn = function (lat, lng, zoom) {
      map.setView([lat, lng], zoom || map.getZoom(), { animate: true });
    };

    post({ type: 'ready' });
  </script>
</body>
</html>`;
}

const OsmMapView = forwardRef(function OsmMapView({ initialRegion, markers = [], polyline = [], onMapPress, onMarkerDragEnd, style }, ref) {
  const { i18n } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const webviewRef = useRef(null);
  const htmlRef = useRef(buildHtml(initialRegion, i18n.language === 'ar'));
  const readyRef = useRef(false);
  const pendingRef = useRef([]);
  const lastVehiclePositionRef = useRef(null);

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
    const vehicle = markers.find((m) => m.id === 'driver' || m.id === 'me');
    if (vehicle) lastVehiclePositionRef.current = vehicle;
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

  const handleRecenter = () => {
    const target = lastVehiclePositionRef.current;
    const latitude = target?.latitude ?? initialRegion?.latitude ?? MAP_DEFAULTS.latitude;
    const longitude = target?.longitude ?? initialRegion?.longitude ?? MAP_DEFAULTS.longitude;
    runJs(`window.centerOn(${latitude}, ${longitude}, 16)`);
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html: htmlRef.current }}
        onMessage={handleMessage}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
      />
      <TouchableOpacity style={styles.recenterButton} onPress={handleRecenter} activeOpacity={0.75}>
        <Ionicons name="locate" size={20} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
});

export default OsmMapView;

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  recenterButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.raised,
  },
});
