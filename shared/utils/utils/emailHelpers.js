import emailjs from "emailjs-com";
import { format, parseISO } from "date-fns";

// Sends the proposal email with the confirm link
export function sendProposalEmail({
  to_email,
  to_name,
  from_name,
  from_email,
  day,
  date,
  time,
  location,
  note,        // <-- Use 'note' for proposal emails!
  gameType,
  raceLength,
  proposalId
}) {
  // SAFETY CHECK
  if (!to_email || to_email === "undefined") {
    alert("Recipient email is missing. Cannot send proposal.");
    return Promise.reject(new Error("Recipient email is missing."));
  }
  if (!from_email || from_email === "undefined") {
    alert("Your email is missing. Cannot send proposal.");
    return Promise.reject(new Error("Sender email is missing."));
  }

  const formattedDate = format(parseISO(date), "MM-dd-yyyy");
  const matchDetails = {
    from: from_name,
    to: to_name,
    day,
    date: formattedDate,
    time,
    location,
    note,               // <-- Use 'note' here
    proposerEmail: from_email,
    gameType,
    raceLength,
    proposalId
  };
  const queryString = Object.entries(matchDetails)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  
  // Always use production URL for email links
  const baseUrl = "https://newapp-1-ic1v.onrender.com";
  const confirmLink = `${baseUrl}/#/confirm-match?${queryString}`;
  const counterProposeLink = `${baseUrl}/#/confirm-match?${queryString}`;

  return emailjs.send(
    'service_l5q2047',
    'template_xu0tl3i',
    {
      to_email,
      to_name,
      from_name,
      day,
      date: formattedDate,
      time,
      location,
      note,              // <-- Use 'note' here
      gameType,
      raceLength,
      confirm_link: confirmLink,
      counter_propose_link: counterProposeLink,
    },
    'g6vqrOs_Jb6LL1VCZ'
  );
}

// Sends the confirmation email to the proposer
export function sendConfirmationEmail({
  to_email,
  to_name,
  day,
  date,
  time,
  location,
  proposal_note,        // <-- Use these for confirmation email
  confirmation_note,
  confirmed_by,
  gameType,
  raceLength
}) {
  return emailjs.send(
    'service_l5q2047',
    'template_dtc43h8',
    {
      to_email,
      to_name,
      day,
      date,
      time,
      location,
      proposal_note,     // <-- Use these for confirmation email
      confirmation_note,
      confirmed_by,
      gameType,
      raceLength,
    },
    'g6vqrOs_Jb6LL1VCZ'
  );
}

// Sends deadline reminder emails for Phase 1
export function sendDeadlineReminderEmail({
  to_email,
  to_name,
  division,
  daysUntilDeadline,
  completedMatches,
  totalRequiredMatches,
  deadlineDate,
  remainingMatches
}) {
  // SAFETY CHECK
  if (!to_email || to_email === "undefined") {
    console.error("Recipient email is missing. Cannot send deadline reminder.");
    return Promise.reject(new Error("Recipient email is missing."));
  }

  const progressPercentage = Math.round((completedMatches / totalRequiredMatches) * 100);
  const urgencyLevel = daysUntilDeadline <= 1 ? "CRITICAL" : 
                      daysUntilDeadline <= 3 ? "URGENT" : 
                      daysUntilDeadline <= 7 ? "WARNING" : "REMINDER";

  return emailjs.send(
    'service_l5q2047',
    'template_xbpnbge',
    {
      to_email,
      to_name,
      division,
      days_until_deadline: daysUntilDeadline,
      completed_matches: completedMatches,
      total_required_matches: totalRequiredMatches,
      progress_percentage: progressPercentage,
      deadline_date: deadlineDate,
      remaining_matches: remainingMatches,
      urgency_level: urgencyLevel,
      app_url: "https://newapp-1-ic1v.onrender.com"
    },
    'g6vqrOs_Jb6LL1VCZ'
  );
}

// Sends payment instructions email after registration
export function sendPaymentInstructionsEmail({
  to_email,
  to_name,
  registrationId,
  registrationDate,
  registrationFee,
  paymentMethods = [],
  additionalInstructions = '',
  contactInfo = {}
}) {
  if (!to_email || to_email === "undefined") {
    console.error("Recipient email is missing. Cannot send payment instructions.");
    return Promise.reject(new Error("Recipient email is missing."));
  }

  // Build payment methods list
  const paymentMethodsList = paymentMethods.length > 0 ? 
    paymentMethods.map((method, index) => {
      let instruction = method.instructions;
      
      // Add specific details for each method
      if (method.key === 'venmo' && method.username) {
        instruction = `Send payment to @${method.username}`;
      } else if (method.key === 'cashapp' && method.username) {
        instruction = `Send payment to $${method.username}`;
      } else if (method.key === 'paypal' && method.email) {
        instruction = `Send payment to ${method.email}`;
      } else if (method.key === 'creditCard' && method.paymentLink) {
        instruction = `Pay securely online: ${method.paymentLink}`;
      } else if (method.key === 'applePay' && method.paymentLink) {
        instruction = `Pay with Apple Pay: ${method.paymentLink}`;
      } else if (method.key === 'googlePay' && method.paymentLink) {
        instruction = `Pay with Google Pay: ${method.paymentLink}`;
      } else if (method.key === 'check' && method.payeeName) {
        instruction = `Make check payable to ${method.payeeName}`;
      }
      
      return `${index + 1}. **${method.displayName}:** ${instruction}`;
    }).join('\n') : 
    `1. **Cash:** Pay in person to league administrator`;

  // Build contact info
  const contactInfoText = contactInfo && (contactInfo.email || contactInfo.phone || contactInfo.name) ? 
    `\n\n**For payment questions, contact:**\n${contactInfo.name ? `Name: ${contactInfo.name}\n` : ''}${contactInfo.email ? `Email: ${contactInfo.email}\n` : ''}${contactInfo.phone ? `Phone: ${contactInfo.phone}` : ''}` : '';

  return emailjs.send(
    'service_l5q2047',
    'template_payment_instructions', // You'll need to create this template in EmailJS
    {
      to_email,
      to_name,
      registration_id: registrationId,
      registration_date: registrationDate,
      registration_fee: registrationFee,
      payment_instructions: `
        **League Registration Payment Instructions**
        
        Registration Fee: $${registrationFee}
        Registration ID: ${registrationId}
        
        **Payment Methods:**
${paymentMethodsList}
        
        ${additionalInstructions ? `\n**Additional Instructions:**\n${additionalInstructions}\n` : ''}
        
        **Important Notes:**
        • Include your Registration ID (${registrationId}) in payment notes
        • Payment must be completed within 7 days
        • Your PIN will be sent once payment is confirmed
        • Contact league admin if you have payment issues${contactInfoText}
        
        **Next Steps:**
        1. Complete payment using one of the methods above
        2. Wait for payment confirmation email
        3. You'll receive your unique PIN and full access
      `,
      app_url: "https://newapp-1-ic1v.onrender.com"
    },
    'g6vqrOs_Jb6LL1VCZ'
  );
}

// Sends payment confirmation and PIN email
export function sendPaymentConfirmationEmail({
  to_email,
  to_name,
  pin,
  division
}) {
  if (!to_email || to_email === "undefined") {
    console.error("Recipient email is missing. Cannot send payment confirmation.");
    return Promise.reject(new Error("Recipient email is missing."));
  }

  return emailjs.send(
    'service_l5q2047',
    'template_payment_confirmation', // You'll need to create this template in EmailJS
    {
      to_email,
      to_name,
      pin,
      division: division || 'To be assigned',
      app_url: "https://newapp-1-ic1v.onrender.com",
      login_instructions: `
        **Welcome to the League!**
        
        Your PIN: **${pin}**
        Division: ${division || 'To be assigned by admin'}
        
        **How to Access Your Account:**
        1. Go to the league app
        2. Click "Login" or "Access Account"
        3. Enter your email and PIN: ${pin}
        4. You now have full access to schedule matches!
        
        **Keep Your PIN Secure:**
        • Don't share your PIN with others
        • Use it to verify match results
        • Contact admin if you need to reset it
        
        **Getting Started:**
        • Browse available players in your area
        • Schedule matches at your preferred locations
        • Report match results using your PIN
      `
    },
    'g6vqrOs_Jb6LL1VCZ'
  );
}
