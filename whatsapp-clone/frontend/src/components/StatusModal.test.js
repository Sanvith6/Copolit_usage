jest.mock('axios');

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

  expect(axios.put).toHaveBeenCalledWith(
    'http://localhost:5000/api/auth/status',
    { status: 'Updated status' },
    { headers: { Authorization: 'Bearer token' } }
  );
  await waitFor(() => expect(onStatusUpdated).toHaveBeenCalledWith({ id: 'user-1', status: 'Updated status' }));
  expect(onClose).toHaveBeenCalled();
});

test('skips status update when unchanged', async () => {
  const onClose = jest.fn();

  render(
    <StatusModal
      user={{ status: 'Same status' }}
      token="token"
      onClose={onClose}
      onStatusUpdated={() => {}}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(axios.put).not.toHaveBeenCalled();
});

test('shows an error when status update fails', async () => {
  axios.put.mockRejectedValueOnce({ response: { data: { message: 'Update failed' } } });

  render(
    <StatusModal
      user={{ status: 'Old status' }}
      token="token"
      onClose={() => {}}
      onStatusUpdated={() => {}}
    />
  );

  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New status' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(await screen.findByText('Update failed')).toBeInTheDocument();
});

test('shows fallback error when response lacks message', async () => {
  axios.put.mockRejectedValueOnce({});

  render(
    <StatusModal
      user={{ status: 'Old status' }}
      token="token"
      onClose={() => {}}
      onStatusUpdated={() => {}}
    />
  );

  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New status' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(await screen.findByText('Failed to update status')).toBeInTheDocument();
});
