import { render, screen, fireEvent } from '@testing-library/react';
import ProfilePage from '@/app/dashboard/profile/page';
import { SessionProvider } from 'next-auth/react';

describe('Profile Management', () => {
  it('should allow editing profile', () => {
    const session = {
      user: { email: 'user@sitehub.com', name: 'User', role: 'user' },
      expires: '2099-01-01T00:00:00.000Z',
    };
    render(
      <SessionProvider session={session as any}>
        <ProfilePage />
      </SessionProvider>
    );
    // Simulate editing name
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    expect((nameInput as HTMLInputElement).value).toBe('New Name');
    // Simulate save (if button exists)
    const saveBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveBtn);
    // TODO: Assert update (mock API or check UI feedback)
  });
});
