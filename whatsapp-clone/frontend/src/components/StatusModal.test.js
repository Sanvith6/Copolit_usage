import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
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

test('saves status updates', async () => {
  const onClose = jest.fn();
  const onStatusUpdated = jest.fn();
  axios.put.mockResolvedValueOnce({
    data: { user: { id: 'user-1', status: 'Updated status' } }
  });

  render(
    <StatusModal
      user={{ status: 'Old status' }}
      token="token"
      onClose={onClose}
      onStatusUpdated={onStatusUpdated}
    />
  );

  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Updated status' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  await waitFor(() => expect(onStatusUpdated).toHaveBeenCalledWith({ id: 'user-1', status: 'Updated status' }));
  expect(onClose).toHaveBeenCalled();
});
