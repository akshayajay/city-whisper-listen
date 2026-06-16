
import React, { useCallback } from 'react';
import {
  BarChart3,
  MessageSquare,
  Map,
  TrendingUp,
  RefreshCw,
  Radio
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatCard from '@/components/dashboard/StatCard';
import CategoryChart from '@/components/dashboard/CategoryChart';
import SentimentChart from '@/components/dashboard/SentimentChart';
import TrendingIssues from '@/components/dashboard/TrendingIssues';
import RecentActivity from '@/components/dashboard/RecentActivity';
import SentimentTrendChart from '@/components/dashboard/SentimentTrendChart';
import SocialMediaSources from '@/components/dashboard/SocialMediaSources';
import SocialCategoryChart from '@/components/dashboard/SocialCategoryChart';
import LiveUpdates from '@/components/dashboard/LiveUpdates';
import { mockGrievances } from '@/data/mockData';
import { fetchIngestionStatus, fetchSocialMediaPosts, SocialMediaPost } from '@/data/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  
  // Fetch social media posts
  const { data: socialMediaPosts, isLoading } = useQuery({
    queryKey: ['socialMediaPosts'],
    queryFn: () => fetchSocialMediaPosts({ limit: 50 }),
    refetchInterval: 30000,
  });

  const { data: ingestionStatus } = useQuery({
    queryKey: ['ingestionStatus'],
    queryFn: fetchIngestionStatus,
    refetchInterval: 5000,
  });
  
  // Calculate stats from data
  const totalGrievances = mockGrievances.length;
  const resolvedCount = 3; // This would come from real data
  const pendingCount = totalGrievances - resolvedCount;
  const trendingCount = mockGrievances.filter(g => g.upvotes > 20).length;
  const socialMediaCount = socialMediaPosts?.length || 0;
  const liveMode = ingestionStatus?.running
    ? `${ingestionStatus.mode === 'twitter' ? 'Twitter' : 'Demo'} live`
    : 'Offline';

  const handleLivePosts = useCallback((posts: SocialMediaPost[]) => {
    queryClient.setQueryData<SocialMediaPost[]>(['socialMediaPosts'], (current = []) => {
      const existingIds = new Set(current.map((post) => String(post.id)));
      const uniquePosts = posts.filter((post) => !existingIds.has(String(post.id)));
      return [...uniquePosts, ...current].slice(0, 50);
    });

    queryClient.invalidateQueries({ queryKey: ['sentimentTrend'] });
    queryClient.invalidateQueries({ queryKey: ['socialCategories'] });
    queryClient.invalidateQueries({ queryKey: ['platformData'] });
    queryClient.invalidateQueries({ queryKey: ['ingestionStatus'] });
  }, [queryClient]);
  
  // Refresh all data
  const handleRefresh = () => {
    toast.info('Refreshing data...');
    queryClient.invalidateQueries({ queryKey: ['socialMediaPosts'] });
    queryClient.invalidateQueries({ queryKey: ['sentimentTrend'] });
    queryClient.invalidateQueries({ queryKey: ['socialCategories'] });
    queryClient.invalidateQueries({ queryKey: ['platformData'] });
    queryClient.invalidateQueries({ queryKey: ['ingestionStatus'] });
  };
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Monitor and analyze community grievances and social media sentiment in Tamil Nadu
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Data
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Grievances"
          value={totalGrievances}
          icon={<MessageSquare className="h-5 w-5" />}
          trend={{ value: 12, isUpward: true }}
        />
        <StatCard
          title="Pending Resolution"
          value={pendingCount}
          icon={<BarChart3 className="h-5 w-5" />}
          trend={{ value: 5, isUpward: true }}
        />
        <StatCard
          title="Resolved Issues"
          value={resolvedCount}
          icon={<Map className="h-5 w-5" />}
          trend={{ value: 8, isUpward: true }}
        />
        <StatCard
          title="Trending Issues"
          value={trendingCount}
          icon={<TrendingUp className="h-5 w-5" />}
          trend={{ value: 14, isUpward: true }}
        />
        <StatCard
          title="Social Media Data"
          value={isLoading ? '...' : socialMediaCount}
          icon={<MessageSquare className="h-5 w-5" />}
          trend={isLoading ? undefined : { value: 23, isUpward: true }}
        />
        <StatCard
          title="Live Pipeline"
          value={liveMode}
          icon={<Radio className="h-5 w-5" />}
          trend={ingestionStatus?.last_post_count ? { value: ingestionStatus.last_post_count, isUpward: true } : undefined}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TrendingIssues />
        <LiveUpdates onPostsReceived={handleLivePosts} />
        <SocialMediaSources />
      </div>
      
      <SentimentTrendChart />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CategoryChart />
        <SentimentChart />
        <SocialCategoryChart />
      </div>
    </div>
  );
};

export default Dashboard;
