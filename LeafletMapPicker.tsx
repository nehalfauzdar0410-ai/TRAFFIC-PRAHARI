import { useEffect, useRef } from 'react';
import L from 'leaflet';

export interface MapMarkerItem {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  subtitle?: string;
  accent?: 'orange' | 'charcoal' | 'blue';
}

interface LeafletMapPickerProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  interactiveSelect?: boolean;
  onSelectCoordinates?: (lat: number, lng: number) => void;
  markers?: MapMarkerItem[];
  heightClassName?: string;
}

function createPinIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'taffic-map-pin',
    html: `<div style="width:18px;height:18px;border-radius:9999px;background:${color};border:3px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

export function LeafletMapPicker({
  latitude,
  longitude,
  zoom = 14,
  interactiveSelect = false,
  onSelectCoordinates,
  markers = [],
  heightClassName = 'h-72',
}: LeafletMapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const primaryMarkerRef = useRef<L.Marker | null>(null);
  const extraLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const primaryMarker = L.marker([latitude, longitude], {
      icon: createPinIcon('#D9531E'),
      draggable: interactiveSelect,
    }).addTo(map);

    if (interactiveSelect && onSelectCoordinates) {
      primaryMarker.on('dragend', () => {
        const pos = primaryMarker.getLatLng();
        onSelectCoordinates(
          Math.round(pos.lat * 1000000) / 1000000,
          Math.round(pos.lng * 1000000) / 1000000
        );
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        onSelectCoordinates(
          Math.round(e.latlng.lat * 1000000) / 1000000,
          Math.round(e.latlng.lng * 1000000) / 1000000
        );
      });
    }

    const extraLayer = L.layerGroup().addTo(map);

    mapRef.current = map;
    primaryMarkerRef.current = primaryMarker;
    extraLayerRef.current = extraLayer;

    return () => {
      map.remove();
      mapRef.current = null;
      primaryMarkerRef.current = null;
      extraLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = primaryMarkerRef.current;
    if (!map || !marker) return;

    marker.setLatLng([latitude, longitude]);
    map.setView([latitude, longitude], map.getZoom(), { animate: false });
  }, [latitude, longitude]);

  useEffect(() => {
    const layer = extraLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    for (const item of markers) {
      const color =
        item.accent === 'orange'
          ? '#D9531E'
          : item.accent === 'blue'
            ? '#1D4ED8'
            : '#1C1F23';

      const m = L.marker([item.latitude, item.longitude], {
        icon: createPinIcon(color),
      });
      const safeTitle = item.title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeSub = (item.subtitle || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      m.bindPopup(
        `<div style="font-size:12px;line-height:1.4"><strong>${safeTitle}</strong>${
          safeSub ? `<div style="margin-top:2px;color:#4B5563">${safeSub}</div>` : ''
        }</div>`
      );
      m.addTo(layer);
    }
  }, [markers]);

  return (
    <div
      ref={containerRef}
      className={`w-full ${heightClassName} border border-[#E2DFD7] bg-[#F3F1EC]`}
    />
  );
}
