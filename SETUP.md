# Setup Instructions

## 1. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://imaizkeskfpldvivrcvm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Optional: Site URL (for OAuth callbacks)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### How to get your Supabase keys:
1. Go to your Supabase project dashboard
2. Navigate to **Settings** > **API**
3. Copy the **Project URL** (this is your `NEXT_PUBLIC_SUPABASE_URL`)
4. Copy the **anon/public** key (this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

## 2. Database Setup

Run the SQL schema in your Supabase SQL Editor:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/schema.sql`
4. Click **Run** to execute the SQL

This will create:
- `user_profiles` table
- `skin_analysis` table
- `chat_history` table
- Row Level Security (RLS) policies
- Triggers for automatic profile creation

## 3. Google OAuth Setup (Optional but Recommended)

To enable Google sign-in:

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **Providers**
3. Enable **Google**
4. Add your Google OAuth credentials:
   - **Client ID** (from Google Cloud Console)
   - **Client Secret** (from Google Cloud Console)
5. Add authorized redirect URLs:
   - `http://localhost:3000/auth/callback` (for local development)
   - `https://yourdomain.com/auth/callback` (for production)

### Getting Google OAuth Credentials:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable **Google+ API**
4. Go to **Credentials** > **Create Credentials** > **OAuth 2.0 Client ID**
5. Configure the consent screen
6. Create OAuth client ID for **Web application**
7. Add authorized redirect URIs:
   - `https://imaizkeskfpldvivrcvm.supabase.co/auth/v1/callback`
8. Copy the **Client ID** and **Client Secret**

## 4. Install Dependencies

```bash
npm install
```

## 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 6. First Time Setup Flow

1. **Sign Up/Login**: Create an account or sign in with Google
2. **Upload Photo**: Upload a clear face photo (max 10MB)
3. **Answer Questions**: Provide your age, skin type, and sensitivity
4. **Get Analysis**: AI analyzes your skin and provides ratings
5. **Chat with Advisor**: Get personalized skincare advice based on your analysis

## Troubleshooting

### "Missing credentials" error
- Make sure your `.env.local` file exists and contains all required variables
- Restart your dev server after adding/changing environment variables

### Database errors
- Make sure you've run the SQL schema in Supabase
- Check that RLS policies are enabled
- Verify your database connection string is correct

### Google OAuth not working
- Verify your redirect URLs are correctly configured
- Check that Google OAuth is enabled in Supabase
- Ensure your Google Cloud Console credentials are correct

### Image upload errors
- Check that image size is under 10MB
- Verify OpenAI API key has access to vision models
- Check browser console for detailed error messages

