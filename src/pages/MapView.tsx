import React, { useMemo, useState } from 'react';
import { Activity, AlertTriangle, Layers, MapPin, RefreshCw } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { categoryColors, sentimentColors } from '@/data/mockData';
import { fetchGeoAnalytics, GeoHotspot } from '@/data/api';

const TN_BOUNDS = {
  minLatitude: 8.0,
  maxLatitude: 13.5,
  minLongitude: 76.0,
  maxLongitude: 80.5,
};

const formatCategory = (value: string) => value.replace(/-/g, ' ');

const categoryColor = (category: string) => {
  const normalized = category.toLowerCase();
  return categoryColors[normalized as keyof typeof categoryColors] || '#64748B';
};

const hotspotPosition = (hotspot: GeoHotspot) => {
  const top = ((TN_BOUNDS.maxLatitude - hotspot.latitude) / (TN_BOUNDS.maxLatitude - TN_BOUNDS.minLatitude)) * 100;
  const left = ((hotspot.longitude - TN_BOUNDS.minLongitude) / (TN_BOUNDS.maxLongitude - TN_BOUNDS.minLongitude)) * 100;
  return {
    top: `${Math.min(92, Math.max(8, top))}%`,
    left: `${Math.min(92, Math.max(8, left))}%`,
  };
};

const MapView: React.FC = () => {
  const [category, setCategory] = useState('all');
  const [sentiment, setSentiment] = useState('all');
  const [platform, setPlatform] = useState('all');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['geoAnalytics', category, sentiment, platform],
    queryFn: () => fetchGeoAnalytics({ category, sentiment, platform, limit: 14 }),
    refetchInterval: 10000,
  });

  const hotspots = useMemo(() => data?.hotspots || [], [data?.hotspots]);
  const maxUrgency = useMemo(
    () => Math.max(1, ...hotspots.map((hotspot) => hotspot.urgency_score)),
    [hotspots],
  );

  const topBars = hotspots.slice(0, 8).map((hotspot) => ({
    name: hotspot.location,
    total: hotspot.total,
    negative: hotspot.negative,
    urgency: hotspot.urgency_score,
    category: hotspot.dominant_category,
  }));

  const latestPosts = hotspots.flatMap((hotspot) =>
    hotspot.recent_posts.map((post) => ({
      ...post,
      hotspot: hotspot.location,
    })),
  ).slice(0, 6);

  const mapStatus = isLoading ? 'Loading live geo intelligence...' : `${data?.mapped_signals || 0} mapped signals`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tamil Nadu Civic Signal Map</h1>
          <p className="text-gray-500 mt-1">
            Live geographic intelligence for citizen grievances and social sentiment
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:flex md:items-center">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full md:w-[170px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="water">Water</SelectItem>
              <SelectItem value="waste">Waste</SelectItem>
              <SelectItem value="transportation">Transportation</SelectItem>
              <SelectItem value="infrastructure">Infrastructure</SelectItem>
              <SelectItem value="safety">Safety</SelectItem>
              <SelectItem value="education">Education</SelectItem>
              <SelectItem value="parks">Parks</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sentiment} onValueChange={setSentiment}>
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="Sentiment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sentiment</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="positive">Positive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="w-full md:w-[160px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="Twitter">Twitter</SelectItem>
              <SelectItem value="Facebook">Facebook</SelectItem>
              <SelectItem value="Citizen Portal">Citizen Portal</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-md bg-city-lightBlue p-3 text-city-blue">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Signals</p>
              <p className="text-2xl font-bold">{data?.total_signals ?? '-'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-md bg-emerald-50 p-3 text-emerald-600">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Mapped Signals</p>
              <p className="text-2xl font-bold">{data?.mapped_signals ?? '-'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-md bg-red-50 p-3 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Negative Signals</p>
              <p className="text-2xl font-bold">{data?.negative_signals ?? '-'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-md bg-violet-50 p-3 text-violet-600">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Hotspots</p>
              <p className="text-2xl font-bold">{hotspots.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.9fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Live Hotspot Map</CardTitle>
            <Badge variant="outline">{mapStatus}</Badge>
          </CardHeader>
          <CardContent>
            <div className="relative min-h-[560px] overflow-hidden rounded-md border bg-slate-50">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.16)_1px,transparent_1px),linear-gradient(0deg,rgba(148,163,184,0.16)_1px,transparent_1px)] bg-[size:44px_44px]" />
              <div className="absolute left-[18%] top-[6%] h-[88%] w-[56%] rounded-[48%_35%_42%_38%] border-2 border-city-blue/50 bg-white shadow-inner" />
              <div className="absolute left-[47%] top-[2%] h-[86%] w-[36%] rounded-[42%_60%_50%_36%] border-2 border-city-blue/40 bg-cyan-50/70" />
              <div className="absolute bottom-0 right-0 h-full w-28 bg-sky-100/80" />
              <div className="absolute right-4 top-4 rounded-md bg-white/90 px-3 py-2 text-xs font-medium text-slate-600 shadow">
                Bay of Bengal
              </div>
              <div className="absolute left-5 top-5 rounded-md bg-white/90 px-3 py-2 text-sm font-semibold text-city-blue shadow">
                Tamil Nadu
              </div>

              {hotspots.map((hotspot) => {
                const size = 18 + Math.round((hotspot.urgency_score / maxUrgency) * 42);
                const color = categoryColor(hotspot.dominant_category);
                const position = hotspotPosition(hotspot);

                return (
                  <div
                    key={`${hotspot.location}-${hotspot.latitude}-${hotspot.longitude}`}
                    className="group absolute -translate-x-1/2 -translate-y-1/2"
                    style={position}
                  >
                    <div
                      className="flex cursor-pointer items-center justify-center rounded-full border-2 border-white font-bold text-white shadow-lg transition-transform hover:scale-110"
                      style={{ width: size, height: size, backgroundColor: color }}
                      title={`${hotspot.location}: ${hotspot.total} signals, urgency ${hotspot.urgency_score}`}
                    >
                      {hotspot.total}
                    </div>
                    <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-64 -translate-x-1/2 rounded-md border bg-white p-3 text-xs shadow-lg group-hover:block">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900">{hotspot.location}</span>
                        <Badge variant="outline">{hotspot.urgency_score}</Badge>
                      </div>
                      <p className="text-slate-600">
                        {hotspot.total} signals, {hotspot.negative} negative, dominant issue: {formatCategory(hotspot.dominant_category)}
                      </p>
                    </div>
                  </div>
                );
              })}

              <div className="absolute bottom-4 left-4 rounded-md bg-white/95 p-3 shadow">
                <p className="mb-2 text-sm font-medium">Category color</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {data?.category_totals.slice(0, 8).map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: categoryColor(item.name) }} />
                      <span className="text-xs capitalize">{formatCategory(item.name)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Highest Urgency Areas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {hotspots.slice(0, 6).map((hotspot) => (
                  <div key={`${hotspot.location}-${hotspot.urgency_score}`} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{hotspot.location}</p>
                        <p className="text-xs text-gray-500">
                          {hotspot.total} signals from {hotspot.top_source}
                        </p>
                      </div>
                      <Badge className="bg-city-teal hover:bg-city-teal">
                        {hotspot.urgency_score}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline" className="capitalize">{formatCategory(hotspot.dominant_category)}</Badge>
                      <Badge variant="outline">{hotspot.negative} negative</Badge>
                      <Badge variant="outline">{hotspot.positive} positive</Badge>
                    </div>
                  </div>
                ))}
                {!hotspots.length && (
                  <div className="rounded-md border p-4 text-sm text-gray-500">
                    No mapped civic signals match these filters.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Recent Mapped Signals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {latestPosts.map((post) => (
                  <div key={post.id} className="rounded-md border p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <Badge variant="outline">{post.hotspot}</Badge>
                      <span className="text-xs text-gray-500">{post.platform}</span>
                    </div>
                    <p className="line-clamp-2 text-sm">{post.content}</p>
                  </div>
                ))}
                {!latestPosts.length && (
                  <div className="rounded-md border p-4 text-sm text-gray-500">
                    No recent mapped posts for the selected filters.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Hotspot Volume vs Urgency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topBars} margin={{ left: 12, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" name="Signals" radius={[4, 4, 0, 0]}>
                    {topBars.map((entry) => (
                      <Cell key={`total-${entry.name}`} fill={categoryColor(entry.category)} />
                    ))}
                  </Bar>
                  <Bar dataKey="urgency" name="Urgency score" fill="#0F766E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Sentiment by Selected Geography</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {(data?.sentiment_totals || []).map((item) => (
                <div key={item.name} className="rounded-md border p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: sentimentColors[item.name as keyof typeof sentimentColors] || '#64748B' }}
                    />
                    <span className="text-sm font-medium capitalize">{item.name}</span>
                  </div>
                  <p className="text-3xl font-bold">{item.value}</p>
                  <p className="mt-1 text-xs text-gray-500">signals in current filter</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MapView;
