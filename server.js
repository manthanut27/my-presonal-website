// server.js
require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend (adjust if you host frontend separately)
app.use(express.static(path.join(__dirname, 'public')));

// Create transporter from environment variables
// Recommended: use a transactional email provider or Gmail App Password
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Verify transporter (optional)
transporter.verify().then(() => {
    console.log('SMTP transporter verified');
}).catch(err => {
    console.warn('Warning: SMTP transporter verification failed', err.message);
});

// POST /order -> receive order form data and email it
app.post('/order', async(req, res) => {
    try {
        const order = req.body;

        // Build order text for email
        const orderLines = [];
        orderLines.push(`<h2>New Order from website</h2>`);
        orderLines.push(`<p><strong>Time:</strong> ${new Date().toLocaleString()}</p>`);

        // Quantities (fields from frontend)
        orderLines.push('<h3>Items</h3><ul>');
        for (const [k, v] of Object.entries(order.items || {})) {
            orderLines.push(`<li>${k}: ${v}</li>`);
        }
        orderLines.push('</ul>');

        // Addons (array) and side & special
        if (order.addons) {
            orderLines.push(`<p><strong>Addons:</strong> ${Array.isArray(order.addons) ? order.addons.join(', ') : order.addons}</p>`);
        }
        orderLines.push(`<p><strong>Side:</strong> ${order.side || 'none'}</p>`);
        orderLines.push(`<p><strong>Special requests:</strong> ${(order.special || '').replace(/\n/g,'<br>') || 'None'}</p>`);
        if (order.customerName) orderLines.push(`<p><strong>Customer:</strong> ${order.customerName}</p>`);
        if (order.customerEmail) orderLines.push(`<p><strong>Email:</strong> ${order.customerEmail}</p>`);
        if (order.customerPhone) orderLines.push(`<p><strong>Phone:</strong> ${order.customerPhone}</p>`);

        const mailOptions = {
            from: `"Website Orders" <${process.env.SMTP_USER}>`,
            to: process.env.TARGET_EMAIL,
            subject: `New Order — ${new Date().toLocaleString()}`,
            html: orderLines.join('\n')
        };

        await transporter.sendMail(mailOptions);
        return res.json({ success: true, message: 'Order sent.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Failed to send order.' });
    }
});

// POST /contact -> receive contact form and email it
app.post('/contact', async(req, res) => {
    try {
        const { name, email, message } = req.body;
        const html = `
      <h2>Contact Form Submission</h2>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      <p><strong>Name:</strong> ${name || 'Anonymous'}</p>
      <p><strong>Email:</strong> ${email || 'Not provided'}</p>
      <p><strong>Message:</strong><br>${(message || '').replace(/\n/g,'<br>')}</p>
    `;
        await transporter.sendMail({
            from: `"Website Contact" <${process.env.SMTP_USER}>`,
            to: process.env.TARGET_EMAIL,
            subject: `Contact: ${name || 'Anonymous'}`,
            html
        });
        return res.json({ success: true, message: 'Message sent.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Failed to send message.' });
    }
});

// Fallback for SPA (optional)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});