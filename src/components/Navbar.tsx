
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, MessageSquare, Search, Settings, Twitter, Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { fetchIngestionStatus, fetchMessageQueue, fetchNotifications } from '@/data/api';

const Navbar = () => {
  const navigate = useNavigate();
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 10000,
  });
  const { data: messageQueue = [] } = useQuery({
    queryKey: ['messageQueue'],
    queryFn: () => fetchMessageQueue(5),
    refetchInterval: 10000,
  });
  const { data: ingestionStatus } = useQuery({
    queryKey: ['ingestionStatus'],
    queryFn: fetchIngestionStatus,
    refetchInterval: 5000,
  });

  const handleSearch = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const value = event.currentTarget.value.trim();
      if (!value) {
        toast.info('Enter a search term first');
        return;
      }

      navigate(`/dashboard?search=${encodeURIComponent(value)}#live`);
      toast.success(`Showing live civic signals for "${value}"`);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-white">
      <div className="flex h-16 items-center px-4 md:px-6">
        <Link to="/" className="flex items-center gap-1">
          <span className="text-2xl font-bold text-city-blue">City</span>
          <span className="text-2xl font-bold text-city-teal">Pulse</span>
        </Link>
        <div className="ml-4 flex items-center gap-1">
          <div className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded-full">
            <Twitter size={12} className="text-blue-500" />
            <span className="text-gray-600">Connected</span>
          </div>
          <div className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded-full">
            <Facebook size={12} className="text-blue-600" />
            <span className="text-gray-600">Connected</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="search"
              placeholder="Search grievances..."
              onKeyDown={handleSearch}
              className="rounded-md border border-gray-200 bg-white pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-city-blue"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.map((notification) => (
                <DropdownMenuItem key={`${notification.title}-${notification.detail}`} className="flex-col items-start gap-1 whitespace-normal">
                  <span className="font-medium">{notification.title}</span>
                  <span className="text-xs text-muted-foreground">{notification.detail}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MessageSquare className="h-5 w-5" />
                <span className="sr-only">Messages</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Message Queue</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {messageQueue.length ? messageQueue.map((message) => (
                <DropdownMenuItem
                  key={message.id}
                  className="flex-col items-start gap-1 whitespace-normal"
                  onSelect={() => navigate(`/dashboard?search=${encodeURIComponent(message.location || message.category || '')}#live`)}
                >
                  <span className="font-medium">{message.title}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">{message.detail}</span>
                </DropdownMenuItem>
              )) : (
                <DropdownMenuItem>No priority messages right now</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Dashboard Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => toast.success(`Realtime refresh is ${ingestionStatus?.running ? 'enabled' : 'offline'}`)}>
                Realtime refresh {ingestionStatus?.running ? 'enabled' : 'offline'}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => toast.info(`Current source mode: ${ingestionStatus?.mode || 'unknown'}`)}>
                Source mode: {ingestionStatus?.mode || 'unknown'}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => toast.info(ingestionStatus?.twitter_configured ? 'Twitter credentials are configured' : 'Add Twitter/API credentials in backend environment variables')}>
                Credentials: {ingestionStatus?.twitter_configured ? 'configured' : 'needed for real APIs'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link to="/dashboard">
            <Button variant="default">View Dashboard</Button>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
