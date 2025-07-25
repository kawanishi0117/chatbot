import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { api } from '../services/api';
import { User } from '../types';
import ProfileEdit from './ProfileEdit';

// APIをモック
jest.mock('../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('ProfileEdit', () => {
  const mockUser: User = {
    id: 'user123',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  const mockOnClose = jest.fn();
  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders profile edit form with current user data', () => {
    render(
      <ProfileEdit
        user={mockUser}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByDisplayValue('admin@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Admin User')).toBeInTheDocument();
    expect(screen.getByText('プロファイル編集')).toBeInTheDocument();
  });

  it('closes modal when close button is clicked', () => {
    render(
      <ProfileEdit
        user={mockUser}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('closes modal when cancel button is clicked', () => {
    render(
      <ProfileEdit
        user={mockUser}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    fireEvent.click(screen.getByText('キャンセル'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('validates email format', async () => {
    render(
      <ProfileEdit
        user={mockUser}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    const emailInput = screen.getByDisplayValue('admin@example.com');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(screen.getByText('保存'));

    await waitFor(() => {
      expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
    });
  });

  it('validates required name field', async () => {
    render(
      <ProfileEdit
        user={mockUser}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    const nameInput = screen.getByDisplayValue('Admin User');
    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.click(screen.getByText('保存'));

    await waitFor(() => {
      expect(screen.getByText('名前は必須です')).toBeInTheDocument();
    });
  });

  it('validates password length', async () => {
    render(
      <ProfileEdit
        user={mockUser}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    const passwordInput = screen.getByPlaceholderText('新しいパスワード');
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.click(screen.getByText('保存'));

    await waitFor(() => {
      expect(screen.getByText('パスワードは6文字以上で入力してください')).toBeInTheDocument();
    });
  });

  it('validates password confirmation', async () => {
    render(
      <ProfileEdit
        user={mockUser}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    const passwordInput = screen.getByPlaceholderText('新しいパスワード');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // パスワード確認フィールドが表示されるまで待つ
    await waitFor(() => {
      expect(screen.getByPlaceholderText('パスワードを再入力')).toBeInTheDocument();
    });

    const confirmPasswordInput = screen.getByPlaceholderText('パスワードを再入力');
    fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } });
    fireEvent.click(screen.getByText('保存'));

    await waitFor(() => {
      expect(screen.getByText('パスワードが一致しません')).toBeInTheDocument();
    });
  });

  it('successfully updates profile with name change', async () => {
    const updatedUserResponse = {
      userId: 'user123',
      email: 'admin@example.com',
      name: 'Updated Admin',
      role: 'admin',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    mockedApi.updateProfile.mockResolvedValue(updatedUserResponse);

    render(
      <ProfileEdit
        user={mockUser}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    const nameInput = screen.getByDisplayValue('Admin User');
    fireEvent.change(nameInput, { target: { value: 'Updated Admin' } });
    fireEvent.click(screen.getByText('保存'));

    await waitFor(() => {
      expect(mockedApi.updateProfile).toHaveBeenCalledWith({
        name: 'Updated Admin'
      });
      expect(mockOnUpdate).toHaveBeenCalledWith({
        id: 'user123',
        email: 'admin@example.com',
        name: 'Updated Admin',
        role: 'admin',
        createdAt: new Date(updatedUserResponse.createdAt).toISOString(),
        updatedAt: new Date(updatedUserResponse.updatedAt).toISOString()
      });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('successfully updates profile with email change', async () => {
    const updatedUserResponse = {
      userId: 'user123',
      email: 'newadmin@example.com',
      name: 'Admin User',
      role: 'admin',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    mockedApi.updateProfile.mockResolvedValue(updatedUserResponse);

    render(
      <ProfileEdit
        user={mockUser}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    const emailInput = screen.getByDisplayValue('admin@example.com');
    fireEvent.change(emailInput, { target: { value: 'newadmin@example.com' } });
    fireEvent.click(screen.getByText('保存'));

    await waitFor(() => {
      expect(mockedApi.updateProfile).toHaveBeenCalledWith({
        email: 'newadmin@example.com'
      });
      expect(mockOnUpdate).toHaveBeenCalledWith({
        id: 'user123',
        email: 'newadmin@example.com',
        name: 'Admin User',
        role: 'admin',
        createdAt: new Date(updatedUserResponse.createdAt).toISOString(),
        updatedAt: new Date(updatedUserResponse.updatedAt).toISOString()
      });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('successfully updates profile with password change', async () => {
    const updatedUserResponse = {
      userId: 'user123',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    mockedApi.updateProfile.mockResolvedValue(updatedUserResponse);

    render(
      <ProfileEdit
        user={mockUser}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    const passwordInput = screen.getByPlaceholderText('新しいパスワード');
    fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });

    // パスワード確認フィールドが表示されるまで待つ
    await waitFor(() => {
      expect(screen.getByPlaceholderText('パスワードを再入力')).toBeInTheDocument();
    });

    const confirmPasswordInput = screen.getByPlaceholderText('パスワードを再入力');
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
    fireEvent.click(screen.getByText('保存'));

    await waitFor(() => {
      expect(mockedApi.updateProfile).toHaveBeenCalledWith({
        password: 'newpassword123'
      });
      expect(mockOnUpdate).toHaveBeenCalledWith({
        id: 'user123',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        createdAt: new Date(updatedUserResponse.createdAt).toISOString(),
        updatedAt: new Date(updatedUserResponse.updatedAt).toISOString()
      });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('handles API error gracefully', async () => {
    mockedApi.updateProfile.mockRejectedValue(new Error('Update failed'));

    render(
      <ProfileEdit
        user={mockUser}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    const nameInput = screen.getByDisplayValue('Admin User');
    fireEvent.change(nameInput, { target: { value: 'Updated Admin' } });
    fireEvent.click(screen.getByText('保存'));

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });

    expect(mockOnUpdate).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('closes modal without API call when no changes are made', async () => {
    render(
      <ProfileEdit
        user={mockUser}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    fireEvent.click(screen.getByText('保存'));

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    expect(mockedApi.updateProfile).not.toHaveBeenCalled();
    expect(mockOnUpdate).not.toHaveBeenCalled();
  });

  it('shows loading state during API call', async () => {
    // API呼び出しを遅延させる
    mockedApi.updateProfile.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        userId: 'user123',
        email: 'admin@example.com',
        name: 'Updated Admin',
        role: 'admin',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }), 100))
    );

    render(
      <ProfileEdit
        user={mockUser}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    const nameInput = screen.getByDisplayValue('Admin User');
    fireEvent.change(nameInput, { target: { value: 'Updated Admin' } });
    fireEvent.click(screen.getByText('保存'));

    // ローディング状態を確認
    expect(screen.getByRole('button', { name: /保存/ })).toBeDisabled();

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('toggles password visibility', () => {
    render(
      <ProfileEdit
        user={mockUser}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    const passwordInput = screen.getByPlaceholderText('新しいパスワード');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // パスワード表示切り替えボタンをクリック
    const toggleButtons = screen.getAllByRole('button');
    const passwordToggle = toggleButtons.find(button => 
      button.querySelector('svg') && button.getAttribute('type') === 'button'
    );

    if (passwordToggle) {
      fireEvent.click(passwordToggle);
      expect(passwordInput).toHaveAttribute('type', 'text');

      fireEvent.click(passwordToggle);
      expect(passwordInput).toHaveAttribute('type', 'password');
    }
  });
});