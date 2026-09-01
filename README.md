# Expense Management App

A full-stack web application for managing, reviewing, and approving expense reports with real-time alerts and audit logging.

## Features

- 👤 **User Authentication** - Secure login/registration with JWT
- 📝 **Expense Reports** - Create, edit, and submit expense reports
- ✅ **Approval Workflow** - Multi-step approval process with audit trail
- 📊 **Dashboard Analytics** - Visual insights with charts and statistics
- 🔔 **Real-time Alerts** - Instant notifications for report status changes
- 📋 **Audit Logging** - Complete history of all changes
- 👥 **Role-Based Access** - User and Approver roles with different permissions

## Tech Stack

### Backend
- **Node.js** + **Express.js** - REST API server
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication & authorization

### Frontend
- **React** - UI library
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Utility-first styling
- **Axios** - HTTP client

## Project Structure

```
expense-app/
├── backend/
│   ├── config/          # Database configuration
│   ├── controllers/      # Route handlers
│   ├── middleware/       # Auth & role middleware
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API endpoints
│   ├── utils/           # Helper functions
│   ├── server.js        # Express app entry point
│   └── seed.js          # Database seeding script
└── frontend/
    ├── src/
    │   ├── api/         # Axios configuration
    │   ├── components/  # React components
    │   ├── pages/       # Page components
    │   ├── context/     # Context API (auth)
    │   └── App.jsx      # Main app component
    └── vite.config.js   # Vite configuration
```

## Installation

### Prerequisites
- Node.js v14+ and npm
- MongoDB (local or Atlas connection)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT_SECRET
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Expense Reports
- `GET /api/reports` - Get all reports
- `POST /api/reports` - Create new report
- `GET /api/reports/:id` - Get report details
- `PUT /api/reports/:id` - Update report
- `DELETE /api/reports/:id` - Delete report

### Approvals
- `GET /api/approver/queue` - Get pending approvals
- `POST /api/approver/approve/:id` - Approve report
- `POST /api/approver/reject/:id` - Reject report

### Dashboard
- `GET /api/dashboard/stats` - Get analytics data
- `GET /api/dashboard/charts` - Get chart data

### Alerts
- `GET /api/alerts` - Get user alerts
- `PUT /api/alerts/:id/read` - Mark alert as read

## Database Models

- **User** - User accounts with roles (user, approver, admin)
- **ExpenseReport** - Main expense report document
- **ExpenseLine** - Individual line items in a report
- **Alert** - User notifications
- **AuditLog** - Complete change history

## Development

```bash
# Start backend server
cd backend && npm run dev

# Start frontend dev server (in another terminal)
cd frontend && npm run dev

# Seed database with sample data
cd backend && npm run seed
```
