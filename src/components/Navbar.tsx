
import React from 'react';
import { Bell, MessageSquare, Search, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Navbar = () => {
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-white">
      <div className="flex h-16 items-center px-4 md:px-6">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold text-city-blue">City</span>
            <span className="text-2xl font-bold text-city-teal">Pulse</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="search"
              placeholder="Search grievances..."
              className="rounded-md border border-gray-200 bg-white pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-city-blue"
            />
          </div>
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Button>
          <Button variant="ghost" size="icon">
            <MessageSquare className="h-5 w-5" />
            <span className="sr-only">Messages</span>
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
            <span className="sr-only">Settings</span>
          </Button>
          <Button className="bg-city-blue hover:bg-blue-700">Submit Grievance</Button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
