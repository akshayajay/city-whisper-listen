
import React from 'react';
import {
  BarChart3,
  MessageSquare,
  Map,
  TrendingUp,
} from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import CategoryChart from '@/components/dashboard/CategoryChart';
import SentimentChart from '@/components/dashboard/SentimentChart';
import TrendingIssues from '@/components/dashboard/TrendingIssues';
import RecentActivity from '@/components/dashboard/RecentActivity';
import SentimentTrendChart from '@/components/dashboard/SentimentTrendChart';
import SocialMediaSources from '@/components/dashboard/SocialMediaSources';
import SocialCategoryChart from '@/components/dashboard/SocialCategoryChart';
import { mockGrievances } from '@/data/mockData';
import { mockSocialMediaPosts } from '@/data/socialMediaData';

const Dashboard: React.FC = () => {
  // Calculate stats from mock data
  const totalGrievances = mockGrievances.length;
  const resolvedCount = 3; // This would come from real data
  const pendingCount = totalGrievances - resolvedCount;
  const trendingCount = mockGrievances.filter(g => g.upvotes > 20).length;
  const socialMediaCount = mockSocialMediaPosts.length;
  
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Monitor and analyze community grievances and social media sentiment in Tamil Nadu
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
          value={socialMediaCount}
          icon={<MessageSquare className="h-5 w-5" />}
          trend={{ value: 23, isUpward: true }}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TrendingIssues />
        <RecentActivity />
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
