
import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, MessageSquare, Search, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GrievanceForm from './GrievanceForm';

const Navbar = () => {
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-white">
      <div className="flex h-16 items-center px-4 md:px-6">
        <Link to="/" className="flex items-center gap-1">
          <span className="text-2xl font-bold text-city-blue">City</span>
          <span className="text-2xl font-bold text-city-teal">Pulse</span>
        </Link>
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
          <GrievanceForm />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
