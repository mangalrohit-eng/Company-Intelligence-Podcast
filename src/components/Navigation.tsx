/**
 * Main Navigation Component
 */

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Mic, Settings, User, Play, Menu, X, Radio, LogOut, ChevronDown, ChevronRight, Shield } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationCenter } from './NotificationCenter';

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAdminExpanded, setIsAdminExpanded] = useState(false);
  
  const { user, loading, signOut } = useAuth();
  const isAuthenticated = !!user;

  const links = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/podcasts', label: 'Podcasts', icon: Mic },
    { href: '/settings', label: 'Settings', icon: User },
  ];

  const adminLinks = [
    { href: '/admin/settings', label: 'Admin Settings', icon: Settings },
    { href: '/test-pipeline', label: 'Test Pipeline', icon: Play },
  ];

  const handleLogout = async () => {
    try {
      await signOut();
      setIsUserMenuOpen(false);
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Don't render navigation sidebar if user is not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-secondary border-r border-border p-6 flex-col z-40">
        <Link href="/" className="block mb-8">
          <div className="flex items-center gap-2">
            <Radio className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-primary">Podcast AI</h1>
          </div>
        </Link>

        <ul className="space-y-2 flex-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted hover:text-foreground hover:bg-border'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{link.label}</span>
                </Link>
              </li>
            );
          })}
          
          {/* Admin Section */}
          <li>
            <button
              onClick={() => setIsAdminExpanded(!isAdminExpanded)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                pathname.startsWith('/admin') || pathname === '/test-pipeline'
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted hover:text-foreground hover:bg-border'
              }`}
            >
              <Shield className="w-5 h-5" />
              <span className="font-medium flex-1 text-left">Admin</span>
              {isAdminExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            
            {isAdminExpanded && (
              <ul className="mt-1 ml-4 space-y-1">
                {adminLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;

                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm ${
                          isActive
                            ? 'bg-primary/20 text-primary'
                            : 'text-muted hover:text-foreground hover:bg-border'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="font-medium">{link.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        </ul>

        <div className="pt-6 border-t border-border">
          {isAuthenticated && user && (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-border transition-all w-full"
              >
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-semibold">
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium truncate">{user.name || user.email.split('@')[0]}</div>
                  <div className="text-xs text-muted truncate">{user.email}</div>
                </div>
                <ChevronDown className="w-4 h-4 text-muted" />
              </button>
              
              {isUserMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-secondary border border-border rounded-lg shadow-lg z-20 overflow-hidden">
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-border transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                    <div className="border-t border-border" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-red-500/10 text-red-500 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 sm:h-16 bg-secondary border-b border-border px-3 sm:px-4 flex items-center justify-between z-50">
        <Link href="/" className="flex items-center gap-1.5 sm:gap-2">
          <Radio className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          <h1 className="text-lg sm:text-xl font-bold text-primary">Podcast AI</h1>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {isAuthenticated && <NotificationCenter />}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 sm:p-2 hover:bg-border rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40 mt-16"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <nav className="lg:hidden fixed top-16 right-0 w-72 sm:w-80 h-[calc(100vh-4rem)] bg-secondary border-l border-border p-4 sm:p-6 z-40 shadow-xl animate-in slide-in-from-right duration-200 flex flex-col overflow-y-auto">
            <ul className="space-y-2 flex-1">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;

                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        isActive
                          ? 'bg-primary/20 text-primary'
                          : 'text-muted hover:text-foreground hover:bg-border'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{link.label}</span>
                    </Link>
                  </li>
                );
              })}
              
              {/* Admin Section */}
              <li>
                <button
                  onClick={() => setIsAdminExpanded(!isAdminExpanded)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    pathname.startsWith('/admin') || pathname === '/test-pipeline'
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted hover:text-foreground hover:bg-border'
                  }`}
                >
                  <Shield className="w-5 h-5" />
                  <span className="font-medium flex-1 text-left">Admin</span>
                  {isAdminExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                
                {isAdminExpanded && (
                  <ul className="mt-1 ml-4 space-y-1">
                    {adminLinks.map((link) => {
                      const Icon = link.icon;
                      const isActive = pathname === link.href;

                      return (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm ${
                              isActive
                                ? 'bg-primary/20 text-primary'
                                : 'text-muted hover:text-foreground hover:bg-border'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="font-medium">{link.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            </ul>
            
            {/* Mobile User Menu */}
            <div className="pt-6 border-t border-border">
              {isAuthenticated && user && (
                <div>
                  <div className="flex items-center gap-3 px-4 py-3 mb-2">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-semibold">
                      {(user.name || user.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium truncate">{user.name || user.email.split('@')[0]}</div>
                      <div className="text-xs text-muted truncate">{user.email}</div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full gap-2 text-red-500 hover:text-red-500 hover:bg-red-500/10"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </Button>
                </div>
              )}
            </div>
          </nav>
        </>
      )}
    </>
  );
}

