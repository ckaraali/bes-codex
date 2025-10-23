# Supabase Setup Instructions

## 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note your project URL and API keys

## 2. Run Database Schema
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `supabase-schema.sql`
3. Click "Run" to create tables and policies

## 3. Update Environment Variables
Update `.env` with your actual Supabase credentials:

```env
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_ANON_KEY="your-anon-key"
```

## 4. Test Login
- Email: `demo@pensioncrm.test`
- Password: `Password123!`

## 5. Remove Prisma (Optional)
```bash
npm uninstall prisma @prisma/client
rm -rf prisma/
```

## 6. Start Application
```bash
npm run dev
```

The application should now work with Supabase instead of Prisma!