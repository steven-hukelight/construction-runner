import { render, screen } from '@testing-library/react';
import Dashboard from '@/app/dashboard/page';
import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';

describe('Web Dashboard', () => {
  function renderWithSession(role: string) {
    const session: Session = {
      user: {
        email: `${role}@construction-runner.com`,
        name: role.charAt(0).toUpperCase() + role.slice(1),
        role,
      },
      expires: '2099-01-01T00:00:00.000Z',
    };
    render(
      <SessionProvider session={session}>
        <Dashboard />
      </SessionProvider>
    );
  }

  it('should load dashboard for admin', () => {
    renderWithSession('admin');
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/admin/i)).toBeInTheDocument();
  });
  it('should load dashboard for supervisor', () => {
    renderWithSession('supervisor');
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/supervisor/i)).toBeInTheDocument();
  });
});
