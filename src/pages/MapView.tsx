
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { mockGrievances, categoryColors } from '@/data/mockData';

const MapView: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Map View</h1>
        <p className="text-gray-500 mt-1">
          Geographic distribution of community grievances
        </p>
      </div>
      
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* In a real application, this would integrate with a mapping library like Mapbox, Leaflet, or Google Maps */}
          <div className="bg-city-gray h-[600px] w-full relative">
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <div className="text-2xl font-medium text-gray-500 mb-4">Interactive Map Placeholder</div>
              <p className="text-gray-500 max-w-md text-center">
                In a production environment, this would display an interactive map showing the 
                geographical distribution of grievances across the city.
              </p>
              
              {/* Mock Map Points */}
              {mockGrievances.map((grievance, index) => {
                // Create randomized positions for the demo
                const top = 30 + Math.random() * 400;
                const left = 30 + Math.random() * 700;
                const category = grievance.category;
                const color = categoryColors[category as keyof typeof categoryColors];
                
                return (
                  <div 
                    key={grievance.id}
                    className="absolute w-4 h-4 rounded-full animate-pulse-slow cursor-pointer"
                    style={{ 
                      top: `${top}px`, 
                      left: `${left}px`, 
                      backgroundColor: color 
                    }}
                    title={`${grievance.location.area}: ${grievance.content}`}
                  />
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="absolute bottom-4 right-4 bg-white p-3 rounded-md shadow-md">
              <p className="text-sm font-medium mb-2">Issue Categories</p>
              <div className="space-y-2">
                {Object.entries(categoryColors).map(([category, color]) => (
                  <div key={category} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs capitalize">{category}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MapView;
