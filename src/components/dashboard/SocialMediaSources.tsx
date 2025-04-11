
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mockSocialMediaPosts } from '@/data/socialMediaData';

const SocialMediaSources: React.FC = () => {
  // Count posts by platform
  const twitterCount = mockSocialMediaPosts.filter(post => post.platform === 'Twitter').length;
  const facebookCount = mockSocialMediaPosts.filter(post => post.platform === 'Facebook').length;
  
  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2">
        <CardTitle>Social Media Sources</CardTitle>
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
