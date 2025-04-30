
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { fetchPlatformData } from '@/data/api';
import { mockSocialMediaPosts } from '@/data/socialMediaData';

const SocialMediaSources: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['platformData'],
    queryFn: fetchPlatformData,
    refetchInterval: 60000, // Refetch every minute
  });
  
  // If we're loading or have an error, calculate from mock data
  const twitterCount = data 
    ? data.find((item: any) => item.platform === 'Twitter')?.count || 0
    : mockSocialMediaPosts.filter(post => post.platform === 'Twitter').length;
    
  const facebookCount = data
    ? data.find((item: any) => item.platform === 'Facebook')?.count || 0
    : mockSocialMediaPosts.filter(post => post.platform === 'Facebook').length;
  
  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2">
        <CardTitle>Social Media Sources</CardTitle>
        {isLoading && <p className="text-xs text-gray-500">Refreshing data...</p>}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg">
            <span className="text-xl font-bold text-blue-500">Twitter</span>
            <span className="text-3xl font-bold mt-2">{twitterCount}</span>
            <span className="text-sm text-gray-500 mt-1">posts collected</span>
          </div>
          <div className="flex flex-col items-center justify-center p-4 bg-indigo-50 rounded-lg">
            <span className="text-xl font-bold text-indigo-600">Facebook</span>
            <span className="text-3xl font-bold mt-2">{facebookCount}</span>
            <span className="text-sm text-gray-500 mt-1">posts collected</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SocialMediaSources;
