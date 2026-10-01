import { MapPin } from "lucide-react";
const positions = [
  { name: "Chennai", lat: 13.0827, lon: 80.2707 },
  { name: "Coimbatore", lat: 11.0168, lon: 76.9558 },
  { name: "Madurai", lat: 9.9252, lon: 78.1198 },
  { name: "Tiruchirappalli", lat: 10.7905, lon: 78.7047 },
  { name: "Salem", lat: 11.6643, lon: 78.146 },
  { name: "Tirunelveli", lat: 8.7139, lon: 77.7567 },
];
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
        aria-label="Interactive city signal map. Select a city to filter all analytics."
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
        {positions.map((city, i) => {
          const x = 90 + (city.lon - 76.9) * 105,
            y = 340 - (city.lat - 8.7) * 65;
          const value = data.find((d) => d.name === city.name);
          const total = value?.total || 0;
          const active = selected === city.name;
          const radius = 8 + Math.min(14, Math.sqrt(total) * 2);
          return (
            <g
              key={city.name}
              role="button"
              tabIndex={0}
              aria-label={`${city.name}: ${total} signals. Filter city`}
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
              <text
                x={x + (i === 0 ? -15 : 18)}
                y={y - 16}
                textAnchor={i === 0 ? "end" : "start"}
                className="city-label"
              >
                {city.name}
              </text>
              <text
                x={x + (i === 0 ? -15 : 18)}
                y={y}
                textAnchor={i === 0 ? "end" : "start"}
                className="city-count"
              >
                {total} signals
              </text>
            </g>
          );
        })}
      </svg>
      <div className="map-footer">
        <span>
          <i /> Signal volume
        </span>
        <small>City centroids · not exact report locations</small>
      </div>
    </div>
  );
}
