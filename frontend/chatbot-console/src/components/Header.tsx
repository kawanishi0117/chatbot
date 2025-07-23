import { Bell, LogOut, Menu, Settings, User } from 'lucide-react';
import React from 'react';
import { User as UserType } from '../types';

interface HeaderProps {
  user: UserType | null;
  onLogout: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  onToggleSidebar,
  isSidebarOpen: _isSidebarOpen
}) => {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* 左側: ロゴとメニューボタン */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-gray-900">ChatBot Console</h1>
              <p className="text-xs text-gray-500">管理者ダッシュボード</p>
            </div>
          </div>
        </div>

        {/* 右側: 通知とユーザーメニュー */}
        <div className="flex items-center space-x-4">
          {/* 通知ベル */}
          <button className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* ユーザーメニュー */}
          <div className="flex items-center space-x-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-900">
                {user?.name || user?.email || 'Admin User'}
              </p>
              <p className="text-xs text-gray-500 capitalize">{user?.role || 'admin'}</p>
            </div>
            
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
              <User className="w-4 h-4 text-white" />
            </div>

            <button
              onClick={onLogout}
              className="p-2 rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="ログアウト"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;