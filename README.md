# Gym Management Platform

A complete, production-ready MERN stack application built for modern gym and fitness centers.

## Tech Stack
- **Frontend**: React.js (Vite), React Router v6, Axios, Tailwind CSS, Lucide React, React Toastify 
- **Backend**: Node.js, Express.js, Mongoose, JWT, bcryptjs, Nodemailer, Twilio, node-cron
- **Database**: MongoDB Atlas

## Features Included
1. **Multi-Role Authentication**: Secure login workflows for Gym Owners, Clients, and Super-Admins.
2. **Multi-Step Onboarding**: Smooth registration handling extensive Gym and Client details.
3. **Automated Status Updater**: Cron job running at midnight updating subscription states dynamically (`active`, `expiring_soon`, `expired`, `red_tag`).
4. **Automated Reminders**: Built-in logic to trigger Email, SMS, and WhatsApp notifications for expiring/expired plans based on subscription data tracking.
5. **Role Dashboards**:
    - **Owner Portal**: Comprehensive visualization of revenue, clients, plans, and customized alert views for red tag members.
    - **Client Portal**: Track days left, explore plans, and monitor active membership statuses directly.
    - **Admin Portal**: Top level operations toggling gym validity statuses and viewing aggregated metrics across the whole platform.

## Validation & Aesthetics
- Form schemas verified on endpoints securely preventing duplicate emails and protecting data integrity.
- Styled purely with Tailwind CSS, utilizing a premium dark theme approach mapped via `tailwind.config.js`.

## Startup Commands

Be sure you have created your `.env` file within the `server/` directory and modified the missing placeholders (like Twilio API keys) accordingly. The application handles graceful failure logs (e.g., `[WhatsApp MOCK]`) if the keys aren't found for ease of local development.

**Start the Backend API Server:**
```bash
cd server
npm install
npm run dev
```

**Start the Frontend Web App:**
```bash
cd client
npm install
npm run dev
```

