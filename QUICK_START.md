# Quick Start Guide

## 5-Minute Setup

### 1. Prerequisites
- Node.js 18+
- PostgreSQL (or use Neon for free)
- Git

### 2. Clone & Install
\`\`\`bash
git clone <your-repo-url>
cd exam-pro
npm install
\`\`\`

### 3. Database Setup
1. Create a free Neon account at neon.tech
2. Create a new project
3. Copy the connection string

### 4. Environment Variables
Create `.env.local`:
\`\`\`
DATABASE_URL=postgresql://[user]:[password]@[host]/[database]
JWT_SECRET=your-super-secret-key-here
NODE_ENV=development
\`\`\`

### 5. Initialize Database
\`\`\`bash
# Run migrations using your database client
psql $DATABASE_URL < scripts/01-schema.sql
psql $DATABASE_URL < scripts/02-seed-data.sql
psql $DATABASE_URL < scripts/03-initialize-users.sql
\`\`\`

### 6. Start Development Server
\`\`\`bash
npm run dev
\`\`\`

Visit `http://localhost:3000`

### 7. Login
- Teacher: `teacher@example.com` / `password`
- Student: `student1@example.com` / `password`

## What's Next?

1. **Create Classes**: Teacher Dashboard → Create Class
2. **Create Questions**: Question Bank → Create Question
3. **Create Exams**: Create Exam → Select Questions
4. **Publish Exams**: Change status to "published"
5. **Students Take Exams**: Student Dashboard → Start Exam

## Common Issues

**"Database connection failed"**
- Check DATABASE_URL format
- Ensure database is running
- Verify credentials

**"Port 3000 already in use"**
\`\`\`bash
# Use different port
npm run dev -- -p 3001
\`\`\`

**"JWT errors"**
- Regenerate JWT_SECRET
- Clear browser cookies
- Restart dev server

## Project Structure
- \`app/\` - Next.js app and API routes
- \`components/\` - React components
- \`lib/\` - Utilities and helpers
- \`public/\` - Static files
- \`scripts/\` - Database scripts

## Support
Check README.md for comprehensive documentation
