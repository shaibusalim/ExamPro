# Deployment Guide

## Vercel Deployment (Recommended)

### Step-by-Step Guide

1. **Prerequisites**
   - GitHub account with repository
   - Vercel account (free tier available)
   - PostgreSQL database (Neon free tier)

2. **Setup Neon Database**
   - Visit neon.tech
   - Create free account
   - Create new project
   - Get connection string (DATABASE_URL)

3. **Prepare Repository**
   \`\`\`bash
   # Ensure .env.local is in .gitignore
   echo ".env.local" >> .gitignore
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   \`\`\`

4. **Deploy to Vercel**
   - Visit vercel.com
   - Click "New Project"
   - Import from GitHub
   - Select your repository
   - Add environment variables:
     - `DATABASE_URL`: From Neon
     - `JWT_SECRET`: Generate secure key
     - `NODE_ENV`: production
   - Click "Deploy"

5. **Run Database Migrations**
   \`\`\`bash
   # Use Neon's SQL editor or psql
   psql DATABASE_URL < scripts/01-schema.sql
   psql DATABASE_URL < scripts/02-seed-data.sql
   psql DATABASE_URL < scripts/03-initialize-users.sql
   \`\`\`

### Post-Deployment

- Test login functionality
- Verify database connections
- Test exam creation and submission
- Monitor analytics
- Set up error tracking (Sentry optional)

## Docker Deployment

\`\`\`dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
\`\`\`

Build and run:
\`\`\`bash
docker build -t exampro .
docker run -p 3000:3000 --env-file .env.production exampro
\`\`\`

## Environment Variables Checklist

- [ ] `DATABASE_URL` - PostgreSQL connection
- [ ] `JWT_SECRET` - Secure random string
- [ ] `NODE_ENV` - Set to 'production'
- [ ] `NEXTAUTH_URL` - Your domain (if using auth)
- [ ] `NEXTAUTH_SECRET` - Secure random string

## Monitoring & Maintenance

### Health Checks
- Monitor database connections
- Track API response times
- Monitor disk space
- Check memory usage

### Backups
- Daily automated backups (Neon handles this)
- Test restore procedures
- Archive important data

### Updates
- Keep Node.js updated
- Update dependencies regularly
- Apply security patches immediately

## Troubleshooting

**Database Connection Failed**
- Verify DATABASE_URL format
- Check firewall rules
- Ensure database is running
- Verify credentials

**JWT Errors**
- Regenerate JWT_SECRET
- Clear browser cookies
- Restart server

**Performance Issues**
- Check database query logs
- Optimize slow queries
- Scale database if needed
- Enable caching

## Success Checklist

- [ ] Domain configured
- [ ] SSL certificate active
- [ ] Database backups enabled
- [ ] Environment variables set
- [ ] Admin account created
- [ ] Teachers onboarded
- [ ] Sample exams created
- [ ] Student accounts created
- [ ] Analytics working
- [ ] Email notifications (if configured)
