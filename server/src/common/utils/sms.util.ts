import { env } from '../../config/env.config';
import { logger } from '../../config/logger.config';

export interface SmsSendResult {
  success: boolean;
  messageId: string;
  provider: 'ssl_wireless' | 'twilio' | 'mock';
}

/**
 * Dispatches an SMS containing OTP or critical notification.
 * Integrates SSL Wireless (primary for BD) with Twilio fallback and mock in dev/test.
 */
export const dispatchSms = async (
  phoneNumber: string,
  messageText: string
): Promise<SmsSendResult> => {
  // If in dev or test or using dummy keys, use mock provider
  const isMock =
    env.NODE_ENV !== 'production' ||
    env.SSL_WIRELESS_API_KEY === 'dummy_ssl_key' ||
    !env.SSL_WIRELESS_API_KEY;

  if (isMock) {
    logger.info(`[SMS Dispatch MOCK] To: ${phoneNumber} | Message: "${messageText}"`);
    return {
      success: true,
      messageId: `mock_sms_${Date.now()}`,
      provider: 'mock',
    };
  }

  // Primary: SSL Wireless (Bangladesh domestic aggregator)
  try {
    const payload = {
      api_token: env.SSL_WIRELESS_API_KEY,
      sid: env.SSL_WIRELESS_SID,
      msisdn: phoneNumber,
      sms: messageText,
      csms_id: `SR_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    };

    const response = await fetch(env.SSL_WIRELESS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = (await response.json()) as { status?: string; smsinfo?: Array<{ csms_id?: string }> };
      logger.info(`SSL Wireless SMS successfully sent to ${phoneNumber}`);
      return {
        success: true,
        messageId: data.smsinfo?.[0]?.csms_id || payload.csms_id,
        provider: 'ssl_wireless',
      };
    }

    logger.warn(`SSL Wireless returned status ${response.status}. Attempting Twilio failover...`);
  } catch (sslError) {
    logger.error('SSL Wireless SMS dispatch failure:', { error: sslError });
  }

  // Failover: Twilio
  try {
    if (env.TWILIO_ACCOUNT_SID && env.TWILIO_ACCOUNT_SID !== 'dummy_twilio_sid') {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
      const authHeader = `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64')}`;

      const formData = new URLSearchParams();
      formData.append('To', phoneNumber);
      formData.append('MessagingServiceSid', env.TWILIO_SERVICE_SID);
      formData.append('Body', messageText);

      const twilioRes = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (twilioRes.ok) {
        const data = (await twilioRes.json()) as { sid: string };
        logger.info(`Twilio failover SMS successfully sent to ${phoneNumber}`);
        return {
          success: true,
          messageId: data.sid,
          provider: 'twilio',
        };
      }
    }
  } catch (twilioError) {
    logger.error('Twilio failover SMS dispatch failure:', { error: twilioError });
  }

  logger.error(`All SMS gateways failed for ${phoneNumber}`);
  return {
    success: false,
    messageId: '',
    provider: 'ssl_wireless',
  };
};

/**
 * Formats standard bilingual OTP SMS content for Bangladesh users.
 */
export const buildOtpMessage = (otp: string, appSignature?: string): string => {
  const baseMessage = `<#> Your SecureRide verification code is: ${otp}. Valid for 2 minutes. Do not share with anyone. / আপনার সিকিউররাইড ওটিপি কোড: ${otp}`;
  if (appSignature) {
    return `${baseMessage}\n${appSignature}`;
  }
  return baseMessage;
};

