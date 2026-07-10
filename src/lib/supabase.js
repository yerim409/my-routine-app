import { createClient } from '@supabase/supabase-js'
import { createMockClient } from './supabaseMock'

// VITE_MOCK=1 이면 로그인 없이 인메모리 목으로 동작 (npm run dev:mock)
export const supabase = import.meta.env.VITE_MOCK
  ? createMockClient()
  : createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )
