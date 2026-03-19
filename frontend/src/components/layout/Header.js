import { Menu, Bell, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

const Header = ({ onMenuClick, title }) => {
  return (
    <header 
      className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20"
      data-testid="header"
    >
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          data-testid="btn-mobile-menu"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Page title */}
        {title && (
          <h1 className="text-lg font-semibold text-slate-900" data-testid="page-title">
            {title}
          </h1>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Search - hidden on mobile */}
        <div className="hidden md:block relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-64 pl-9 h-9 bg-slate-50 border-slate-200"
            data-testid="input-search"
          />
        </div>

        {/* Notifications */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          data-testid="btn-notifications"
        >
          <Bell className="w-5 h-5 text-slate-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </Button>
      </div>
    </header>
  );
};

export default Header;
