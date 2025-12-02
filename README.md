# ExamPro - B7 & B8 Examination Platform

A professional, full-featured web-based examination platform designed for Basic 7 and Basic 8 Computing students aligned with the GES Computing curriculum.

## Features

- **Complete Exam Management**: Create, manage, and publish exams with multiple question types
- **Real-Time Exam Engine**: Timed exams with auto-save and anti-cheat measures
- **Instant Results**: Automatic marking for objective questions with detailed feedback
- **Student Dashboard**: View available exams, attempt history, and performance metrics
- **Teacher Analytics**: Comprehensive analytics dashboard with student performance tracking
- **Practice Mode**: Practice questions organized by topics for skill improvement
- **Leaderboard**: Student motivation through competitive rankings
- **Role-Based Access**: Separate interfaces for teachers and students
- **Secure Authentication**: JWT-based authentication with password hashing
- **Responsive Design**: Mobile-first design for all devices

## Technology Stack

- **Frontend**: Next.js 14, React 18, TailwindCSS 4
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL (Neon)
- **Authentication**: JWT with bcryptjs
- **Charts**: Recharts
- **UI Components**: shadcn/ui

## Installation

### Prerequisites

- Node.js 18+ and npm/pnpm
- PostgreSQL database (Neon)
- Git

### Setup Steps

1. **Clone the repository**
   \`\`\`bash
   git clone <repository-url>
   cd exam-pro
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   # or
   pnpm install
   \`\`\`

3. **Set up environment variables**
   Create a `.env.local` file:
   \`\`\`
   DATABASE_URL=postgresql://user:password@host/dbname
   JWT_SECRET=your-secret-key-change-this
   NODE_ENV=development
   \`\`\`

4. **Run database migrations**
   \`\`\`bash
   # Run the SQL scripts in scripts/ directory through your database client
   # 1. scripts/01-schema.sql - Creates all tables
   # 2. scripts/02-seed-data.sql - Seeds sample topics
   # 3. scripts/03-initialize-users.sql - Creates sample users
   \`\`\`

5. **Start the development server**
   \`\`\`bash
   npm run dev
   # or
   pnpm dev
   \`\`\`

6. **Open in browser**
   Navigate to `http://localhost:3000`

## Demo Credentials

**Teachers:**
- Email: `teacher@example.com`
- Password: `password`

**Students:**
- Email: `student1@example.com` (B7 Student)
- Password: `password`
- Email: `student3@example.com` (B8 Student)
- Password: `password`

## Project Structure

\`\`\`
exam-pro/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/              # Authentication endpoints
│   │   ├── exams/             # Exam management
│   │   ├── student/           # Student-specific endpoints
│   │   ├── teacher/           # Teacher-specific endpoints
│   │   └── topics/            # Topic and question management
│   ├── teacher/               # Teacher pages
│   │   ├── dashboard/
│   │   ├── exams/
│   │   ├── analytics/
│   │   └── questions/
│   ├── student/               # Student pages
│   │   ├── dashboard/
│   │   ├── exam/
│   │   ├── results/
│   │   ├── practice/
│   │   └── leaderboard/
│   ├── login/
│   ├── register/
│   └── layout.tsx
├── components/                # React components
│   ├── ui/                    # shadcn/ui components
│   ├── teacher-nav.tsx
│   └── student-nav.tsx
├── lib/
│   ├── db.ts                  # Database connection
│   ├── auth.ts                # Authentication utilities
│   └── utils.ts
├── public/                    # Static assets
└── scripts/                   # Database scripts
\`\`\`

## API Documentation

### Authentication

**POST /api/auth/register**
- Register new user (student or teacher)
- Body: `{ email, password, fullName, role, classLevel?, studentId? }`

**POST /api/auth/login**
- Login existing user
- Body: `{ email, password }`

### Exams

**GET /api/exams**
- Get all exams for logged-in teacher
- Headers: `Authorization: Bearer <token>`

**POST /api/exams**
- Create new exam
- Headers: `Authorization: Bearer <token>`
- Body: `{ classId, title, description, durationMinutes, totalMarks, questions }`

**GET /api/student/exams**
- Get available exams for student
- Headers: `Authorization: Bearer <token>`

**POST /api/student/exam/[examId]/start**
- Start exam attempt
- Headers: `Authorization: Bearer <token>`

**POST /api/student/exam/[examId]/submit**
- Submit exam and get results
- Headers: `Authorization: Bearer <token>`
- Body: `{ attemptId, responses }`

### Analytics

**GET /api/teacher/analytics**
- Get performance analytics
- Headers: `Authorization: Bearer <token>`

## Deployment

### Deploy to Vercel

1. **Push code to GitHub**
   \`\`\`bash
   git push origin main
   \`\`\`

2. **Connect to Vercel**
   - Visit vercel.com and sign in
   - Click "Import Project"
   - Select your repository

3. **Configure environment variables**
   - Add `DATABASE_URL` and `JWT_SECRET` in Vercel dashboard
   - Set `NODE_ENV` to `production`

4. **Deploy**
   - Vercel will automatically build and deploy

### Deploy to Other Platforms

**AWS EC2:**
\`\`\`bash
# Build
npm run build

# Start production server
npm start
\`\`\`

**DigitalOcean:**
- Use App Platform for easy deployment
- Configure environment variables
- Deploy from GitHub repository

**Railway/Render:**
- Connect GitHub repository
- Add environment variables
- Platform will auto-deploy on push

## Security Features

- **Password Hashing**: bcryptjs (10 salt rounds)
- **JWT Authentication**: Secure token-based authentication
- **CSRF Protection**: Automatically handled by Next.js
- **SQL Injection Prevention**: Parameterized queries via Neon
- **Input Validation**: Frontend and backend validation
- **Role-Based Access Control**: Teacher/Student/Admin role separation
- **Secure Cookies**: HTTPOnly, Secure, SameSite attributes
- **Activity Logging**: Track user actions for audit trail
- **Tab Switch Detection**: Warn about browser tab switching during exams

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Optimization

- Responsive Images
- Code Splitting
- Server-Side Rendering
- Database Query Optimization
- Caching Strategies

## Scalability

Current setup supports:
- 70+ concurrent users
- Automatic database scaling (Neon)
- CDN distribution (Vercel)
- Load balancing ready

## Future Enhancements

- AI-generated personalized revision questions
- Offline mode (PWA)
- SMS/OTP login
- Real-time notifications
- Parent portal
- Video explanations
- Mobile app
- Advanced proctoring

## Support

For issues or questions:
1. Check the documentation
2. Review API endpoints
3. Check database logs
4. Contact: support@exampro.com

## License

MIT License - See LICENSE file for details

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## Changelog

### Version 1.0.0 (Current)
- Initial release
- Core exam functionality
- Student dashboard
- Teacher analytics
- Practice mode
- Leaderboard system

---

Built with ❤️ for education
