
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getGrievancesByCategory, categoryColors } from '@/data/mockData';

const CategoryChart: React.FC = () => {
  const data = getGrievancesByCategory();

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2">
        <CardTitle>Grievances by Category</CardTitle>
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
                    fill={categoryColors[entry.name as keyof typeof categoryColors] || '#6B7280'} 
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} grievances`, 'Count']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryChart;
