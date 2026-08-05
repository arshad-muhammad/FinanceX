import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { sendNewBillNotification } from '@/lib/email';
import crypto from 'crypto';

// GET /api/expenses - List all expenses sorted by date (newest first)
export async function GET() {
  try {
    const expenses = await query('SELECT * FROM FIN_expenses ORDER BY date DESC, createdAt DESC');
    return NextResponse.json(expenses);
  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: `Failed to fetch expenses: ${error.message || error}` },
      { status: 500 }
    );
  }
}

// POST /api/expenses - Add a new expense and log the creation activity
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const username = cookieStore.has('admin_auth')
      ? 'admin'
      : cookieStore.get('site_auth')?.value || 'unknown';

    const body = await request.json();
    const { title, amount, category, paidBy, date, notes, billImageUrl, paymentSource } = body;

    // Server-side validation
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const parsedAmount = parseFloat(body.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    if (!paidBy || typeof paidBy !== 'string' || paidBy.trim() === '') {
      return NextResponse.json({ error: 'Paid By name is required' }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const newId = crypto.randomUUID();
    const parsedDate = new Date(date);

    // Insert the expense record
    await query(
      `INSERT INTO FIN_expenses (id, title, amount, category, paidBy, date, notes, createdBy, billImageUrl, paymentSource)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId,
        title.trim(),
        parsedAmount,
        category && typeof category === 'string' ? category.trim() : 'General',
        paidBy.trim(),
        parsedDate,
        notes ? notes.trim() : null,
        username,
        billImageUrl || null,
        paymentSource && typeof paymentSource === 'string' ? paymentSource.trim() : 'Other'
      ]
    );

    // Write an activity log
    const logId = crypto.randomUUID();
    await query(
      `INSERT INTO FIN_activity_logs (id, action, username, details)
       VALUES (?, 'CREATE', ?, ?)`,
      [
        logId,
        username,
        `Created expense: "${title.trim()}" (₹${parsedAmount.toFixed(2)})`
      ]
    );

    // Fetch the created expense
    const createdExpenses = await query<any[]>('SELECT * FROM FIN_expenses WHERE id = ?', [newId]);
    const newExpense = createdExpenses[0];

    console.log(`[API /api/expenses] New bill created by user '${username}': "${newExpense.title}" (₹${newExpense.amount})`);
    console.log(`[API /api/expenses] Triggering background email notification for expense ID: ${newId}...`);

    // Trigger email notification via Resend
    sendNewBillNotification(newExpense).catch((err) => {
      console.error('[API /api/expenses] Background email notification error:', err);
    });

    return NextResponse.json(newExpense, { status: 201 });
  } catch (error: any) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: `Failed to create expense: ${error.message || error}` },
      { status: 500 }
    );
  }
}

