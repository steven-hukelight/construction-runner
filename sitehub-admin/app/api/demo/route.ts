import { NextRequest, NextResponse } from "next/server";

interface DemoFormData {
  fullName: string;
  company: string;
  email: string;
  role: string;
  sites: string;
  message?: string;
}

async function sendEmailNotification(data: DemoFormData, recipientEmail: string) {
  console.log("📧 Demo Request Received:", {
    timestamp: new Date().toISOString(),
    recipientEmail,
    ...data,
  });
  // Optional: integrate Resend/SendGrid etc. using RESEND_API_KEY and DEMO_RECIPIENT_EMAIL
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DemoFormData;

    if (
      !body.fullName ||
      !body.company ||
      !body.email ||
      !body.role ||
      !body.sites
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const recipientEmail =
      process.env.DEMO_RECIPIENT_EMAIL ?? "demo@example.com";
    await sendEmailNotification(body, recipientEmail);

    return NextResponse.json(
      {
        success: true,
        message: "Demo request received successfully",
        data: body,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing demo request:", error);
    return NextResponse.json(
      { error: "Failed to process demo request" },
      { status: 500 }
    );
  }
}
