
import { clientModel, notificationModel, otpmodel } from '../../schemas/index.js';
import dotenv from 'dotenv';
import {  uploadprofile } from '../../middleware/multer/index.js';
import { createToken } from '../../middleware/jwt/index.js';
import logAction from '../../middleware/activity/index.js';
import { sender } from '../../middleware/email/email.sender.js';
dotenv.config();
export const registetration = async (req, res) => {

  const { firstName, lastName, mobileNumber, email, password, city, state, country } = req.body;

  try {
    const existingCustomer = await clientModel.findOne({
      $or: [{ email: email }, { mobileNumber: mobileNumber }]
    });

    if (existingCustomer) {
      return res.status(401).json({ message: "Email or mobile number already exists" });
    }
    const customer = await new clientModel({
      firstName,
      lastName,
      mobileNumber,
      email,
      password,
      state,
      country,
      city,
    });
    await customer.save();

    const userNotification = new notificationModel({
      recipient: customer._id, // The new customer's ID
      type: "system",
      message: `Welcome, ${firstName}! Your account has been successfully registered.`,
    });
   
    const admin = await clientModel.findOne({ role: "admin" });
    if (admin) {
      const adminNotification = new notificationModel({
        recipient: admin._id,
        type: "system",
        message: `New user registered: ${firstName} ${lastName} (${email}).`,
      });
      await adminNotification.save();
    }
    await userNotification.save();

    logAction(
      customer._id, 
      'USER_REGISTERED', 
     `A new user has joined! Name: ${firstName} ${lastName}, Email: ${email}.`,
      req
    );
    return res.status(200).json({ message: "Customer registered successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const Login = async (req, res) => {
  const { email, password, otp } = req.body;

  try {
    if (otp) {
      const otpRecord = await otpmodel.findOne({ email, otp });
      if (!otpRecord) {
        return res.status(401).json({ message: 'Invalid OTP' });
      }
      const user = await clientModel.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
    
      await otpmodel.deleteOne({ email, otp });
     
      return res.status(200).json({ message: 'Login successful with OTP!', user });
    }

    const user = await clientModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (password !== user.password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
     if (user.permissions !== 'Granted') {
      return res.status(401).json({ message: 'Your account does not have the necessary permissions to log in.' });
    }
    const accessToken = createToken(user);
   
    const cookieOptions = {
      maxAge: 24 * 60 * 60 * 1000,  
      httpOnly: true,  
      sameSite: 'None', 
      secure: process.env.NODE_ENV === 'production', 
    };
    res.cookie('token', accessToken, cookieOptions);
    res.cookie('role', user.role, cookieOptions);
    const userNotification = new notificationModel({
      recipient: user._id, 
      type: "system",
      message: `Welcome, ${user.firstName}, to Mahaluxmi Hardware. We are delighted to have you!`,
    });
    const admin = await clientModel.findOne({ role: "admin" });
    if (admin) {
      const adminNotification = new notificationModel({
        recipient: admin._id,
        type: "system",
        message: `User logged in: ${user.firstName} ${user.lastName} (${user.email}).`,
      });
      await adminNotification.save();
    }
    await userNotification.save();
    logAction(
      user._id, 
      'USER_Login', 
     `User Login: ${user.firstName} ${user.lastName} (Email: ${email}) successfully logged in.`,
      req
    );

     user.status = 'active';
       await user.save();
    return res.status(200).json({ message: 'Login successful!', user });
    
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};



export const logout = async (req, res, next) => {
   const { id } = req.user;
  try {
    // Clear token and role cookies
   res.clearCookie('token', { 
      httpOnly: true, 
      sameSite: 'None', 
      secure: process.env.NODE_ENV === 'production',  // Use 'true' for production environment
    
    });

    res.clearCookie('role', { 
      httpOnly: true, 
      sameSite: 'None', 
      secure: process.env.NODE_ENV === 'production', 
    
    });
     const user = await clientModel.findById(id);  
    if (!user) {
      return res.status(400).json({ message: "User not found." });
    }
   
    user.status = "inactive";
    await user.save();

    return res.status(200).json({ message: "Logout successful!" });
  } catch (error) {
    return next(createError(500, "An error occurred while logging out"))
  }
}

export const Profile = async (req, res) => {

  const { id } = req.user;
  try {
    const user = await clientModel.findById(id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    return res.status(200).json({
      message: 'User data',
      user
    });
  } catch (error) {
    console.error('Error during data retrieval:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
export const updateProfile = async (req, res) => {
    uploadprofile(req, res, async function (err) {
      if (err) {
        return res.status(400).json({ message: "Image upload failed. " + err.message });
      }
  
      const { id } = req.user;
      const { firstName, lastName, email, mobileNumber, city, state, country } = req.body;
  
      try {
        const user = await clientModel.findById(id);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
  
        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
        user.email = email || user.email;
        user.mobileNumber = mobileNumber || user.mobileNumber;
        user.city = city || user.city;
        user.state = state || user.state;
        user.country = country || user.country;
  
        if (req.file) {
          user.profileImage = req.file.path;
        } else if (!req.file && req.body.profileImageUpdate) {
          return res.status(400).json({ message: "No image file provided for upload." });
        }
  
        await user.save();
        logAction(
          user._id, 
          'UPDATE_PROFILE', 
        `Profile Update: ${user.firstName} ${user.lastName} (Email: ${user.email}) has updated their profile successfully.`,

          req
        );
        return res.status(200).json({ message: "Profile updated successfully", user });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
      }
    });
  };

export const updatepassword = async (req, res) => {
  try {
    const { id } = req.user; 
    const { password } = req.body;

    const user = await clientModel.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.password === password) {
      return res.status(400).json({ message: "New password and old password are the same" });
    }

    const oldPassword = user.password;
    // Update the password
    user.password = password;
    await user.save();
    logAction(
      user._id,
      'PASSWORD_UPDATE',
      `Password updated for ${user.firstName} ${user.lastName} (Email: ${user.email}). 
       Old Password : ${oldPassword}, New Password : ${password}.`,
      req
    );
    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateclientdata = async (req, res) => {
  const { _id, ...updateData } = req.body;

  if (!_id) {
    return res.status(400).json({ message: 'Client ID is required' });
  }

  try {
    const updatedClient = await clientModel.findByIdAndUpdate(_id, updateData, {
      new: true, // Returns the updated document
    });

    if (!updatedClient) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.status(200).json({
      message: 'Client updated successfully',
      data: updatedClient,
    });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ message: 'Error updating client', error });
  }
};

export const contactus = async (req, res) => {
  const { name, email, message } = req.body;
 
  try {
   
    await sender.sendMail({
     from: `"Mahaluxmi Hardware" <${email}>`,
      to: "patil.bhushan6898@gmail.com",
      subject: "New Contact Us Submission", 
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9;">
      <h2 style="text-align: center; color: #007bff;">Mahaluxmi Hardware - New Customer Inquiry</h2>

          <p><strong>Dear Admin,</strong></p>
          <p>You have received a new message from <strong>Mahalaxmi Hardware</strong> Contact Usform. Below are the details:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; background-color: #f7f7f7;"><strong>Name:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; background-color: #f7f7f7;"><strong>Email:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; background-color: #f7f7f7;"><strong>Message:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${message}</td>
            </tr>
          </table>
          <p style="margin-top: 20px;">Please respond to the message as soon as possible.</p>
          <p>Best regards,<br>${name}</p>
          <footer style="text-align: center; margin-top: 20px; color: #555;">
            <small>&copy; ${new Date().getFullYear()} Mahalaxmi Hardware. All rights reserved.</small>
          </footer>
        </div>
      `,
    });

    // Respond to the client with success
    res.status(200).json({ success: true, message: "Details saved and email sent successfully." });
  } catch (error) {
    console.error("Error in Contact Us Submission:", error);

    // Handle any errors that occur
    res.status(500).json({
      success: false,
      message: "Error saving details or sending email.",
      error: error.message || "Internal Server Error",
    });
  }
};
