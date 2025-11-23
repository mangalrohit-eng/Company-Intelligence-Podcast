/**
 * Main Navigation Component
 */

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Mic, Settings, User, Play, Menu, X, Radio, LogOut, ChevronDown, ChevronRight, Shield, Sun, Moon, Monitor } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { NotificationCenter } from './NotificationCenter';

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAdminExpanded, setIsAdminExpanded] = useState(false);
  
  const { user, loading, signOut } = useAuth();
  const { theme, resolvedTheme, toggleTheme } = useTheme();
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
      <nav 
        className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-secondary border-r border-border p-6 flex-col z-40"
        aria-label="Main navigation"
      >
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

        <div className="pt-6 border-t border-border space-y-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-border transition-all w-full min-h-[44px] touch-manipulation"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'} theme`}
            title={`Current: ${theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'}`}
          >
            {resolvedTheme === 'dark' ? (
              <Moon className="w-5 h-5 text-muted" aria-hidden="true" />
            ) : (
              <Sun className="w-5 h-5 text-muted" aria-hidden="true" />
            )}
            <span className="font-medium text-sm flex-1 text-left">
              {theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'}
            </span>
            {theme === 'system' && (
              <Monitor className="w-4 h-4 text-muted" aria-hidden="true" />
            )}
          </button>

          {isAuthenticated && user && (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-border transition-all w-full min-h-[44px] touch-manipulation"
                aria-label="User menu"
                aria-expanded={isUserMenuOpen}
              >
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-semibold">
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium truncate">{user.name || user.email.split('@')[0]}</div>
                  <div className="text-xs text-muted truncate">{user.email}</div>
                </div>
                <ChevronDown className="w-4 h-4 text-muted" aria-hidden="true" />
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
      <header 
        className="lg:hidden fixed top-0 left-0 right-0 h-14 sm:h-16 bg-secondary/95 backdrop-blur-sm border-b border-border px-3 sm:px-4 flex items-center justify-between z-50 safe-area-top"
        role="banner"
      >
        <Link 
          href="/" 
          className="flex items-center gap-1.5 sm:gap-2 min-h-[44px] min-w-[44px]"
          aria-label="Home"
        >
          <Radio className="w-5 h-5 sm:w-6 sm:h-6 text-primary" aria-hidden="true" />
          <h1 className="text-lg sm:text-xl font-bold text-primary">Podcast AI</h1>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated && <NotificationCenter />}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2.5 sm:p-3 hover:bg-border active:bg-border/60 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
            ) : (
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav 
        className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-secondary/95 backdrop-blur-sm border-t border-border z-50 safe-area-bottom"
        aria-label="Bottom navigation"
        role="navigation"
      >
        <div className="flex items-center justify-around h-full px-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] min-w-[44px] rounded-lg transition-colors touch-manipulation ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted active:text-foreground active:bg-border/20'
                }`}
                aria-label={link.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span className="text-[10px] sm:text-xs font-medium leading-tight">
                  {link.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40 mt-14 sm:mt-16"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <nav 
            className="lg:hidden fixed top-14 sm:top-16 right-0 w-72 sm:w-80 h-[calc(100vh-3.5rem-4rem)] sm:h-[calc(100vh-4rem-4rem)] bg-secondary border-l border-border p-4 sm:p-6 z-40 shadow-xl animate-in slide-in-from-right duration-200 flex flex-col overflow-y-auto"
            aria-label="Mobile menu"
            role="navigation"
          >
            <ul className="space-y-2 flex-1">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;

                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all min-h-[44px] touch-manipulation ${
                        isActive
                          ? 'bg-primary/20 text-primary'
                          : 'text-muted active:text-foreground active:bg-border'
                      }`}
                      aria-label={link.label}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="w-5 h-5" aria-hidden="true" />
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
            <div className="pt-6 border-t border-border space-y-2">
              {/* Theme Toggle for Mobile */}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-border active:bg-border/60 transition-all w-full min-h-[44px] touch-manipulation"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'} theme`}
              >
                {resolvedTheme === 'dark' ? (
                  <Moon className="w-5 h-5 text-muted" aria-hidden="true" />
                ) : (
                  <Sun className="w-5 h-5 text-muted" aria-hidden="true" />
                )}
                <span className="font-medium text-sm flex-1 text-left">
                  Theme: {theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'}
                </span>
                {theme === 'system' && (
                  <Monitor className="w-4 h-4 text-muted" aria-hidden="true" />
                )}
              </button>

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
                    className="w-full gap-2 text-red-500 hover:text-red-500 hover:bg-red-500/10 min-h-[44px]"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
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

