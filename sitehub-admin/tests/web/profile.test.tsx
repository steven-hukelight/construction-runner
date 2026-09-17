import { render, screen, fireEvent } from '@testing-library/react';
import ProfilePage from '@/app/dashboard/profile/page';
import { ClientSessionProvider } from '@/app/dashboard/components/ClientSessionProvider';

describe('Profile Management', () => {
  it('should allow editing profile', () => {
    render(
      <ClientSessionProvider
        initial={{
          role: 'user',
          companyId: null,
          email: 'user@construction-runner.com',
          uid: '',
          impersonating: false,
          sessionStartedAt: null,
        }}
      >
        <ProfilePage />
      </ClientSessionProvider>
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
