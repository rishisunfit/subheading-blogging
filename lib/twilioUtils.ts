/**
 * Twilio SMS utility functions
 */

/**
 * Send an SMS message via Twilio
 * @param to - Phone number to send to (e.g., "+12485685999")
 * @param body - Message body
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function sendTwilioSMS(
  to: string,
  body: string
): Promise<boolean> {
  console.log("=== ATTEMPTING TO SEND TWILIO SMS ===");
  console.log("To:", to);
  console.log("Message length:", body.length, "characters");

  const accountSid = process.env.TWILIO_SID;
  const authToken = process.env.TWILIO_SECRET;
  const fromNumber = process.env.TWILIO_FROM_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.error("❌ SMS NOT SENT - Twilio configuration missing:", {
      hasSid: !!accountSid,
      hasToken: !!authToken,
      hasFromNumber: !!fromNumber,
    });
    return false;
  }

  console.log("Twilio configuration present, proceeding with SMS send...");

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const params = new URLSearchParams();
    params.append("To", to);
    params.append("From", fromNumber);
    params.append("Body", body);

    // Create Basic Auth header
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString(
      "base64"
    );

    console.log("Sending request to Twilio API...");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ SMS NOT SENT - Twilio API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return false;
    }

    const result = await response.json();
    console.log("✅ SMS SENT SUCCESSFULLY");
    console.log("Twilio Message SID:", result.sid);
    console.log("Status:", result.status);
    console.log("To:", result.to);
    console.log("From:", result.from);
    return true;
  } catch (error) {
    console.error("❌ SMS NOT SENT - Exception occurred:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return false;
  }
}

/**
 * Send an email via Twilio SendGrid
 * @param to - Email address to send to
 * @param subject - Email subject
 * @param body - Email body (plain text)
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function sendTwilioEmail(
  to: string,
  subject: string,
  body: string
): Promise<boolean> {
  console.log("=== ATTEMPTING TO SEND EMAIL VIA TWILIO SENDGRID ===");
  console.log("To:", to);
  console.log("Subject:", subject);
  console.log("Message length:", body.length, "characters");

  const sendGridApiKey = process.env.TWILIO_SENDGRID_API_KEY;

  if (!sendGridApiKey) {
    console.error("❌ EMAIL NOT SENT - Twilio SendGrid API key not configured");
    console.error(
      "Set TWILIO_SENDGRID_API_KEY environment variable to enable email sending"
    );
    return false;
  }

  const fromEmail = process.env.TWILIO_FROM_EMAIL || "noreply@blogish.com";

  try {
    const url = "https://api.sendgrid.com/v3/mail/send";

    const emailData = {
      personalizations: [
        {
          to: [{ email: to }],
          subject: subject,
        },
      ],
      from: { email: fromEmail },
      content: [
        {
          type: "text/plain",
          value: body,
        },
      ],
    };

    console.log("Sending request to Twilio SendGrid API...");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sendGridApiKey}`,
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ EMAIL NOT SENT - Twilio SendGrid API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return false;
    }

    console.log("✅ EMAIL SENT SUCCESSFULLY");
    console.log("To:", to);
    console.log("From:", fromEmail);
    return true;
  } catch (error) {
    console.error("❌ EMAIL NOT SENT - Exception occurred:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return false;
  }
}
