import { render, screen, fireEvent } from '@testing-library/react';
import AlertModal from './AlertModal';
import { AlertConfig } from '../contexts/AlertContext';

describe('AlertModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('renders alert modal correctly', () => {
    const config: AlertConfig = {
      type: 'alert',
      message: 'Test alert message',
      alertType: 'info',
      confirmText: 'OK'
    };

    render(<AlertModal config={config} onClose={mockOnClose} />);

    expect(screen.getByText('Test alert message')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.queryByText('キャンセル')).not.toBeInTheDocument();
  });

  it('renders confirm modal correctly', () => {
    const config: AlertConfig = {
      type: 'confirm',
      message: 'Test confirm message',
      alertType: 'warning',
      confirmText: 'はい',
      cancelText: 'いいえ'
    };

    render(<AlertModal config={config} onClose={mockOnClose} />);

    expect(screen.getByText('Test confirm message')).toBeInTheDocument();
    expect(screen.getByText('はい')).toBeInTheDocument();
    expect(screen.getByText('いいえ')).toBeInTheDocument();
  });

  it('calls onClose with true when confirm button is clicked', () => {
    const config: AlertConfig = {
      type: 'confirm',
      message: 'Test message',
      confirmText: 'OK',
      cancelText: 'キャンセル'
    };

    render(<AlertModal config={config} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('OK'));
    expect(mockOnClose).toHaveBeenCalledWith(true);
  });

  it('calls onClose with false when cancel button is clicked', () => {
    const config: AlertConfig = {
      type: 'confirm',
      message: 'Test message',
      confirmText: 'OK',
      cancelText: 'キャンセル'
    };

    render(<AlertModal config={config} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('キャンセル'));
    expect(mockOnClose).toHaveBeenCalledWith(false);
  });

  it('calls onClose with false when ESC key is pressed', () => {
    const config: AlertConfig = {
      type: 'alert',
      message: 'Test message',
      confirmText: 'OK'
    };

    render(<AlertModal config={config} onClose={mockOnClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledWith(false);
  });

  it('displays correct icon and styling for error type', () => {
    const config: AlertConfig = {
      type: 'alert',
      message: 'Error message',
      alertType: 'error',
      confirmText: 'OK'
    };

    render(<AlertModal config={config} onClose={mockOnClose} />);

    const button = screen.getByText('OK');
    expect(button).toHaveClass('bg-red-600');
  });

  it('displays title when provided', () => {
    const config: AlertConfig = {
      type: 'alert',
      title: 'Test Title',
      message: 'Test message',
      confirmText: 'OK'
    };

    render(<AlertModal config={config} onClose={mockOnClose} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });
});