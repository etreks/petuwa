import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple .env parser to ensure environment variables are loaded in both dev and production
export function loadEnv() {
  const envPath = path.resolve(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
    } catch (e) {
      console.warn('Could not read .env file:', e);
    }
  }
}

// Initial load
loadEnv();

/**
 * Dispatches real SMS OTP across configured telecom gateway providers
 * @param {string} rawPhone - Recipient phone number (e.g. 8815843213)
 * @param {string} otp - 6-digit verification code
 * @returns {Promise<{ success: boolean, provider: string, message: string, details?: any }>}
 */
export async function dispatchRealSms(rawPhone, otp) {
  loadEnv(); // Reload to pick up fresh env keys immediately

  const cleanPhone = String(rawPhone || '').replace(/\D/g, '').slice(-10);
  if (cleanPhone.length < 10) {
    return { success: false, provider: 'none', message: 'Invalid 10-digit phone number' };
  }

  console.log(`\n========================================`);
  console.log(`📡 [SMS GATEWAY DISPATCH INITIATED]`);
  console.log(`📲 Target Mobile: +91 ${cleanPhone}`);
  console.log(`🔑 Verification Code: ${otp}`);

  // 1. Check Fast2SMS
  if (process.env.FAST2SMS_API_KEY) {
    try {
      console.log(`🚀 Attempting delivery via Fast2SMS gateway...`);
      const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': process.env.FAST2SMS_API_KEY.trim(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: otp,
          numbers: cleanPhone
        })
      });
      const data = await res.json();
      console.log(`📥 Fast2SMS Response:`, data);
      if (data.return === true || data.status_code === 200 || data.message?.[0]?.includes('Success')) {
        console.log(`✅ [SMS DELIVERED] Successfully dispatched via Fast2SMS to +91 ${cleanPhone}`);
        return { success: true, provider: 'Fast2SMS', message: 'SMS delivered to phone', details: data };
      } else {
        console.warn(`⚠️ Fast2SMS rejected: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      console.error(`❌ Fast2SMS dispatch error:`, err);
    }
  }

  // 2. Check 2Factor.in
  if (process.env.TWOFACTOR_API_KEY) {
    try {
      console.log(`🚀 Attempting delivery via 2Factor.in gateway...`);
      const url = `https://2factor.in/API/V1/${encodeURIComponent(process.env.TWOFACTOR_API_KEY.trim())}/SMS/${cleanPhone}/${otp}/PURR_OTP`;
      const res = await fetch(url);
      const data = await res.json();
      console.log(`📥 2Factor Response:`, data);
      if (data.Status === 'Success') {
        console.log(`✅ [SMS DELIVERED] Successfully dispatched via 2Factor to +91 ${cleanPhone}`);
        return { success: true, provider: '2Factor', message: 'SMS delivered to phone', details: data };
      } else {
        console.warn(`⚠️ 2Factor rejected: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      console.error(`❌ 2Factor dispatch error:`, err);
    }
  }

  // 3. Check Twilio
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      console.log(`🚀 Attempting delivery via Twilio SMS gateway...`);
      const accountSid = process.env.TWILIO_ACCOUNT_SID.trim();
      const authToken = process.env.TWILIO_AUTH_TOKEN.trim();
      const fromNumber = process.env.TWILIO_PHONE_NUMBER.trim();
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const params = new URLSearchParams({
        To: `+91${cleanPhone}`,
        From: fromNumber,
        Body: `Your Purr verification code is: ${otp}. Valid for 5 minutes.`
      });

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const data = await res.json();
      console.log(`📥 Twilio Response:`, data);
      if (data.sid && !data.error_code) {
        console.log(`✅ [SMS DELIVERED] Successfully dispatched via Twilio to +91 ${cleanPhone}`);
        return { success: true, provider: 'Twilio', message: 'SMS delivered to phone', details: data };
      } else {
        console.warn(`⚠️ Twilio error: ${data.message}`);
      }
    } catch (err) {
      console.error(`❌ Twilio dispatch error:`, err);
    }
  }

  // 4. Check MSG91
  if (process.env.MSG91_AUTH_KEY) {
    try {
      console.log(`🚀 Attempting delivery via MSG91 gateway...`);
      const templateId = process.env.MSG91_TEMPLATE_ID || '';
      const url = `https://api.msg91.com/api/v5/otp?template_id=${templateId}&mobile=91${cleanPhone}&authkey=${process.env.MSG91_AUTH_KEY.trim()}&otp=${otp}`;
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      console.log(`📥 MSG91 Response:`, data);
      if (data.type === 'success') {
        console.log(`✅ [SMS DELIVERED] Successfully dispatched via MSG91 to +91 ${cleanPhone}`);
        return { success: true, provider: 'MSG91', message: 'SMS delivered to phone', details: data };
      }
    } catch (err) {
      console.error(`❌ MSG91 dispatch error:`, err);
    }
  }

  console.warn(`⚠️ [NO SMS GATEWAY CONFIGURED]`);
  console.warn(`To deliver real SMS messages to +91 ${cleanPhone}, set FAST2SMS_API_KEY, TWOFACTOR_API_KEY, or TWILIO credentials in Code/Website/.env`);
  console.log(`========================================\n`);

  return {
    success: false,
    provider: 'none',
    message: 'No SMS Gateway API configured yet. Add API key in .env',
    otp // Kept for server fallback
  };
}
