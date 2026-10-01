export const cities = [
  { name: "Chennai", lat: 13.0827, lon: 80.2707 },
  { name: "Coimbatore", lat: 11.0168, lon: 76.9558 },
  { name: "Madurai", lat: 9.9252, lon: 78.1198 },
  { name: "Tiruchirappalli", lat: 10.7905, lon: 78.7047 },
  { name: "Salem", lat: 11.6643, lon: 78.146 },
  { name: "Tirunelveli", lat: 8.7139, lon: 77.7567 },
];
export const categories = [
  "Infrastructure",
  "Water",
  "Waste",
  "Transport",
  "Safety",
  "Parks",
  "Other",
];
const negative =
  /\b(broken|potholes?|unsafe|garbage|overflow|delayed?|leak|blocked|outage|dangerous|not working|no water|uncollected|flooding|poor|terrible)\b/i;
const positive =
  /\b(thanks?|fixed|repaired|clean|improved|great|restored|beautiful|excellent|resolved|helpful)\b/i;
export function classify(text) {
  if (negative.test(text)) return "negative";
  if (positive.test(text)) return "positive";
  return "neutral";
}
export function validateReport(body) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new Error("A report object is required.");
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const area = typeof body.area === "string" ? body.area.trim() : "";
  if (content.length < 10 || content.length > 2000)
    throw new Error("Describe the issue in 10–2,000 characters.");
  if (area.length < 2 || area.length > 100)
    throw new Error("Enter an area between 2 and 100 characters.");
  if (!cities.some((c) => c.name === body.city))
    throw new Error("Choose a supported city.");
  if (!categories.includes(body.category))
    throw new Error("Choose a supported category.");
  if (typeof body.id !== "string" || !/^[a-zA-Z0-9-]{16,80}$/.test(body.id))
    throw new Error("A valid submission ID is required.");
  return {
    id: body.id,
    content,
    area,
    city: body.city,
    category: body.category,
  };
}
const samples = [
  [
    "Infrastructure",
    "negative",
    "Potholes near the main junction make the road unsafe after rain.",
    "Gandhi Road",
  ],
  [
    "Water",
    "negative",
    "No water supply since this morning. Please check the pipeline.",
    "Anna Nagar",
  ],
  [
    "Waste",
    "negative",
    "Garbage has been left uncollected for three days near the market.",
    "Market Road",
  ],
  [
    "Transport",
    "neutral",
    "Requesting a bus stop closer to the public library.",
    "Station Road",
  ],
  [
    "Parks",
    "positive",
    "The park is beautiful after the cleanup. Thanks to the maintenance team!",
    "Central Park",
  ],
  [
    "Safety",
    "negative",
    "Broken streetlights make the school junction unsafe at night.",
    "School Road",
  ],
  [
    "Infrastructure",
    "positive",
    "The damaged footpath has been repaired. Much easier to walk now.",
    "Lake Road",
  ],
  [
    "Transport",
    "negative",
    "Bus services are delayed during the evening commute.",
    "Bus Terminal",
  ],
  [
    "Water",
    "positive",
    "Water supply restored after the repair. Thank you for the quick response.",
    "Nehru Street",
  ],
  [
    "Waste",
    "positive",
    "Our street is clean again after the new collection schedule.",
    "Temple Road",
  ],
  [
    "Safety",
    "neutral",
    "Requesting a pedestrian crossing near the community center.",
    "Cross Road",
  ],
  [
    "Other",
    "neutral",
    "Please share the opening hours of the local service center.",
    "Town Hall",
  ],
];
export function demoRecord(slot, timestamp) {
  const sample =
    samples[((slot % samples.length) + samples.length) % samples.length];
  const city = cities[Math.floor(Math.abs(slot) / 3) % cities.length];
  return {
    id: `demo-${slot}`,
    category: sample[0],
    sentiment: sample[1],
    content: sample[2],
    area: sample[3],
    city: city.name,
    source: "Demo simulator",
    demo: 1,
    created_at: timestamp,
    received_at: timestamp,
  };
}
export function csvCell(value) {
  const s = String(value ?? "");
  return `"${(/^[\s]*[=+@-]/.test(s) ? "'" : "") + s.replaceAll('"', '""')}"`;
}
