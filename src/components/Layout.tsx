
import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import GrievanceForm from './GrievanceForm';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </div>
      </div>
      <div className="fixed bottom-6 right-6 z-20">
        <GrievanceForm />
      </div>
    </div>
  );
};

export default Layout;
