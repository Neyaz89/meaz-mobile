# Database Setup Guide for Meaz Mobile App

## 🚨 Current Issue
You're getting the error `relation "public.users" does not exist` because the database tables haven't been created in your Supabase project.

## 🔧 Quick Fix (Recommended)

### Option 1: Run SQL Script in Supabase Dashboard (Easiest)

1. **Go to your Supabase Dashboard**
   - Visit https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Paste the SQL Script**
   - Open `scripts/quick-setup.sql` in your project
   - Copy the entire content
   - Paste it into the SQL Editor

4. **Run the Script**
   - Click "Run" button
   - Wait for all tables to be created

5. **Verify Setup**
   - Go to "Table Editor" in the left sidebar
   - You should see these tables:
     - `users`
     - `friends`
     - `friend_requests`
     - `chats`
     - `chat_members`
     - `messages`
     - `stories`

### Option 2: Use Node.js Script (Advanced)

1. **Install Dependencies**
   ```bash
   npm install dotenv
   ```

2. **Set Environment Variables**
   Create a `.env` file in your project root:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. **Run the Setup Script**
   ```bash
   node scripts/setup-database.js
   ```

## 🔑 Getting Your Supabase Credentials

### 1. Get Supabase URL
- Go to your Supabase project dashboard
- Click "Settings" → "API"
- Copy the "Project URL"

### 2. Get Service Role Key
- In the same API settings page
- Copy the "service_role" key (not the anon key)
- ⚠️ **Keep this secret!** Never commit it to version control

## 📋 What the Setup Creates

The database setup creates:

### Tables
- **`users`** - User profiles and settings
- **`friends`** - Friend relationships
- **`friend_requests`** - Friend request management
- **`chats`** - Chat rooms and conversations
- **`chat_members`** - Chat membership and roles
- **`messages`** - Chat messages
- **`stories`** - User stories and posts

### Functions
- **`create_user_profile()`** - Creates user profiles with default settings
- **`handle_new_user()`** - Automatically creates profiles when users sign up

### Policies
- Row Level Security (RLS) policies for data protection
- Users can only access their own data and friends' data
- Public read access for user profiles

## 🧪 Testing the Setup

After running the setup:

1. **Test Authentication**
   - Try signing up with a new account
   - Check if the user profile is created automatically

2. **Check Database**
   - Go to "Table Editor" in Supabase
   - Verify that new users appear in the `users` table

3. **Test App Features**
   - Try adding friends
   - Test chat functionality
   - Verify stories work

## 🐛 Troubleshooting

### "Permission Denied" Errors
- Make sure you're using the **service_role** key, not the anon key
- Check that your Supabase URL is correct

### "Table Already Exists" Errors
- This is normal if you've run the setup before
- The script uses `CREATE TABLE IF NOT EXISTS` so it's safe to run multiple times

### "Function Already Exists" Errors
- This is also normal for repeated runs
- Functions are recreated with `CREATE OR REPLACE`

### Still Getting "Table Doesn't Exist" in App
- Make sure you're connected to the right Supabase project
- Check your `EXPO_PUBLIC_SUPABASE_URL` environment variable
- Restart your development server after setup

## 🔄 Reset Database (If Needed)

If you need to start fresh:

1. **Go to Supabase Dashboard**
2. **Settings** → **Database**
3. **Scroll down to "Danger Zone"**
4. **Click "Reset Database"**
5. **Run the setup script again**

## 📞 Support

If you're still having issues:

1. Check the Supabase logs in your dashboard
2. Verify your environment variables are correct
3. Make sure you have the latest version of the setup scripts

## 🎉 Success!

Once the database is set up correctly, your app should work without the "relation does not exist" errors. Users will be able to:

- ✅ Sign up and sign in
- ✅ Create and manage profiles
- ✅ Add friends and send friend requests
- ✅ Chat with friends
- ✅ Share stories
- ✅ Use all app features

---

**Note**: The database setup only needs to be run once per Supabase project. After the initial setup, new users will automatically get profiles created when they sign up. 