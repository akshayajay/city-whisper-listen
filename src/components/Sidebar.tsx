
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Map, PieChart, ListTodo, Users, TrendingUp, MessageSquare, Twitter, Facebook } from 'lucide-react';
import { cn } from '@/lib/utils';

type SidebarItemProps = {
  icon: React.ReactNode;
  label: string;
  path: string;
  active?: boolean;
};

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, path, active }) => {
  return (
    <Link to={path}>
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-city-blue",
          active && "bg-city-lightBlue text-city-blue"
        )}
      >
        {icon}
        <span className="font-medium">{label}</span>
      </div>
    </Link>
  );
};

const Sidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const currentHash = location.hash;
  
  return (
    <div className="hidden border-r bg-white lg:block">
      <div className="flex h-full flex-col gap-2 p-4">
        <div className="py-4">
          <h4 className="mb-4 px-2 text-sm font-medium uppercase tracking-wider text-gray-500">
            Insights
          </h4>
          <div className="space-y-1">
            <SidebarItem 
              icon={<BarChart3 className="h-5 w-5" />} 
              label="Dashboard" 
              path="/dashboard"
              active={currentPath === '/dashboard' && !currentHash} 
            />
            <SidebarItem 
              icon={<Map className="h-5 w-5" />} 
              label="Map View" 
              path="/map"
              active={currentPath === '/map'} 
            />
            <SidebarItem 
              icon={<PieChart className="h-5 w-5" />} 
              label="Analytics" 
              path="/dashboard#cross-analytics" 
              active={currentHash === '#cross-analytics'}
            />
            <SidebarItem 
              icon={<TrendingUp className="h-5 w-5" />} 
              label="Sentiment Trends" 
              path="/dashboard#trends" 
              active={currentHash === '#trends'}
            />
          </div>
        </div>
        <div className="py-4">
          <h4 className="mb-4 px-2 text-sm font-medium uppercase tracking-wider text-gray-500">
            Data Sources
          </h4>
          <div className="space-y-1">
            <SidebarItem 
              icon={<Twitter className="h-5 w-5 text-blue-500" />} 
              label="Twitter Data" 
              path="/dashboard?source=Twitter#sources" 
              active={location.search.includes('source=Twitter')}
            />
            <SidebarItem 
              icon={<Facebook className="h-5 w-5 text-blue-600" />} 
              label="Facebook Data" 
              path="/dashboard?source=Facebook#sources" 
              active={location.search.includes('source=Facebook')}
            />
          </div>
        </div>
        <div className="py-4">
          <h4 className="mb-4 px-2 text-sm font-medium uppercase tracking-wider text-gray-500">
            Management
          </h4>
          <div className="space-y-1">
            <SidebarItem 
              icon={<MessageSquare className="h-5 w-5" />} 
              label="Grievances" 
              path="/dashboard#live" 
              active={currentHash === '#live'}
            />
            <SidebarItem 
              icon={<ListTodo className="h-5 w-5" />} 
              label="Tasks" 
              path="/dashboard#queue" 
              active={currentHash === '#queue'}
            />
            <SidebarItem 
              icon={<Users className="h-5 w-5" />} 
              label="Users" 
              path="/dashboard#sources" 
              active={currentHash === '#sources'}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
