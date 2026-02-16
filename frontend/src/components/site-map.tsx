'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Map, {
  Marker,
  Popup,
  NavigationControl,
  MapRef,
} from 'react-map-gl/mapbox';
import { useRouter } from 'next/navigation';
import type { Site } from '@/lib/api';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

const MAP_STYLES = {
  streets: 'mapbox://styles/mapbox/light-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
} as const;

interface SiteMapProps {
  sites: Site[];
}

export function SiteMap({ sites }: SiteMapProps) {
  const mapRef = useRef<MapRef>(null);
  const router = useRouter();
  const [popupSite, setPopupSite] = useState<Site | null>(null);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets');
  const [mapError, setMapError] = useState<string | null>(null);

  // Filter sites that have coordinates
  const geoSites = sites.filter(
    (s) => s.latitude !== null && s.longitude !== null,
  );

  // Fit map to all markers once loaded
  const onMapLoad = useCallback(() => {
    if (!mapRef.current || geoSites.length === 0) return;

    if (geoSites.length === 1) {
      mapRef.current.flyTo({
        center: [
          parseFloat(geoSites[0].longitude!),
          parseFloat(geoSites[0].latitude!),
        ],
        zoom: 5,
      });
      return;
    }

    const lngs = geoSites.map((s) => parseFloat(s.longitude!));
    const lats = geoSites.map((s) => parseFloat(s.latitude!));

    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lngs) - 5, Math.min(...lats) - 5],
      [Math.max(...lngs) + 5, Math.max(...lats) + 5],
    ];

    mapRef.current.fitBounds(bounds, { padding: 60, duration: 1000 });
  }, [geoSites]);

  // Close popup when clicking on map background
  const onMapClick = useCallback(() => {
    setPopupSite(null);
  }, []);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center text-yellow-800">
        <p className="font-semibold">Map unavailable</p>
        <p className="mt-1 text-sm">
          Set <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> in your environment to
          enable the geospatial map.
        </p>
      </div>
    );
  }

  if (geoSites.length === 0) return null;

  if (mapError) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center text-yellow-800">
        <p className="font-semibold">Map failed to load</p>
        <p className="mt-1 text-sm">
          {mapError}
        </p>
        <p className="mt-2 text-xs text-yellow-600">
          Check that your <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> is valid and not
          expired.
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-gray-200">
      {/* Style toggle */}
      <div className="absolute right-12 top-3 z-10">
        <button
          onClick={() =>
            setMapStyle((prev) =>
              prev === 'streets' ? 'satellite' : 'streets',
            )
          }
          className="rounded bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow hover:bg-gray-50"
        >
          {mapStyle === 'streets' ? 'Satellite' : 'Streets'}
        </button>
      </div>

      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: 0,
          latitude: 30,
          zoom: 1.5,
        }}
        style={{ width: '100%', height: 400 }}
        mapStyle={MAP_STYLES[mapStyle]}
        onLoad={onMapLoad}
        onClick={onMapClick}
        onError={(e) => {
          console.error('Mapbox error:', e);
          setMapError(
            e?.error?.message || 'Could not connect to Mapbox. The access token may be invalid or expired.',
          );
        }}
        reuseMaps
      >
        <NavigationControl position="top-left" />

        {geoSites.map((site) => {
          const lat = parseFloat(site.latitude!);
          const lng = parseFloat(site.longitude!);
          const isExceeded = site.status === 'Limit Exceeded';

          return (
            <Marker
              key={site.id}
              latitude={lat}
              longitude={lng}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopupSite(site);

                // Fly to the marker so the popup is always visible in the viewport
                if (mapRef.current) {
                  mapRef.current.flyTo({
                    center: [lng, lat],
                    zoom: Math.max(mapRef.current.getZoom(), 3),
                    duration: 800,
                  });
                }
              }}
            >
              <div
                className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 shadow-lg transition-transform hover:scale-110 ${
                  isExceeded
                    ? 'border-red-300 bg-red-500'
                    : 'border-green-300 bg-green-500'
                }`}
                title={site.name}
              >
                <svg
                  className="h-4 w-4 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </Marker>
          );
        })}

        {popupSite && popupSite.latitude && popupSite.longitude && (
          <Popup
            latitude={parseFloat(popupSite.latitude)}
            longitude={parseFloat(popupSite.longitude)}
            anchor="bottom"
            onClose={() => setPopupSite(null)}
            closeOnClick={false}
            offset={20}
          >
            <div className="min-w-[180px] p-1">
              <h3 className="text-sm font-bold text-gray-900">
                {popupSite.name}
              </h3>
              <p className="text-xs text-gray-500">{popupSite.location}</p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Emissions:</span>
                  <span className="font-semibold">
                    {parseFloat(popupSite.total_emissions_to_date).toFixed(0)} kg
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Limit:</span>
                  <span className="font-semibold">
                    {parseFloat(popupSite.emission_limit).toFixed(0)} kg
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={`font-semibold ${
                      popupSite.status === 'Limit Exceeded'
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}
                  >
                    {popupSite.status}
                  </span>
                </div>
              </div>
              <button
                onClick={() => router.push(`/sites/${popupSite.id}`)}
                className="mt-2 w-full rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700"
              >
                View Details
              </button>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}

