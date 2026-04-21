'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, LogOut, Home, BarChart3, Upload, Users, Settings } from 'lucide-react';

interface HeaderProps {
  user?: {
    name: string;
    email: string;
    role: string;
  };
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const isActive = (path: string) => pathname === path;

  const navItems = [
    { href: '/dashboard', label: '대시보드', icon: Home, show: ['first_evaluator', 'second_evaluator', 'ceo', 'admin'] },
    { href: '/grades', label: '등급 분포', icon: BarChart3, show: ['second_evaluator', 'ceo', 'admin'] },
    { href: '/admin', label: '관리', icon: Settings, show: ['admin'] },
  ];

  const visibleNavItems = navItems.filter((item) =>
    user ? item.show.includes(user.role) : false
  );

  return (
    <header className="bg-primary text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="font-bold text-xl">
              비버웍스 인사평가
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition ${
                    isActive(item.href)
                      ? 'bg-secondary'
                      : 'hover:bg-secondary hover:bg-opacity-50'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="flex items-center space-x-4">
            {user && (
              <>
                <div className="hidden sm:block text-sm">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-gray-300 text-xs">{user.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-3 py-2 rounded-md hover:bg-secondary transition"
                >
                  <LogOut size={18} />
                  <span className="hidden sm:inline">로그아웃</span>
                </button>
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden pb-4 space-y-2">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm ${
                    isActive(item.href)
                      ? 'bg-secondary'
                      : 'hover:bg-secondary hover:bg-opacity-50'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
