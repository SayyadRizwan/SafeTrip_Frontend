const axios = require('axios');

class SMSService {
    constructor() {
        this.apiKey = process.env.SMS_API_KEY;
        this.apiSecret = process.env.SMS_API_SECRET;
        this.baseURL = 'https://api.textlocal.in/send/';
    }

    async sendSMS(phoneNumbers, message) {
        try {
            if (!this.apiKey || !this.apiSecret) {
                console.log('SMS service not configured');
                return { success: false, message: 'SMS service not configured' };
            }

            const numbers = Array.isArray(phoneNumbers) ? phoneNumbers.join(',') : phoneNumbers;

            const data = {
                apikey: this.apiKey,
                numbers: numbers,
                message: message,
                sender: 'SAFETRIP'
            };

            const response = await axios.post(this.baseURL, data);

            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            console.error('SMS sending error:', error);
            return {
                success: false,
                message: 'Failed to send SMS'
            };
        }
    }

    async sendEmergencySMS(phoneNumber, touristName, location) {
        const message = `EMERGENCY ALERT: ${touristName} has activated SOS at location ${location.lat}, ${location.lng}. Time: ${new Date().toLocaleString()}. Authorities notified.`;
        return await this.sendSMS(phoneNumber, message);
    }

    async sendGeoFenceAlert(phoneNumber, touristName, fenceName) {
        const message = `SAFETY ALERT: ${touristName} has entered ${fenceName}. Please stay alert and follow safety guidelines.`;
        return await this.sendSMS(phoneNumber, message);
    }
}

module.exports = new SMSService();
