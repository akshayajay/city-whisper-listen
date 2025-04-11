
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getSocialMediaCategories, categoryColors } from '@/data/socialMediaData';

const SocialCategoryChart: React.FC = () => {
  const data = getSocialMediaCategories();

  // Create a color map for our categories
  const getColor = (category: string) => {
    const normalizedCategory = category.toLowerCase();
    return categoryColors[normalizedCategory as keyof typeof categoryColors] || '#6B7280';
  };

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2">
        <CardTitle>Social Media Categories</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[300px] w-full">
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
              <Tooltip formatter={(value) => [`${value} posts`, 'Count']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default SocialCategoryChart;
