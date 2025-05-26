import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HomeIcon, BookOpenIcon, ChatBubbleLeftIcon, UserIcon } from '@heroicons/react/24/outline';

interface LayoutProps {
  children: any;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-primary-50">
      {/* Header */}
      <header className="bg-white border-b border-primary-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="text-xl font-medium text-primary-900">
                  ChapterOne
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Navigation bar on bottom for mobile */}
      <nav className="bg-white border-t border-primary-200 fixed bottom-0 w-full z-10">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex justify-around h-16">
            <Link 
              to="/" 
              className={`flex flex-col items-center justify-center w-full ${
                isActive('/') 
                  ? 'text-primary-600' 
                  : 'text-primary-400 hover:text-primary-500'
              }`}
            >
              <HomeIcon className="h-6 w-6" />
              <span className="text-xs mt-1">Home</span>
            </Link>
            
            <Link 
              to="/books" 
              className={`flex flex-col items-center justify-center w-full ${
                isActive('/books') 
                  ? 'text-primary-600' 
                  : 'text-primary-400 hover:text-primary-500'
              }`}
            >
              <BookOpenIcon className="h-6 w-6" />
              <span className="text-xs mt-1">Books</span>
            </Link>

            <Link 
              to="/threads" 
              className={`flex flex-col items-center justify-center w-full ${
                isActive('/threads') 
                  ? 'text-primary-600' 
                  : 'text-primary-400 hover:text-primary-500'
              }`}
            >
              <ChatBubbleLeftIcon className="h-6 w-6" />
              <span className="text-xs mt-1">Discuss</span>
            </Link>

            <Link 
              to="/account" 
              className={`flex flex-col items-center justify-center w-full ${
                isActive('/account') 
                  ? 'text-primary-600' 
                  : 'text-primary-400 hover:text-primary-500'
              }`}
            >
              <UserIcon className="h-6 w-6" />
              <span className="text-xs mt-1">Account</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Extra padding to account for the fixed bottom nav */}
      <div className="h-16"></div>
    </div>
  );
}; 