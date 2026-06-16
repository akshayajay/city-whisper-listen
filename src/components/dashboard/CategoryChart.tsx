
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { categoryColors } from '@/data/mockData';
import { fetchCategoryData } from '@/data/api';
import { useQuery } from '@tanstack/react-query';

const CategoryChart: React.FC = () => {
  const { data = [], isLoading } = useQuery({
    queryKey: ['socialCategories'],
    queryFn: fetchCategoryData,
    refetchInterval: 30000,
  });

  const getColor = (category: string) => {
    const normalizedCategory = category.toLowerCase();
    return categoryColors[normalizedCategory as keyof typeof categoryColors] || '#6B7280';
  };

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2">
        <CardTitle>Issue Categories</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[300px] w-full">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-gray-500">Loading categories...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getColor(entry.name)} 
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} signals`, 'Count']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryChart;
