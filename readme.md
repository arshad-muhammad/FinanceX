# HackTrack - Hackathon Expense Tracker

A modern, responsive, and secure web application built using **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **mysql2** (native MySQL driver with SQL queries). It allows hackathon teams to track shared expenses, filter them, view categories in a dynamic chart, and secure sensitive modifications with an Admin key.

## Features

- **Site Password Gate**: Restricts view access to the team dashboard with a site-wide password.
- **Admin-Gated Modifications**: Adding expenses is open to anyone, but editing or deleting requires entering an Admin key.
- **Dynamic Ledger Dashboard**:
  - Displays summary statistics: **Total Spent**, **Transaction Count**, and **Average Expense**.
  - Interactive **Category Breakdown** chart.
  - Full search (by description and spender), category filters, and date range filters.
  - Native sorting by transaction date and amount.
- **Optimistic State Updates**: Adds, edits, and deletions reflect instantly in the user interface.
- **Custom Toasts & Confirmations**: Native, beautiful, non-blocking toast notifications and modal dialogs.
- **Fully Responsive**: Adapts seamlessly to mobile screens for on-the-go tracking.

---


## Local Setup Instructions

### 1. Install Dependencies
Initialize the project packages:
```bash
npm install
```

### 2. Configure the Database
In the root of the project, a `.env` file has been created with a placeholder string.
Open `.env` and replace it with your real MySQL connection string:
```env
# TODO: replace with your real MySQL connection string
DATABASE_URL="mysql://username:password@localhost:3306/hackathon_expenses"
```

### 3. Initialize and Seed the Database
Create the SQL table schema and populate the database with sample transactions in a single command:
```bash
npm run db:setup
```
This executes the database setup script located at `src/scripts/setup-db.ts` using `tsx`. It validates the connection, creates the `expenses` table schema, and adds sample entries.

### 4. Start the Development Server
Launch the application:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.
