
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
import { fetchDashboardSummary, fetchIngestionStatus, fetchSocialMediaPosts, SocialMediaPost } from '@/data/api';
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

  const { data: summary } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: fetchDashboardSummary,
    refetchInterval: 5000,
  });
  
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
    queryClient.invalidateQueries({ queryKey: ['sentimentBreakdown'] });
    queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    queryClient.invalidateQueries({ queryKey: ['ingestionStatus'] });
  }, [queryClient]);
  
  // Refresh all data
  const handleRefresh = () => {
    toast.info('Refreshing data...');
    queryClient.invalidateQueries({ queryKey: ['socialMediaPosts'] });
    queryClient.invalidateQueries({ queryKey: ['sentimentTrend'] });
    queryClient.invalidateQueries({ queryKey: ['socialCategories'] });
    queryClient.invalidateQueries({ queryKey: ['platformData'] });
    queryClient.invalidateQueries({ queryKey: ['sentimentBreakdown'] });
    queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
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
          title="Total Signals"
          value={summary?.total_signals ?? socialMediaCount}
          icon={<MessageSquare className="h-5 w-5" />}
          trend={undefined}
        />
        <StatCard
          title="Citizen Reports"
          value={summary?.citizen_reports ?? 0}
          icon={<BarChart3 className="h-5 w-5" />}
          trend={undefined}
        />
        <StatCard
          title="Social Posts"
          value={summary?.social_posts ?? socialMediaCount}
          icon={<Map className="h-5 w-5" />}
          trend={undefined}
        />
        <StatCard
          title="Negative Signals"
          value={summary?.negative_signals ?? 0}
          icon={<TrendingUp className="h-5 w-5" />}
          trend={undefined}
        />
        <StatCard
          title="Recent Feed"
          value={isLoading ? '...' : socialMediaCount}
          icon={<MessageSquare className="h-5 w-5" />}
          trend={undefined}
        />
        <StatCard
          title="Live Pipeline"
          value={liveMode}
          icon={<Radio className="h-5 w-5" />}
          trend={undefined}
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
