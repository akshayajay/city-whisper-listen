
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { mockGrievances, categoryColors } from '@/data/mockData';

const MapView: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tamil Nadu Grievance Map</h1>
        <p className="text-gray-500 mt-1">
          Geographic distribution of community grievances across Tamil Nadu
        </p>
      </div>
      
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* In a real application, this would integrate with a mapping library like Mapbox, Leaflet, or Google Maps */}
          <div className="bg-city-gray h-[600px] w-full relative">
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <div className="text-2xl font-medium text-gray-500 mb-4">Tamil Nadu Interactive Map</div>
              <p className="text-gray-500 max-w-md text-center">
                In a production environment, this would display an interactive map showing the 
                geographical distribution of grievances across Tamil Nadu.
              </p>
              
              {/* Tamil Nadu Map Outline */}
              <div className="relative w-[350px] h-[400px] mt-4 border-2 border-city-blue rounded-lg">
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-sm font-medium text-city-blue">
                  Tamil Nadu
                </div>
                
                {/* Mock Map Points */}
                {mockGrievances.map((grievance, index) => {
                  // Create positions based on Tamil Nadu's geography (approximate)
                  // Normalize coordinates to fit our mock map container
                  const minLat = 8.0; // Southern tip of Tamil Nadu
                  const maxLat = 13.5; // Northern border
                  const minLng = 76.0; // Western border
                  const maxLng = 80.5; // Eastern coast
                  
                  const normalizedTop = ((maxLat - grievance.location.latitude) / (maxLat - minLat)) * 350;
                  const normalizedLeft = ((grievance.location.longitude - minLng) / (maxLng - minLng)) * 300;
                  
                  const category = grievance.category;
                  const color = categoryColors[category as keyof typeof categoryColors];
                  
                  return (
                    <div 
                      key={grievance.id}
                      className="absolute w-4 h-4 rounded-full animate-pulse-slow cursor-pointer"
                      style={{ 
                        top: `${normalizedTop}px`, 
                        left: `${normalizedLeft}px`, 
                        backgroundColor: color 
                      }}
                      title={`${grievance.location.area}: ${grievance.content}`}
                    />
                  );
                })}
                
                {/* Major Cities Labels */}
                <div className="absolute text-[10px] font-semibold" style={{ top: '60px', left: '230px' }}>Chennai</div>
                <div className="absolute text-[10px] font-semibold" style={{ top: '120px', left: '70px' }}>Coimbatore</div>
                <div className="absolute text-[10px] font-semibold" style={{ top: '240px', left: '180px' }}>Madurai</div>
                <div className="absolute text-[10px] font-semibold" style={{ top: '150px', left: '180px' }}>Trichy</div>
                <div className="absolute text-[10px] font-semibold" style={{ top: '100px', left: '150px' }}>Salem</div>
              </div>
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
