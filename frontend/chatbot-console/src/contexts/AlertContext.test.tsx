import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlertProvider, useAlert } from './AlertContext';

// Test component that uses the useAlert hook
const TestComponent = () => {
  const { showAlert, showConfirm } = useAlert();

  const handleShowAlert = async () => {
    await showAlert('Test alert message', 'info');
  };

  const handleShowConfirm = async () => {
    const result = await showConfirm('Test confirm message');
    console.log('Confirm result:', result);
  };

  return (
    <div>
      <button onClick={handleShowAlert}>Show Alert</button>
      <button onClick={handleShowConfirm}>Show Confirm</button>
    </div>
  );
};

describe('AlertContext', () => {
  it('throws error when useAlert is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAlert must be used within an AlertProvider');
    
    consoleSpy.mockRestore();
  });

  it('provides alert functionality when wrapped with AlertProvider', async () => {
    render(
      <AlertProvider>
        <TestComponent />
      </AlertProvider>
    );

    const alertButton = screen.getByText('Show Alert');
    fireEvent.click(alertButton);

    await waitFor(() => {
      expect(screen.getByText('Test alert message')).toBeInTheDocument();
    });

    // Close the alert
    const okButton = screen.getByText('OK');
    fireEvent.click(okButton);

    await waitFor(() => {
      expect(screen.queryByText('Test alert message')).not.toBeInTheDocument();
    });
  });

  it('provides confirm functionality when wrapped with AlertProvider', async () => {
    render(
      <AlertProvider>
        <TestComponent />
      </AlertProvider>
    );

    const confirmButton = screen.getByText('Show Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Test confirm message')).toBeInTheDocument();
    });

    // Check that both OK and Cancel buttons are present
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getByText('キャンセル')).toBeInTheDocument();

    // Close the confirm dialog
    const okButton = screen.getByText('OK');
    fireEvent.click(okButton);

    await waitFor(() => {
      expect(screen.queryByText('Test confirm message')).not.toBeInTheDocument();
    });
  });
});