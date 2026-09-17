import { render, screen } from '@testing-library/react';
import Dashboard from '@/app/dashboard/page';
import { ClientSessionProvider } from '@/app/dashboard/components/ClientSessionProvider';

describe('Web Dashboard', () => {
  function renderWithSession(role: string) {
    render(
      <ClientSessionProvider
        initial={{
          role,
          companyId: null,
          email: `${role}@construction-runner.com`,
          uid: '',
          impersonating: false,
          sessionStartedAt: null,
        }}
      >
        <Dashboard />
      </ClientSessionProvider>
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
