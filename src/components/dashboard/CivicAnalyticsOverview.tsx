import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchAnalyticsOverview } from '@/data/api';
import { sentimentColors } from '@/data/mockData';

const sourceColors: Record<string, string> = {
  Twitter: '#1D9BF0',
  Facebook: '#4267B2',
  'Citizen Portal': '#10B981',
};

const formatName = (value: string) => value.replace(/-/g, ' ');

const CivicAnalyticsOverview: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['analyticsOverview'],
    queryFn: fetchAnalyticsOverview,
    refetchInterval: 30000,
  });

  const issueSourceKeys = useMemo(() => {
    const keys = new Set<string>();
    data?.issue_source_matrix.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (key !== 'name' && key !== 'total') {
          keys.add(key);
        }
      });
    });
    return Array.from(keys);
  }, [data?.issue_source_matrix]);

  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader className="pb-2">
          <CardTitle>Civic Analytics Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[280px] items-center justify-center text-gray-500">
            Loading civic analytics...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="col-span-full">
        <CardHeader className="pb-2">
          <CardTitle>Civic Analytics Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[280px] items-center justify-center text-gray-500">
            Analytics backend unavailable
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Issue Category by Sentiment</CardTitle>
          <Badge variant="outline">{data.total_signals} signals</Badge>
        </CardHeader>
        <CardContent>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.category_sentiment} margin={{ left: 10, right: 18 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tickFormatter={formatName} tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip labelFormatter={(label) => formatName(String(label))} />
                <Legend />
                <Bar dataKey="positive" stackId="sentiment" fill={sentimentColors.positive} />
                <Bar dataKey="neutral" stackId="sentiment" fill={sentimentColors.neutral} />
                <Bar dataKey="negative" stackId="sentiment" fill={sentimentColors.negative} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Source by Sentiment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.source_sentiment} layout="vertical" margin={{ left: 22, right: 18 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="positive" stackId="sentiment" fill={sentimentColors.positive} />
                <Bar dataKey="neutral" stackId="sentiment" fill={sentimentColors.neutral} />
                <Bar dataKey="negative" stackId="sentiment" fill={sentimentColors.negative} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Location Risk Ranking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.location_sentiment.slice(0, 8).map((location) => {
              const riskScore = location.negative * 3 + location.neutral * 2 + location.positive;
              const negativeShare = location.total ? Math.round((location.negative / location.total) * 100) : 0;

              return (
                <div key={location.name} className="rounded-md border p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{location.name}</p>
                      <p className="text-xs text-gray-500">{location.total} total signals</p>
                    </div>
                    <Badge variant={negativeShare > 20 ? 'destructive' : 'outline'}>
                      {riskScore} risk
                    </Badge>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full bg-red-500"
                      style={{ width: `${Math.min(100, negativeShare)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">{negativeShare}% negative share</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Issue Mix by Source</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.issue_source_matrix} margin={{ left: 10, right: 18 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tickFormatter={formatName} tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip labelFormatter={(label) => formatName(String(label))} />
                <Legend />
                {issueSourceKeys.map((source, index) => (
                  <Bar
                    key={source}
                    dataKey={source}
                    stackId="source"
                    fill={sourceColors[source] || ['#64748B', '#0F766E', '#7C3AED'][index % 3]}
                  >
                    {data.issue_source_matrix.map((row) => (
                      <Cell key={`${source}-${row.name}`} />
                    ))}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CivicAnalyticsOverview;
