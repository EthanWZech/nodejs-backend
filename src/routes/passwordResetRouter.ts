import express from 'express';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import {prisma} from '../../prisma';


const router = express.Router();


// router.post('/api/password-reset-link', async (req, res) =>{
//   const { email } = req.body;
  
//   let transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//       user: process.env.EMAIL,
//       pass: process.env.PASSWORD
//       // clientId: process.env.OAUTH_CLIENTID,
//       // clientSecret: process.env.OAUTH_CLIENT_SECRET,
//       // refreshToken: process.env.OAUTH_REFRESH_TOKEN
//     }
//   });

//   var message = {
//     from: process.env.EMAIL,
//     to: email,
//     subject: "SE TUTORIAL - RESET PASSWORD",
//     text: "Reset your password you bozo",
//     html: "<p>Reset your password you bozo</p>"
//   };

//   transporter.sendMail(message, (err, info) => {
//     console.log(info.envelope);
//     console.log(info.messageId);
//   });
// })



router.post('/password-reset-link', async (req, res) => {
  const { email } = req.body;
  // todo: write your code here
  // 1. verify if email is in database
  const existingUser = await prisma.user.findUnique({where: {email}});
  if(!existingUser) {
    return res.status(409).json({ error: 'User not found '});
  }

  const user = req.body.user;
  const timestamp = Date.now();
  const currentDate = new Date(timestamp);

  console.log(email, currentDate.toLocaleString());

  const token = crypto.randomBytes(20).toString('hex');
  const resetLink = process.env.FRONTEND_URL + `NewPassword/${token}`;
  // // Validate the email (make sure it's registered, etc.)


  // Create a reset token and expiry date for the user
  await prisma.user.update({
    where: { email: email },
    data: {
      resetToken: token,
      resetTokenExpiry: Date.now() + 3600000, // 1 hour from now
    },
  });

  // Create a transporter object using the default SMTP transport
  const transporter = nodemailer.createTransport({
    service: 'gmail', // Use your preferred email service
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD
    }
  });

  // Email content
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset',
    text: `Click the link below to reset your password:\n\n${resetLink}\n\nIf you did not request a password reset, please ignore this email.`
    // You'd typically generate a unique link for the user to reset their password
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send({ message: 'Reset email sent successfully.' });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).send({ error: 'Failed to send reset email.' });
  }
});


router.post('/password-reset/confirm', async (req, res) => {
const { resetToken, password } = req.body;

  // 1. Find the user by the token
  const user = await prisma.user.findUnique({where: {resetToken}});
  if(!user) {
    return res.status(409).json({ error: 'User not found '});
  }
  // 2. Verify that the token hasn't expired
  if(!user.resetTokenExpiry || user.resetTokenExpiry > Date.now()){
    return res.status(400).send({error: 'Token has expired.'})
  }
  // 3. Hash the new password
  //const hashedPassword = await bcrypt.hash(password, 10);
  //Couldn't get this one to work with bcrypt

  // 4. Update the user's password in the database
  await prisma.user.update({
    where: { resetToken: resetToken },
    data: {
      password: password,
    },
  });

  // 5. Invalidate the token so it can't be used again

  // 6. Send a response to the frontend
  console.log(resetToken, password);

});


export default router;
