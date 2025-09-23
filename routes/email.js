const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    initializeTransporter() {
        if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            this.transporter = nodemailer.createTransporter({
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT || 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });
        }
    }

    async sendEmail({ to, subject, html, text }) {
        try {
            if (!this.transporter) {
                console.log('Email service not configured');
                return { success: false, message: 'Email service not configured' };
            }

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: to,
                subject: subject,
                html: html,
                text: text
            };

            const result = await this.transporter.sendMail(mailOptions);

            return {
                success: true,
                messageId: result.messageId
            };

        } catch (error) {
            console.error('Email sending error:', error);
            return {
                success: false,
                message: 'Failed to send email'
            };
        }
    }

    async sendSOSAlert(email, touristName, location) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0;">🚨 EMERGENCY SOS ALERT</h1>
                </div>
                <div style="padding: 20px; background-color: #f9f9f9;">
                    <h2>Emergency Assistance Required</h2>
                    <p><strong>${touristName}</strong> has activated an emergency SOS alert.</p>
                    <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <h3>Location Details:</h3>
                        <p><strong>Coordinates:</strong> ${location.lat}, ${location.lng}</p>
                        ${location.address ? `<p><strong>Address:</strong> ${location.address}</p>` : ''}
                        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0;">
                        <h3>Action Taken:</h3>
                        <ul>
                            <li>✅ Local authorities have been notified</li>
                            <li>✅ Emergency services are being dispatched</li>
                            <li>✅ Tourist location is being monitored</li>
                        </ul>
                    </div>
                    <p style="margin-top: 20px;">
                        <a href="tel:100" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Call Police (100)</a>
                    </p>
                </div>
                <div style="padding: 20px; text-align: center; background-color: #f3f4f6; color: #6b7280;">
                    <p>This is an automated alert from SafeTrip Tourist Safety System</p>
                    <p>If you received this email in error, please contact support immediately.</p>
                </div>
            </div>
        `;

        return await this.sendEmail({
            to: email,
            subject: '🚨 EMERGENCY: SOS Alert Activated',
            html: html
        });
    }

    async sendIncidentReport(email, incident) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0;">SafeTrip Incident Report</h1>
                </div>
                <div style="padding: 20px; background-color: #f9f9f9;">
                    <h2>Incident Report Filed</h2>
                    <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <h3>Report Details:</h3>
                        <p><strong>e-FIR Number:</strong> ${incident.eFIRNumber}</p>
                        <p><strong>Type:</strong> ${incident.type.toUpperCase()}</p>
                        <p><strong>Title:</strong> ${incident.title}</p>
                        <p><strong>Description:</strong> ${incident.description}</p>
                        <p><strong>Location:</strong> ${incident.location.lat}, ${incident.location.lng}</p>
                        <p><strong>Filed At:</strong> ${incident.filedAt}</p>
                        <p><strong>Status:</strong> ${incident.status.toUpperCase()}</p>
                    </div>
                    <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 15px 0;">
                        <p><strong>What's Next:</strong></p>
                        <ul>
                            <li>Your incident has been assigned a unique e-FIR number</li>
                            <li>Relevant authorities have been notified</li>
                            <li>You will receive updates on the investigation progress</li>
                        </ul>
                    </div>
                </div>
                <div style="padding: 20px; text-align: center; background-color: #f3f4f6; color: #6b7280;">
                    <p>SafeTrip Tourist Safety System - Government of India</p>
                </div>
            </div>
        `;

        return await this.sendEmail({
            to: email,
            subject: `Incident Report Filed - ${incident.eFIRNumber}`,
            html: html
        });
    }
}

module.exports = new EmailService();
