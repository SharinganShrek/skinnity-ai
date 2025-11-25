'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white/80 backdrop-blur-sm shadow-2xl border border-emerald-100/50 p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-emerald-900 mb-2">
            🌿 Get Started
          </h1>
          <p className="text-emerald-700">Create your skincare advisor account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailSignup} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-emerald-900 mb-1">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-900 placeholder:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-emerald-900 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-900 placeholder:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-emerald-900 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-900 placeholder:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="••••••••"
            />
            <p className="mt-1 text-xs text-emerald-600">Minimum 6 characters</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-medium text-white transition-all hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-emerald-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white/80 text-emerald-600">Or continue with</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignup}
          disabled={loading}
          className="w-full rounded-xl border border-emerald-200 bg-white px-6 py-3 text-sm font-medium text-emerald-900 transition-all hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign up with Google
        </button>

        <p className="mt-6 text-center text-sm text-emerald-700">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-emerald-600 hover:text-emerald-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

