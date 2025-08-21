-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('admin', 'teacher', 'student');

-- Create enum for question types
CREATE TYPE public.question_type AS ENUM ('multiple_choice', 'true_false', 'open_answer', 'matching');

-- Create enum for exam status
CREATE TYPE public.exam_status AS ENUM ('draft', 'active', 'inactive', 'completed');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exams table
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  access_code TEXT NOT NULL UNIQUE,
  time_limit INTEGER, -- in minutes
  max_attempts INTEGER DEFAULT 1,
  status exam_status NOT NULL DEFAULT 'draft',
  show_results_immediately BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create questions table
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type question_type NOT NULL,
  points DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  order_index INTEGER NOT NULL,
  options JSONB, -- for multiple choice options
  correct_answer JSONB, -- stores correct answers
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exam_attempts table
CREATE TABLE public.exam_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  score DECIMAL(5,2),
  total_points DECIMAL(5,2),
  attempt_number INTEGER NOT NULL DEFAULT 1,
  UNIQUE(exam_id, student_id, attempt_number)
);

-- Create answers table
CREATE TABLE public.answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  answer_value JSONB NOT NULL,
  is_correct BOOLEAN,
  points_earned DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(attempt_id, question_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for exams
CREATE POLICY "Teachers can manage their exams" ON public.exams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND (role = 'teacher' OR role = 'admin')
      AND user_id = creator_id
    )
  );

CREATE POLICY "Students can view active exams" ON public.exams
  FOR SELECT USING (status = 'active');

-- RLS Policies for questions
CREATE POLICY "Teachers can manage questions for their exams" ON public.questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.exams e
      JOIN public.profiles p ON e.creator_id = p.user_id
      WHERE e.id = exam_id 
      AND p.user_id = auth.uid()
      AND (p.role = 'teacher' OR p.role = 'admin')
    )
  );

CREATE POLICY "Students can view questions during exam" ON public.questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.exams e
      WHERE e.id = exam_id AND e.status = 'active'
    )
  );

-- RLS Policies for exam_attempts
CREATE POLICY "Students can manage their own attempts" ON public.exam_attempts
  FOR ALL USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view attempts for their exams" ON public.exam_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.exams e
      JOIN public.profiles p ON e.creator_id = p.user_id
      WHERE e.id = exam_id 
      AND p.user_id = auth.uid()
      AND (p.role = 'teacher' OR p.role = 'admin')
    )
  );

-- RLS Policies for answers
CREATE POLICY "Students can manage their own answers" ON public.answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.exam_attempts ea
      WHERE ea.id = attempt_id AND ea.student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view answers for their exams" ON public.answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.exam_attempts ea
      JOIN public.exams e ON ea.exam_id = e.id
      JOIN public.profiles p ON e.creator_id = p.user_id
      WHERE ea.id = attempt_id
      AND p.user_id = auth.uid()
      AND (p.role = 'teacher' OR p.role = 'admin')
    )
  );

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to generate unique access codes
CREATE OR REPLACE FUNCTION public.generate_access_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_code BOOLEAN;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM public.exams WHERE access_code = code) INTO exists_code;
    EXIT WHEN NOT exists_code;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updating timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exams_updated_at
  BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();