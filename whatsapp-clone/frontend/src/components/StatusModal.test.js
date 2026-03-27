import { render, screen, fireEvent } from '@testing-library/react';
import StatusModal from './StatusModal';

test('renders status modal with character count', () => {
  render(
    <StatusModal
      user={{ status: 'Hello there' }}
      token="token"
      onClose={() => {}}
      onStatusUpdated={() => {}}
    />
  );

  expect(screen.getByText('Edit Status')).toBeInTheDocument();
  const textarea = screen.getByRole('textbox');
  expect(textarea).toHaveValue('Hello there');
  expect(screen.getByText('11/140')).toBeInTheDocument();

  fireEvent.change(textarea, { target: { value: 'New status' } });
  expect(screen.getByText('10/140')).toBeInTheDocument();
});
