import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window === 'undefined') {
       // Return a dummy client during build to prevent crash
        return {
          auth: { 
            getUser: async () => ({ data: { user: null } }), 
            signOut: async () => {},
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) 
          },
          from: () => ({ 
            select: () => ({ 
              eq: () => ({ single: () => ({}), order: () => ({ limit: () => ({}) }) }), 
              order: () => ({ limit: () => ({}) }) 
            }),
            update: () => ({ eq: () => ({}) }),
            delete: () => ({ eq: () => ({}) }),
            insert: () => ({})
          }),
          channel: () => ({ on: () => ({ subscribe: () => {} }) }),
          removeChannel: () => {}
        }
    }

    console.error('Supabase configuration is missing!', {
      url: supabaseUrl ? 'Set' : 'Missing',
      key: supabaseAnonKey ? 'Set' : 'Missing'
    });
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
}
