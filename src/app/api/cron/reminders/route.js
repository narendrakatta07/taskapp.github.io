import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

export async function GET(req) {
  try {
    // Check for authorization header if you want to secure this cron route in production.
    // For local testing, we'll allow it.

    // Find all incomplete tasks whose deadline is in the past
    // Or, tasks whose deadline is approaching within the next 24 hours.
    // Let's remind for tasks that are overdue and haven't been completed.
    
    const now = new Date();
    
    const overdueTasks = await prisma.task.findMany({
      where: {
        isCompleted: false,
        deadline: {
          lt: now, // Less than current time (overdue)
        }
      },
      include: {
        user: true
      }
    });

    if (overdueTasks.length === 0) {
      return NextResponse.json({ message: "No overdue tasks to remind." });
    }

    // Generate a test SMTP service account from ethereal.email
    let testAccount = await nodemailer.createTestAccount();

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });

    const emailsSent = [];

    // Send emails for each overdue task
    for (const task of overdueTasks) {
      const info = await transporter.sendMail({
        from: '"TaskFlow Reminders" <noreply@taskflow.com>',
        to: task.user.email,
        subject: `Reminder: Task "${task.title}" is Overdue!`,
        text: `Hello ${task.user.name || 'User'},\n\nYour task "${task.title}" was due on ${task.deadline.toLocaleString()} and is currently marked as incomplete.\n\nPlease log in to TaskFlow to complete it.\n\nBest,\nTaskFlow Team`,
        html: `<b>Hello ${task.user.name || 'User'},</b><br/><br/>Your task "<b>${task.title}</b>" was due on ${task.deadline.toLocaleString()} and is currently marked as incomplete.<br/><br/>Please log in to TaskFlow to complete it.<br/><br/>Best,<br/>TaskFlow Team`,
      });

      emailsSent.push({
        task: task.title,
        user: task.user.email,
        previewUrl: nodemailer.getTestMessageUrl(info), // Ethereal provides a preview URL
      });
    }

    return NextResponse.json({ 
      message: `Sent ${emailsSent.length} reminder emails.`,
      emails: emailsSent
    });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ message: "Failed to send reminders", error: error.message }, { status: 500 });
  }
}
