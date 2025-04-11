
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, BarChart3, MapPin, MessageSquare } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-city-lightBlue flex flex-col">
      {/* Header/Navbar */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1">
            <span className="text-2xl font-bold text-city-blue">City</span>
            <span className="text-2xl font-bold text-city-teal">Pulse</span>
          </Link>
          <div className="flex gap-4">
            <Link to="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <Link to="/map">
              <Button variant="ghost">Map</Button>
            </Link>
            <Link to="/dashboard">
              <Button className="bg-city-blue hover:bg-blue-700">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 flex flex-col items-center text-center">
        <h1 className="text-4xl md:text-6xl font-bold max-w-4xl">
          Turn Social Media Chatter into 
          <span className="text-city-blue"> Actionable Insights</span>
        </h1>
        <p className="mt-6 text-xl text-gray-600 max-w-2xl">
          CityPulse analyzes tweets, posts, and other social media to identify what needs improvement in your city, helping officials make data-driven decisions.
        </p>
        <div className="mt-8 flex gap-4 flex-wrap justify-center">
          <Link to="/dashboard">
            <Button className="bg-city-blue hover:bg-blue-700 text-lg px-6 py-6">
              Explore Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link to="/map">
            <Button variant="outline" className="text-lg px-6 py-6">
              View Map Data
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How CityPulse Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-white shadow-sm">
            <div className="h-14 w-14 rounded-full bg-city-lightBlue flex items-center justify-center mb-4">
              <MessageSquare className="h-7 w-7 text-city-blue" />
            </div>
            <h3 className="text-xl font-medium mb-2">Listens to Social Media</h3>
            <p className="text-gray-500">
              Automatically collects and processes public social media posts mentioning your city's infrastructure, services, and amenities.
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-white shadow-sm">
            <div className="h-14 w-14 rounded-full bg-city-lightBlue flex items-center justify-center mb-4">
              <BarChart3 className="h-7 w-7 text-city-blue" />
            </div>
            <h3 className="text-xl font-medium mb-2">Analyzes Sentiment</h3>
            <p className="text-gray-500">
              Using advanced AI to categorize complaints, identify trends, and determine the sentiment behind citizen feedback.
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-white shadow-sm">
            <div className="h-14 w-14 rounded-full bg-city-lightBlue flex items-center justify-center mb-4">
              <MapPin className="h-7 w-7 text-city-blue" />
            </div>
            <h3 className="text-xl font-medium mb-2">Maps Problem Areas</h3>
            <p className="text-gray-500">
              Visualizes data geographically to highlight hotspots and help prioritize resources where they're needed most.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-city-blue text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to transform your city's feedback system?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join progressive municipalities using data-driven approaches to improve citizen satisfaction.
          </p>
          <Link to="/dashboard">
            <Button className="bg-white text-city-blue hover:bg-gray-100 text-lg px-8 py-6">
              Get Started Today
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-1">
              <span className="text-xl font-bold text-white">City</span>
              <span className="text-xl font-bold text-city-teal">Pulse</span>
            </div>
          </div>
          <div className="text-center text-sm">
            <p>© {new Date().getFullYear()} CityPulse. All rights reserved.</p>
            <p className="mt-2">A smart city solution for community feedback analysis.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
