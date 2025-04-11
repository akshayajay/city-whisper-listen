
import React, { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    isUpward: boolean;
  };
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, className }) => {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
            {trend && (
              <div className="flex items-center mt-2">
                <span className={cn(
                  "text-xs font-medium",
                  trend.isUpward ? "text-green-600" : "text-red-600"
                )}>
                  {trend.isUpward ? "+" : "-"}{trend.value}%
                </span>
                <span className="text-xs text-gray-500 ml-1">from last week</span>
              </div>
            )}
          </div>
          {icon && (
            <div className="h-12 w-12 rounded-full bg-city-lightBlue flex items-center justify-center text-city-blue">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
