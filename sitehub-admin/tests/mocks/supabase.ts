/**
 * Mock Supabase client for unit tests.
 * Used when tests import from @/lib/supabase or @/lib/supabaseClient.
 * Avoids live API calls; provides select/insert/update, auth.getUser(), storage, realtime.
 *
 * Regression tests can push responses via mockSupabaseResponseQueue.
 */

export const mockSupabaseResponseQueue: { data: unknown; error: Error | null }[] = [];

function popResponse(): { data: unknown; error: Error | null } {
  if (mockSupabaseResponseQueue.length > 0) {
    return mockSupabaseResponseQueue.shift()!;
  }
  return { data: [] as unknown[], error: null as Error | null };
}

const createChain = () => ({
  select: () => createChain(),
  insert: () => createChain(),
  upsert: () => createChain(),
  update: () => createChain(),
  delete: () => createChain(),
  eq: () => createChain(),
  neq: () => createChain(),
  in: () => createChain(),
  not: () => createChain(),
  is: () => createChain(),
  order: () => createChain(),
  limit: () => createChain(),
  range: () => createChain(),
  onConflict: () => createChain(),
  single: () => Promise.resolve(popResponse()),
  maybeSingle: () => Promise.resolve(popResponse()),
  then: (res: (r: { data: unknown; error: Error | null }) => void) =>
    Promise.resolve(popResponse()).then(res),
});

function createMockClient() {
  const client = {
    from: (_table: string) => createChain(),

    auth: {
      getUser: () =>
        Promise.resolve({
          data: {
            user: {
              id: "mock-user-id",
              email: "test@example.com",
              user_metadata: { company_id: "mock-company-id", role: "admin" },
            },
          },
          error: null,
        }),
      getSession: () =>
        Promise.resolve({
          data: { session: { access_token: "mock-token", user: { id: "mock-user-id" } } },
          error: null,
        }),
      signInWithPassword: () =>
        Promise.resolve({ data: { user: null, session: null }, error: null }),
      signUp: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },

    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: { path: "mock-path" }, error: null }),
        createSignedUrl: () => Promise.resolve({ data: { signedUrl: "https://mock.url/signed", path: "mock-path" }, error: null }),
        download: () => Promise.resolve({ data: null, error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://mock.url/${path}` } }),
      }),
    },

    channel: () => {
      const builder = {
        on: () => builder,
        subscribe: () => ({ unsubscribe: () => {} }),
      };
      return builder;
    },
  };

  return client;
}

export function createClient(_url: string, _key?: string) {
  return createMockClient();
}

/** Mock supabase singleton - matches @/lib/supabaseClient export */
export const supabase = createMockClient();

/** Mock supabaseAdmin - matches @/lib/supabaseAdmin export (same interface) */
export const supabaseAdmin = createMockClient();
