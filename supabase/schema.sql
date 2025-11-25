-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Skin analysis table
CREATE TABLE IF NOT EXISTS public.skin_analysis (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  age INTEGER,
  skin_type TEXT CHECK (skin_type IN ('oily', 'neutral', 'dry')),
  sensitivity TEXT CHECK (sensitivity IN ('sensitive', 'neutral', 'not_sensitive')),
  firmness DECIMAL(3,1) CHECK (firmness >= 0 AND firmness <= 10),
  radiance DECIMAL(3,1) CHECK (radiance >= 0 AND radiance <= 10),
  dark_spots DECIMAL(3,1) CHECK (dark_spots >= 0 AND dark_spots <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Chat history table
CREATE TABLE IF NOT EXISTS public.chat_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_skin_analysis_user_id ON public.skin_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_skin_analysis_created_at ON public.skin_analysis(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON public.chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON public.chat_history(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skin_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for skin_analysis
CREATE POLICY "Users can view their own skin analysis"
  ON public.skin_analysis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own skin analysis"
  ON public.skin_analysis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own skin analysis"
  ON public.skin_analysis FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for chat_history
CREATE POLICY "Users can view their own chat history"
  ON public.chat_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat history"
  ON public.chat_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

