import { createClient } from '@supabase/supabase-js'

// Публичные значения (защищены правилами доступа в базе), их можно хранить в коде
export const supabase = createClient(
  'https://lpjeumxpeqqbfpxmzlhl.supabase.co',
  'sb_publishable_qaq_f1slvfEcZBQG8hvwVw_qXfFwD1z',
  { auth: { persistSession: true, autoRefreshToken: true } },
)
