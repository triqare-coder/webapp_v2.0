# Emergency Response

A comprehensive emergency response management platform built with Next.js, TypeScript, Clerk authentication, and shadcn/ui components.

## 🚨 Features

### Role-Based Access Control
- **Admin**: Full system management including patients, hospitals, ambulances, drivers, users, and reports
- **Emergency Response Team (ERT)**: Monitor SOS alerts, assign ambulances, track emergencies
- **Transport Company**: Manage fleet, drivers, and emergency assignments

### Core Functionality
- **Patient Management**: Comprehensive patient records with medical history and emergency contacts
- **Hospital Network**: Monitor capacity, specialties, and availability
- **Fleet Management**: Real-time ambulance tracking and driver management
- **SOS Response**: Emergency alert system with automated dispatch
- **Real-time Analytics**: Response time tracking and operational metrics
- **Live Map Integration**: Location-based emergency response coordination

## 🛠️ Technology Stack

- **Frontend**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Authentication**: Clerk (role-based access control)
- **Icons**: Lucide React
- **Charts**: Recharts
- **Date Handling**: date-fns

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd emergency-response-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

4. Configure Clerk authentication:
   - Sign up at [Clerk.dev](https://clerk.dev)
   - Create a new application
   - Add your keys to `.env.local`:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📱 Demo

Visit the live demo at `/demo` to explore all user roles and features without authentication.

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── dashboard/         # Main dashboard
│   ├── patients/          # Patient management
│   ├── hospitals/         # Hospital management
│   ├── ambulances/        # Fleet management
│   ├── sos/              # Emergency response
│   ├── demo/             # Interactive demo
│   └── sign-in/          # Authentication pages
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── dashboards/       # Role-specific dashboards
│   └── navigation/       # Navigation components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and mock data
└── types/                # TypeScript type definitions
```

## 🎯 User Roles & Permissions

### Administrator
- ✅ Manage patients, hospitals, ambulances, drivers
- ✅ User management and role assignment
- ✅ System-wide analytics and reporting
- ✅ Full access to all features

### Emergency Response Team (ERT)
- ✅ Monitor active emergencies
- ✅ Dispatch ambulances
- ✅ Track response times
- ✅ Live map view
- ❌ User management
- ❌ System configuration

### Transport Company
- ✅ Manage own fleet and drivers
- ✅ View assigned emergencies
- ✅ Track vehicle status
- ❌ Access to other companies' data
- ❌ System administration

## 🔧 Configuration

### Authentication Setup
1. Create a Clerk application
2. Configure social providers (optional)
3. Set up user metadata for roles
4. Update middleware for route protection

### Role Assignment
Roles are currently assigned based on email patterns (demo):
- Emails containing "admin" → Admin role
- Emails containing "ert" → ERT role
- Emails containing "transport" → Transport Company role
- Default → Admin role

## 📊 Mock Data

The application includes comprehensive mock data for demonstration:
- 3 Patients with medical history
- 3 Hospitals with capacity tracking
- 3 Ambulances with real-time status
- 3 Drivers with availability
- 2 Transport companies
- 3 SOS cases with different statuses

## 🚀 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy

### Other Platforms
The app can be deployed to any platform supporting Next.js:
- Netlify
- Railway
- AWS Amplify
- Docker containers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the demo at `/demo`

---

Built with ❤️ using Next.js, Clerk, and shadcn/ui
