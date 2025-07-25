import { ChevronDown, Key, LogOut, Menu, MessageSquare, Settings, User as UserIcon } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { User } from '../types';
import PasswordEdit from './PasswordEdit';
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
  const [showPasswordEdit, setShowPasswordEdit] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleUserUpdate = (updatedUser: User) => {
    if (onUserUpdate) {
      onUserUpdate(updatedUser);
    }
  };

  const handlePasswordSuccess = () => {
    // パスワード変更成功時の処理（必要に応じて）
    console.log('パスワードが正常に変更されました');
  };

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
              {/* ユーザーメニュードロップダウン */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-1 p-2 rounded-md hover:bg-gray-100 transition-colors"
                  aria-label="User menu"
                >
                  <UserIcon className="w-5 h-5 text-gray-600" />
                  <ChevronDown className="w-3 h-3 text-gray-600" />
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 py-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <button
                      onClick={() => {
                        setShowProfileEdit(true);
                        setShowUserMenu(false);
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <UserIcon className="w-4 h-4" />
                      <span>プロファイル編集</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowPasswordEdit(true);
                        setShowUserMenu(false);
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <Key className="w-4 h-4" />
                      <span>パスワード変更</span>
                    </button>
                  </div>
                )}
              </div>
              
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

      {/* パスワード変更モーダル */}
      {showPasswordEdit && (
        <PasswordEdit
          onClose={() => setShowPasswordEdit(false)}
          onSuccess={handlePasswordSuccess}
        />
      )}
    </>
  );
};

export default Header;