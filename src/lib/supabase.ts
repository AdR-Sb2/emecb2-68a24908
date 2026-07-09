import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://byxmnmebvqdxpzcuutak.supabase.co";

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5eG1ubWVidnFkeHB6Y3V1dGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NjM0OTAsImV4cCI6MjA5OTEzOTQ5MH0.TUDk4MlKXsrWz6VufIdQkoFH7RGwezgKSFeZ6nMwyQI";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
