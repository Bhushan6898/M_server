
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
 import { sender } from '../../middleware/email/email.sender.js';
import createOtp from 'otp-generator'
import { clientModel,LogModel,notificationModel,otpmodel  } from '../../schemas/index.js';
import logAction from '../../middleware/activity/index.js';
import { VisitorModel } from '../../schemas/vissitor.js';

dotenv.config();

export const server = (req, res) => {

  res.status(200).send('Server is alive and working!');
 
};

export const genrateotp = async (req, res) => {
  const { email } = req.body;
  try {
    // Find user by email
    const user = await clientModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email' });
    }
 if (user.permissions !== 'Granted') {
      return res.status(401).json({ message: 'Your account does not have the necessary permissions to log in.' });
    }
    // Generate OTP
    const otp = createOtp.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
      digits: true
    });

    // Save OTP in the database
    const sendotp = await otpmodel({
      email,
      otp,
      created_at: new Date(Date.now())
    });
    sendotp.save();
    logAction(
      user._id, // Assuming `user` has an `_id` field
      'OTP_GENERATED',
      `OTP generated with email: ${email}`,
      req
    );

    // Send email with the OTP
    sender.sendMail({
      from: "patil.bhushan6898@gmail.com",
      to: email,
      subject: "Your OTP Verification Code from Mahaluxmi Hardware",
      html: `
       <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verification Email</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f3f4f6;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #c6c7c8;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(90deg, #FF8C00, #FF3D00);
            color: white;
            text-align: center;
            font-size: 28px;
            font-weight: bold;
            padding: 20px;
            border-radius: 8px 8px 0 0;
        }
        .content {
            font-size: 16px;
            color: #333;
            line-height: 1.6;
            padding: 20px;
        }
        .otp {
            font-size: 30px;
            font-weight: bold;
            color: #FF4500;
            background-color: #FFF5EE;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
            width: fit-content;
            margin-left: auto;
            margin-right: auto;
            border: 2px solid #FF4500; /* Optional border for emphasis */
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            color: #ffffff;
            background-color: #FF4500;
            border-radius: 8px;
            text-decoration: none;
            font-size: 16px;
            font-weight: bold;
            margin-top: 20px;
            text-align: center;
        }
        .footer {
            text-align: center;
            font-size: 14px;
            color: #777;
            margin-top: 20px;
            background-color: #f9f9f9;
            padding: 20px;
            border-radius: 0 0 8px 8px;
        }
        a {
            color: #FF4500;
            text-decoration: none;
        }
        .footer a {
            color: #FF4500;
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">Welcome to Mahaluxmi Hardware</div>
        <div class="content">
            <p>Hello,</p>
            <p>We received a request to verify your email. Please use the OTP below to complete your verification:</p>
            <div class="otp">${otp}</div>
            <p>If you didn’t request this verification, feel free to ignore this email or contact our support team.</p>
            <a href="https://mahaluxmihardware.com" class="button">Visit Our Website</a>
            <p>Thank you for choosing Mahaluxmi Hardware!</p>
        </div>
        <div class="footer">
            <p>Mahaluxmi Hardware, Post Kalmadu, Tal. Chalisgaon, Dist. Jalgaon</p>
            <p>Need help? <a href="mailto:support@mahaluxmihardware.com">Contact Support</a></p>
        </div>
    </div>
</body>
</html>

      `,
    });
    

    return res.status(200).json({ message: 'OTP sent successfully!' });
  } catch (error) {
    console.error('Error during OTP generation:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAllUsers = async (req, res) => {


    try {
      const users = await clientModel.find();
      res.status(200).json({ message: 'User retrieved successfully', users });
    } catch (error) {
      console.error('Error retrieving Users:', error); 
      res.status(500).json({ message: 'Error retrieving Users', error: error.message });
    }
  };

export const verification = (req, res, next) => {
  const cookies = req.cookies;
  const { token, role } = cookies;

  if (!token || !role) {
    return res.status(401).json({ message: 'User not authorized. Token or role is missing.' });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ message: 'Token is not valid.' });
    }
    req.user = decodedUser;
    const { id } = decodedUser;

    // Return successful response with user id and role
    return res.status(200).json({ id, role });
  });
};

export const getNotification = async (req, res) => {
  try {
    const {  id ,role} = req.user; 
    
    let notification;

    if (role === 'admin') {
      // Admin: Retrieve all notifications
      notification = await notificationModel.find();
    } else   {
   
      notification = await notificationModel.find({ recipient: id });
    } 


    res.status(200).json({ 
      message: 'Notification retrieved successfully', 
      notification 
    });
  } catch (error) {
    console.error('Error retrieving notifications:', error);
    res.status(500).json({ 
      message: 'Error retrieving notifications', 
      error: error.message 
    });
  }
};

export const getAllLogs = async (req, res) => {
 
  
  try {
    const { page = 1, limit = 10 } = req.query; // Default pagination values

    // Pagination calculations
    const skip = (page - 1) * limit;

    // Fetch all logs with pagination
    const logs = await LogModel.find()
      .sort({ createdAt: -1 }) // Sort logs by most recent
      .skip(skip)
      .limit(Number(limit));

    const totalLogs = await LogModel.countDocuments();

    res.status(200).json({
      logs,
      total: totalLogs,
      page,
      totalPages: Math.ceil(totalLogs / limit),
    });
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ message: "Error fetching logs" });
  }
};



export const getvissitors = async (req, res) => {
   const today = new Date().toISOString().split('T')[0]; 

  try {
   
    let todayVisitor = await VisitorModel.findOne({ date: today });

    if (!todayVisitor) {
      todayVisitor = await VisitorModel.create({ date: today, count: 1 });
    } else {
      todayVisitor.count += 1;
      await todayVisitor.save();
    }

    // Get all-time total
    const allVisitors = await VisitorModel.aggregate([
      { $group: { _id: null, total: { $sum: "$count" } } }
    ]);

    const totalVisitors = allVisitors[0]?.total || 0;

    res.status(200).json({
      today: todayVisitor.count,
      total: totalVisitors,
      date: today
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to track visitor' });
  }
}

