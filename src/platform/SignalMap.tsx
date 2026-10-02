import { MapPin } from "lucide-react";
import { districts as positions } from './types';
export default function SignalMap({
  data,
  selected,
  onSelect,
  large = false,
}: {
  data: { name: string; total: number; negative: number }[];
  selected: string;
  onSelect: (city: string) => void;
  large?: boolean;
}) {
  return (
    <div className={`signal-map ${large ? "large" : ""}`}>
      <div className="map-label">
        <MapPin size={13} /> TAMIL NADU <span>INDIA</span>
      </div>
      <svg
        viewBox="0 0 600 400"
        role="img"
        aria-label="District signal map. Use the district selector or select a marker to filter analytics."
      >
        <defs>
          <pattern
            id="mapgrid"
            width="30"
            height="30"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 30 0 L 0 0 0 30"
              fill="none"
              stroke="#dedfe9"
              strokeWidth=".6"
            />
          </pattern>
          <radialGradient id="mapglow">
            <stop stopColor="#c5c0ff" stopOpacity=".5" />
            <stop offset="1" stopColor="#f1f2f8" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="600" height="400" fill="url(#mapgrid)" />
        <ellipse cx="305" cy="205" rx="235" ry="185" fill="url(#mapglow)" />
        <text
          x="477"
          y="228"
          className="sea-label"
          transform="rotate(-65 477 228)"
        >
          BAY OF BENGAL
        </text>
        <text x="28" y="360" className="map-coordinate">
          8°N
        </text>
        <text x="28" y="50" className="map-coordinate">
          13°N
        </text>
        <text x="87" y="382" className="map-coordinate">
          77°E
        </text>
        <text x="452" y="382" className="map-coordinate">
          80°E
        </text>
        {positions.map((city) => {
          const x = 90 + (city.lon - 76.6) * 95,
            y = 340 - (city.lat - 8.1) * 55;
          const value = data.find((d) => d.name === city.name);
          const total = value?.total || 0;
          const active = selected === city.name;
          const radius = total ? 5 + Math.min(6, Math.sqrt(total)) : 3;
          return (
            <g
              key={city.name}
              role="button"
              tabIndex={0}
              aria-label={`${city.name}: ${total} signals. Filter district`}
              onClick={() => onSelect(active ? "all" : city.name)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(active ? "all" : city.name);
                }
              }}
              className="map-city"
            >
              {total > 0 && (
                <circle
                  cx={x}
                  cy={y}
                  r={radius + 10}
                  fill="#7363e8"
                  opacity=".09"
                />
              )}
              <circle
                cx={x}
                cy={y}
                r={radius}
                fill={active ? "#4532bb" : total ? "#8170eb" : "#c4c6d3"}
                stroke="white"
                strokeWidth="3"
              />
              <circle cx={x} cy={y} r="3" fill="white" />
              <title>{city.name}: {total} signals</title>
              {active && <text x={x - 10} y={y - 15} textAnchor="end" className="city-label">{city.name} · {total}</text>}
            </g>
          );
        })}
      </svg>
      <div className="district-map-controls">
        <label>District <select aria-label="Map district" value={selected} onChange={e=>onSelect(e.target.value)}><option value="all">All Tamil Nadu</option><option value="Tamil Nadu">Statewide / multiple districts</option>{positions.map(d=><option key={d.name} value={d.name}>{d.name} · {data.find(v=>v.name===d.name)?.total || 0}</option>)}</select></label>
        <small>{data.find(d=>d.name==='Tamil Nadu')?.total || 0} statewide / multi-district signals are not pinned to one location.</small>
      </div>
      <div className="map-footer">
        <span>
          <i /> Signal volume
        </span>
        <small>Approximate district headquarters · not incident locations</small>
      </div>
    </div>
  );
}
