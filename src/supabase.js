import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aaucaykflrrwskpoupgr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhdWNheWtmbHJyd3NrcG91cGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc3MzI4NzAsImV4cCI6MjA0MzMwODg3MH0.a90gF0IdFK-3psnH4wum15RWSXTjvnFxGKRJIV4WWtQ'

export const supabase = createClient(supabaseUrl, supabaseKey)
