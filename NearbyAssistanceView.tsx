import { useState } from 'react';
import { Crosshair, ExternalLink, Loader2, MapPin, Phone, Search } from 'lucide-react';
import { LeafletMapPicker, type MapMarkerItem } from './LeafletMapPicker';

interface PoliceStationItem {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  latitude: number;
  longitude: number;
  distanceKm: number;
  directionsUrl: string;
  isTrafficUnit: boolean;
  source: string;
}

export function NearbyAssistanceView() {
  const [lat, setLat] = useState<number>(23.0225);
  const [lng, setLng] = useState<number>(72.5714);
  const [locationLabel, setLocationLabel] = useState<string>('Select GPS or search a location');
  const [searchText, setSearchText] = useState('');
  const [searchOptions, setSearchOptions] = useState<
    Array<{ displayName: string; latitude: number; longitude: number }>
  >([]);

  const [stations, setStations] = useState<PoliceStationItem[]>([]);
  const [radiusKm, setRadiusKm] = useState<number>(6);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadStations(targetLat: number, targetLng: number, label: string) {
    setLat(targetLat);
    setLng(targetLng);
    setLocationLabel(label);
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const res = await fetch(`/api/stations/nearby?lat=${targetLat}&lng=${targetLng}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to query nearby police stations.');
      }
      setStations(data.stations || []);
      setRadiusKm(data.searchRadiusKm || 6);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed loading nearby police stations.');
      setStations([]);
    } finally {
      setLoading(false);
    }
  }

  function handleUseGps() {
    setError(null);
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser. Please search manually.');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const currentLat = Math.round(pos.coords.latitude * 1000000) / 1000000;
        const currentLng = Math.round(pos.coords.longitude * 1000000) / 1000000;
        let label = `${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}`;
        try {
          const rev = await fetch(`/api/location/reverse?lat=${currentLat}&lng=${currentLng}`);
          const revData = await rev.json();
          if (revData.address) label = revData.address;
        } catch {
          // keep coord label
        }
        await loadStations(currentLat, currentLng, label);
      },
      (geoErr) => {
        setLoading(false);
        setError(
          geoErr.code === geoErr.PERMISSION_DENIED
            ? 'GPS permission denied. Enter your city or locality in the search bar below.'
            : 'Unable to determine your GPS location. Please use manual location search.'
        );
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  async function handleManualSearch() {
    if (searchText.trim().length < 2) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/location/search?q=${encodeURIComponent(searchText.trim())}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed.');
      const results = data.results || [];
      setSearchOptions(results);
      if (results.length === 0) {
        setError('No matching locations found. Try a broader city or neighborhood name.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to search location.');
    } finally {
      setLoading(false);
    }
  }

  const mapMarkers: MapMarkerItem[] = stations.map((st) => ({
    id: st.id,
    latitude: st.latitude,
    longitude: st.longitude,
    title: st.name,
    subtitle: `${st.distanceKm} km away · ${st.address}`,
    accent: st.isTrafficUnit ? 'orange' : 'blue',
  }));

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Dark Command Strip */}
      <section className="bg-[#171A1D] text-white border border-[#24282C] p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#F15A24] font-semibold">
              Civic Traffic & Police Directory
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
              Nearby Traffic Assistance
            </h1>
            <p className="text-sm text-[#92969A] mt-1">
              Locate real published police and traffic enforcement stations via OpenStreetMap data.
            </p>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleUseGps}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F15A24] hover:bg-[#D94A17] text-white text-sm font-medium transition-colors disabled:opacity-50 self-start md:self-auto whitespace-nowrap cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Crosshair className="w-4 h-4" />
            )}
            <span>Use Current GPS Location</span>
          </button>
        </div>

        {/* Location Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#92969A] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleManualSearch();
                }
              }}
              placeholder="Search city, intersection, or locality..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#3A4046] bg-[#24282C] text-white placeholder-[#92969A] focus:outline-none focus:border-[#F15A24]"
            />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={handleManualSearch}
            className="px-4 py-2 border border-[#3A4046] bg-[#24282C] hover:border-white text-white text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
          >
            Search Location
          </button>
        </div>

        {searchOptions.length > 0 && (
          <ul className="border border-[#3A4046] divide-y divide-[#3A4046] bg-[#24282C]">
            {searchOptions.map((opt, idx) => (
              <li key={idx}>
                <button
                  type="button"
                  onClick={() => {
                    setSearchOptions([]);
                    void loadStations(opt.latitude, opt.longitude, opt.displayName);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-white hover:bg-[#171A1D] flex items-start gap-2 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#F15A24] mt-0.5 shrink-0" />
                  <span>{opt.displayName}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="text-xs text-[#92969A] flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#24282C]">
          <span>
            Active Point: <strong className="text-white font-medium">{locationLabel}</strong>
          </span>
          <span className="font-mono tabular-nums">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        </div>
      </section>

      {error && (
        <div className="p-4 bg-[#FEE2E2] border border-[#FCA5A5] text-sm text-[#991B1B]">
          {error}
        </div>
      )}

      {/* Map-Focused Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white border border-[#E2DFD7] p-3">
          <LeafletMapPicker
            latitude={lat}
            longitude={lng}
            zoom={13}
            markers={mapMarkers}
            heightClassName="h-[480px]"
          />
        </div>

        <div className="lg:col-span-5 bg-white border border-[#E2DFD7]">
          <div className="px-5 py-4 border-b border-[#E2DFD7] flex items-center justify-between gap-4">
            <h2 className="font-display text-base font-semibold text-[#171A1D]">
              Nearby Stations
            </h2>
            {hasSearched && (
              <span className="text-xs font-mono text-[#6B7280] tabular-nums">
                {stations.length} within {radiusKm} km
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-[#F5F3EF] animate-pulse" />
              ))}
            </div>
          ) : !hasSearched ? (
            <div className="p-8 text-sm text-[#4B5563]">
              Use your GPS location or search a neighborhood above to list nearby police and traffic stations.
            </div>
          ) : stations.length === 0 ? (
            <div className="p-8 text-sm text-[#4B5563] space-y-3">
              <p>
                No police stations with published coordinates were found in OpenStreetMap within {radiusKm} km.
              </p>
              <a
                href={`https://www.google.com/maps/search/traffic+police+station/@${lat},${lng},14z`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#F15A24] underline"
              >
                <span>Search Traffic Police on Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <ul className="divide-y divide-[#E2DFD7] max-h-[450px] overflow-y-auto">
              {stations.map((st) => (
                <li key={st.id} className="p-5 space-y-2.5 hover:bg-[#F5F3EF]/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-sm text-[#171A1D]">
                        {st.name}
                      </h3>
                      <p className="text-xs text-[#6B7280] mt-0.5 leading-relaxed">
                        {st.address}
                      </p>
                    </div>
                    <span className="font-mono text-xs font-semibold text-[#F15A24] tabular-nums whitespace-nowrap shrink-0">
                      {st.distanceKm} km
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <a
                      href={st.directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#171A1D] hover:bg-[#24282C] text-white text-xs font-medium transition-colors"
                    >
                      <span>Directions</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {st.phone ? (
                      <a
                        href={`tel:${st.phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#D4D0C8] bg-white hover:border-[#171A1D] text-[#171A1D] text-xs font-mono transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#F15A24]" />
                        <span>{st.phone}</span>
                      </a>
                    ) : (
                      <span className="text-[11px] text-[#92969A]">
                        Phone not published in OSM
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
