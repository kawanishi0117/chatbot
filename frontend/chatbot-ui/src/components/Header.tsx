import { LogOut, Menu, MessageSquare, Settings, User as UserIcon } from 'lucide-react';
import React, { useState } from 'react';
import { User } from '../types';
import ProfileEdit from './ProfileEdit';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  onUserUpdate?: (updatedUser: User) => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onToggleSidebar, isSidebarOpen, onUserUpdate }) => {
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  const handleUserUpdate = (updatedUser: User) => {
    if (onUserUpdate) {
      onUserUpdate(updatedUser);
    }
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          {/* 左側：ロゴとメニューボタン */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 hidden sm:block">ChatBot AI</h1>
            </div>
          </div>

          {/* 右側：ユーザー情報とメニュー */}
          <div className="flex items-center space-x-3">
            {/* ユーザー情報 */}
            <div className="hidden sm:flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            {/* メニューボタン */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setShowProfileEdit(true)}
                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Profile"
                title="プロファイル編集"
              >
                <UserIcon className="w-5 h-5 text-gray-600" />
              </button>
              
              <button
                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
              
              <button
                onClick={onLogout}
                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Logout"
              >
                <LogOut className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* プロファイル編集モーダル */}
      {showProfileEdit && (
        <ProfileEdit
          user={user}
          onClose={() => setShowProfileEdit(false)}
          onUpdate={handleUserUpdate}
        />
      )}
    </>
  );
};

export default Header;