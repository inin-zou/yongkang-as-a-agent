import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ktdvafynhgszkmrgmeyk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0ZHZhZnluaGdzemttcmdtZXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzAwNjYsImV4cCI6MjA5MDgwNjA2Nn0.KhUrbaB6oh14V6l3PpmeCp_xp7XA5OsZ_ZCgODuhedw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
