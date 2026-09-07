import { render, screen, fireEvent } from '@testing-library/react';
import ProfilePage from '@/app/dashboard/profile/page';
import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';

describe('Profile Management', () => {
  it('should allow editing profile', () => {
    const session: Session = {
      user: { email: 'user@construction-runner.com', name: 'User', role: 'user' },
      expires: '2099-01-01T00:00:00.000Z',
    };
    render(
      <SessionProvider session={session}>
        <ProfilePage />
      </SessionProvider>
    );
    // Simulate editing name
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    expect((nameInput as HTMLInputElement).value).toBe('New Name');
    // Simulate save (no API mocked; ensure click is wired)
    const saveBtn = screen.getByRole('button', { name: /save/i });
    expect(() => fireEvent.click(saveBtn)).not.toThrow();
  });
});
