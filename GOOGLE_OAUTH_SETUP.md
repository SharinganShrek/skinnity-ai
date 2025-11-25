# How to Enable Google OAuth in Supabase

The error "Unsupported provider: provider is not enabled" means Google OAuth hasn't been enabled in your Supabase project yet. Follow these steps:

## Step 1: Enable Google Provider in Supabase

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project (imaizkeskfpldvivrcvm)
3. Navigate to **Authentication** → **Providers** in the left sidebar
4. Find **Google** in the list of providers
5. Toggle the switch to **Enable** Google
6. Click **Save**

## Step 2: Get Google OAuth Credentials

You need to create OAuth credentials in Google Cloud Console:

### 2.1 Create a Google Cloud Project (if you don't have one)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top
3. Click **New Project**
4. Enter a project name (e.g., "Skincare Advisor")
5. Click **Create**

### 2.2 Enable Google+ API

1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click on it and click **Enable**

### 2.3 Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (unless you have a Google Workspace)
3. Click **Create**
4. Fill in the required fields:
   - **App name**: Skincare Advisor (or your choice)
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click **Save and Continue**
6. On the Scopes page, click **Save and Continue** (no need to add scopes)
7. On the Test users page, click **Save and Continue** (you can add test users later)
8. Review and click **Back to Dashboard**

### 2.4 Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application** as the application type
4. Give it a name (e.g., "Skincare Advisor Web")
5. **Important**: Add this authorized redirect URI:
   ```
   https://imaizkeskfpldvivrcvm.supabase.co/auth/v1/callback
   ```
6. Click **Create**
7. **Copy the Client ID and Client Secret** (you'll need these in the next step)

## Step 3: Add Credentials to Supabase

1. Go back to your Supabase dashboard
2. Navigate to **Authentication** → **Providers** → **Google**
3. Paste your **Client ID** (from Google Cloud Console)
4. Paste your **Client Secret** (from Google Cloud Console)
5. Click **Save**

## Step 4: Test Google Sign-In

1. Restart your Next.js dev server if it's running
2. Go to your app's login/signup page
3. Click **Sign in with Google**
4. You should be redirected to Google's sign-in page
5. After signing in, you'll be redirected back to your app

## Troubleshooting

### "redirect_uri_mismatch" error
- Make sure the redirect URI in Google Cloud Console exactly matches:
  `https://imaizkeskfpldvivrcvm.supabase.co/auth/v1/callback`
- No trailing slashes or extra characters

### "access_denied" error
- Make sure you've added your email as a test user in OAuth consent screen (if app is in testing mode)
- Or publish your app in Google Cloud Console

### Still getting "provider is not enabled" error
- Make sure you clicked **Save** after enabling Google in Supabase
- Try refreshing the page or restarting your dev server

## For Production

When deploying to production:
1. Add your production domain's redirect URI to Google Cloud Console:
   ```
   https://yourdomain.com/auth/callback
   ```
2. Update the redirect URL in your Supabase Google provider settings if needed
3. Make sure your OAuth consent screen is published (not in testing mode)

