/**
 * Main Navigation Component
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Mic, Settings, User, Play } from 'lucide-react';

export function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/podcasts', label: 'Podcasts', icon: Mic },
    { href: '/test-pipeline', label: 'Test Pipeline', icon: Play },
    { href: '/admin', label: 'Admin', icon: Settings },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed left-0 top-0 h-screen w-64 bg-secondary border-r border-border p-6">
      <Link href="/" className="block mb-8">
        <h1 className="text-2xl font-bold text-primary">Podcast AI</h1>
      </Link>

      <ul className="space-y-2">
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
      </ul>
    </nav>
  );
}

