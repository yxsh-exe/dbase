# DBase - Visual Database Schema Designer

<div align="center">

**Design database schemas visually. Export with confidence.**

[![Next.js](https://img.shields.io/badge/Next.js-15.4.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1.0-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.13.0-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Clerk](https://img.shields.io/badge/Clerk-Authentication-6B46C1?style=flat-square)](https://clerk.com/)

</div>

## ✨ Features

- **🎨 Visual Schema Design** - Drag-and-drop interface for creating database tables and relationships
- **🔗 Interactive Relations** - Define one-to-one, one-to-many, and many-to-many relationships with visual linking
- **📊 Rich Field Types** - Support for common SQL types with constraints and defaults
- **💾 SQL Export** - Generate production-ready SQL from your visual models
- **👥 Team Collaboration** - User authentication and project management
- **🔄 Real-time Updates** - Auto-save functionality with undo/redo support
- **📱 Responsive Design** - Works seamlessly on desktop and mobile devices
- **🎯 Modern UI** - Built with Tailwind CSS and Radix UI components

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Clerk account for authentication

### Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd modeler
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:

   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/dbase"

   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key
   CLERK_SECRET_KEY=sk_test_your_secret_key
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/projects
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/projects
   ```

4. **Set up the database**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔐 Production-Ready Clerk Setup

### 1. Create a Clerk Application

1. **Sign up at [clerk.com](https://clerk.com)**
2. **Create a new application**
3. **Choose your authentication methods** (Email, Google, GitHub, etc.)
4. **Configure your domains** (add your production domain)

### 2. Environment Variables

#### Development (`.env.local`)

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/dbase"

# Clerk Development
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/projects
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/projects
```

#### Production (`.env.production`)

```env
# Database
DATABASE_URL="postgresql://username:password@your-db-host:5432/dbase"

# Clerk Production
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/projects
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/projects

# Security (Optional but recommended)
NEXT_PUBLIC_CLERK_FRONTEND_API=clerk.your-domain.com
```

### 3. Clerk Dashboard Configuration

#### Authentication Settings

1. **Go to Clerk Dashboard → Authentication**
2. **Configure sign-in methods**:
   - Email/Password
   - OAuth providers (Google, GitHub, etc.)
   - Magic links
3. **Set password requirements**:
   - Minimum length: 8 characters
   - Require uppercase, lowercase, numbers
4. **Configure session settings**:
   - Session duration: 30 days
   - Enable session rotation

#### User Management

1. **Go to Users → Settings**
2. **Configure user attributes**:
   - Required: Email
   - Optional: First name, Last name, Profile picture
3. **Set up user roles** (if needed):
   - Admin
   - User
   - Viewer

#### Security Settings

1. **Go to Security → Settings**
2. **Enable security features**:
   - Rate limiting
   - CAPTCHA for suspicious activity
   - Email verification required
   - Phone verification (optional)
3. **Configure allowed origins**:
   - Add your production domain
   - Add localhost for development

### 4. Database Migration

Create and run the migration for the new `clerkId` field:

```bash
# Create migration
npx prisma migrate dev --name add-clerk-id

# Apply to production database
npx prisma migrate deploy
```

### 5. Deployment Configuration

#### Vercel Deployment

1. **Connect your repository to Vercel**
2. **Add environment variables** in Vercel dashboard:
   - Copy all production environment variables
   - Set `NODE_ENV=production`
3. **Configure build settings**:
   - Build command: `npm run build`
   - Output directory: `.next`
   - Install command: `npm install`

#### Other Platforms

For other deployment platforms (Netlify, Railway, etc.), add the same environment variables in their respective dashboards.

### 6. Security Best Practices

#### Environment Variables

- ✅ **Never commit `.env` files** to version control
- ✅ **Use different keys** for development and production
- ✅ **Rotate keys regularly** (every 90 days)
- ✅ **Use strong, unique keys** for each environment

#### Database Security

- ✅ **Use connection pooling** in production
- ✅ **Enable SSL** for database connections
- ✅ **Restrict database access** by IP
- ✅ **Regular backups** and monitoring

#### Application Security

- ✅ **Enable HTTPS** in production
- ✅ **Set secure headers** (HSTS, CSP, etc.)
- ✅ **Rate limiting** on API routes
- ✅ **Input validation** and sanitization

### 7. Monitoring and Analytics

#### Clerk Analytics

1. **Enable Clerk Analytics** in dashboard
2. **Monitor user activity**:
   - Sign-ups and sign-ins
   - Failed authentication attempts
   - User engagement metrics

#### Application Monitoring

1. **Set up error tracking** (Sentry, LogRocket)
2. **Monitor performance** (Vercel Analytics, Web Vitals)
3. **Database monitoring** (connection pools, query performance)

### 8. Testing Authentication

#### Test Cases

```bash
# Test sign-up flow
1. Visit /sign-up
2. Fill out registration form
3. Verify email (if required)
4. Redirect to /projects

# Test sign-in flow
1. Visit /sign-in
2. Enter credentials
3. Verify redirect to /projects
4. Test protected routes

# Test sign-out
1. Click user button
2. Select sign out
3. Verify redirect to home page
```

#### Security Testing

- ✅ **Test rate limiting** (multiple failed attempts)
- ✅ **Test session expiration**
- ✅ **Test unauthorized access** to protected routes
- ✅ **Test CSRF protection**

## 🐛 Troubleshooting

### Debug Page

Visit `/debug` to test authentication and user creation:

1. **Authentication Status** - Check if Clerk is properly configured
2. **User Information** - Verify user data from Clerk
3. **Test Actions** - Test user creation and project management
4. **Results** - View created projects and user data

### Common Issues

#### Users not being created in database

**Symptoms:**

- Users can sign in but projects aren't associated with them
- API returns 401 or 404 errors
- Projects list is empty

**Solutions:**

1. **Check environment variables** - Ensure all Clerk keys are correct
2. **Verify database connection** - Test DATABASE_URL
3. **Check Clerk dashboard** - Ensure domain is properly configured
4. **Run database migrations** - Ensure `clerkId` field exists
5. **Check browser console** - Look for authentication errors

#### Projects not loading

**Symptoms:**

- Projects page shows loading indefinitely
- API calls fail with authentication errors

**Solutions:**

1. **Clear browser cache** - Remove stored authentication tokens
2. **Check middleware** - Ensure routes are properly protected
3. **Verify user creation** - Use debug page to test user sync
4. **Check API logs** - Look for server-side errors

#### Authentication redirects not working

**Symptoms:**

- Users stuck in authentication loops
- Redirects go to wrong pages

**Solutions:**

1. **Check Clerk URLs** - Verify all redirect URLs in environment
2. **Update Clerk dashboard** - Ensure redirect URLs match
3. **Clear browser data** - Remove cached authentication state
4. **Check middleware configuration** - Verify protected routes

### Debug Steps

1. **Visit `/debug`** and run the test actions
2. **Check browser console** for detailed error messages
3. **Verify environment variables** are loaded correctly
4. **Test database connection** with Prisma Studio
5. **Check Clerk dashboard** for user activity and errors

### Getting Help

If you're still experiencing issues:

1. **Check the debug page** at `/debug` for detailed information
2. **Review browser console** for error messages
3. **Check server logs** for API errors
4. **Verify Clerk dashboard** for authentication issues
5. **Test with a fresh browser session**

## 🏗️ Project Structure

```
modeler/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── projects/          # Project management pages
│   │   ├── sign-in/           # Authentication pages
│   │   └── debug/             # Debug and testing page
│   ├── components/
│   │   ├── editor/            # Schema editor components
│   │   │   ├── nodes/         # Table node components
│   │   │   └── hooks/         # Editor-specific hooks
│   │   └── ui/                # Reusable UI components
│   ├── lib/                   # Utility functions
│   │   ├── auth.ts           # Authentication utilities
│   │   ├── clerk.ts          # Clerk configuration
│   │   └── prisma.ts         # Database client
│   └── types/                 # TypeScript type definitions
├── prisma/                    # Database schema and migrations
└── public/                    # Static assets
```

## 🎯 Core Features

### Visual Schema Editor

The heart of DBase is the visual schema editor built with React Flow:

- **Table Nodes** - Create and configure database tables with fields
- **Relationship Edges** - Connect tables with foreign key relationships
- **Field Configuration** - Set data types, constraints, and properties
- **Real-time Validation** - Immediate feedback on schema design

### Project Management

- **Project Dashboard** - View and manage all your database projects
- **Search & Filter** - Find projects quickly with advanced filtering
- **Grid/List Views** - Choose your preferred project display mode
- **Collaboration** - Share projects with team members

### SQL Generation

- **Export Ready** - Generate production SQL from visual models
- **Multiple Formats** - Support for various SQL dialects
- **Migration Scripts** - Create database migration files
- **Schema Validation** - Ensure your schema is database-ready

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Components**: Radix UI, Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk
- **Flow Editor**: React Flow (@xyflow/react)
- **State Management**: React hooks with custom state management
- **Styling**: Tailwind CSS with custom design system

## 📱 Usage

### Creating Your First Project

1. **Sign up/Login** - Create an account or sign in
2. **New Project** - Click "New Project" from the dashboard
3. **Add Tables** - Use the "+" button to add database tables
4. **Configure Fields** - Set field names, types, and constraints
5. **Create Relationships** - Drag from one table to another to create relationships
6. **Export SQL** - Generate SQL from the sidebar

### Key Shortcuts

- `Ctrl/Cmd + S` - Save project
- `Ctrl/Cmd + Z` - Undo
- `Ctrl/Cmd + Y` - Redo
- `Delete` - Remove selected elements
- `Escape` - Cancel current operation

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database Migrations

```bash
npx prisma migrate dev    # Create and apply new migration
npx prisma generate       # Generate Prisma client
npx prisma studio         # Open Prisma Studio
```

### Environment Variables

| Variable                            | Description                  | Required |
| ----------------------------------- | ---------------------------- | -------- |
| `DATABASE_URL`                      | PostgreSQL connection string | Yes      |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key        | Yes      |
| `CLERK_SECRET_KEY`                  | Clerk secret key             | Yes      |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [React Flow](https://reactflow.dev/) for the visual editor
- [Clerk](https://clerk.com/) for authentication
- [Prisma](https://www.prisma.io/) for database management
- [Radix UI](https://www.radix-ui.com/) for accessible components
- [Tailwind CSS](https://tailwindcss.com/) for styling

## 📞 Support

- **Documentation**: Check the code comments and component documentation
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Discussions**: Join the community discussions for help and ideas

---

<div align="center">

**Built with ❤️ using Next.js, React, and modern web technologies**

[Get Started](#quick-start) • [View Demo](#) • [Report Bug](https://github.com/your-repo/issues)

</div>
