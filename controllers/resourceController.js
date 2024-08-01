const Resource = require('../model/Resource');
const Folder = require('../model/Folder');
const User = require('../model/User');
const mongoose = require('mongoose');
const { jwtDecode } = require('jwt-decode');
const { sendFcmMessage } = require('../firebase/sendNotification');
const nodemailer = require('nodemailer');
require('dotenv').config();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const sendMail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.USERNAME,
        pass: process.env.PASSWORD
      }
    });

    const mailOptions = {
      from: {
        name: "COURSMATE",
        address: process.env.USERNAME
      },
      to: to,
      subject: subject,
      text: text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

const createResource = async (req, res) => {
  const { name, description, rscLink, folderId, userId } = req.body;
  const { email } = req.userdata;

  // Validate folderId and userId
  if (!isValidObjectId(folderId)) {
    return res.status(400).json({ message: 'Invalid folderId' });
  }
  if (!isValidObjectId(userId)) {
    return res.status(400).json({ message: 'Invalid userId' });
  }

  const bearerHeader = req.headers['authorization'];
  if (!bearerHeader) {
    return res.status(403).json({ message: "Authorization token is required" });
  }

  const bearerToken = bearerHeader.split(' ')[1];

  try {
    const decodedToken = jwtDecode(bearerToken);
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (decodedToken.email !== user.email) {
      return res.status(401).json({ message: "User Not Allowed!!!" });
    }

    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    const authPlacement = (process.env.ADMIN_EMAILS.split(",").includes(email)) || (process.env.PLACEMENT_EMAILS.split(",").includes(email));
    const newResource = new Resource({
      name: name.trim(),
      description: description.trim(),
      rscLink: rscLink.trim(),
      uploadedBy: user._id,
      parentFolder: folder._id,
      byAdmin: user.isAdmin,
      isAccepted: (folder.name === "placements" || folder.name === "Job Updates") && authPlacement,
      isPlacement: (folder.name === "placements" || folder.name === "Job Updates") && authPlacement,
      isJobUpdate: (folder.name === "Job Updates")
    });

    const savedResource = await newResource.save();

    await user.save();

    const title = newResource.name;
    const body = `Resource "${newResource.name}" uploaded in ${folder.name} folder to be accepted`;

    const adminUsers = await User.find({ isAdmin: true, token: { $exists: true, $ne: null } });
    const adminTokens = adminUsers.map(admin => admin.token);

    // Send push notifications to admin users
    const adminNotificationPromise = sendFcmMessage(adminTokens, title, body);

    let placementNotificationPromise = Promise.resolve();
    if (folder.name === "placements") {
      if ((!process.env.ADMIN_EMAILS.split(",").includes(email)) || (!process.env.PLACEMENT_EMAILS.split(",").includes(email))) {
        return res.status(401).json({ message: "Unauthorized to add a placement" });
      }
      const placementTitle = name;
      const placementBody = `${name} brochure uploaded in placements`;

      const users = await User.find({ token: { $exists: true, $ne: null } });
      const userTokens = users.map(user => user.token);

      // Send push notifications to all users
      // placementNotificationPromise = sendFcmMessage(userTokens, placementTitle, placementBody);
    }

    // Wait for all notifications to be sent
    await Promise.all([adminNotificationPromise, placementNotificationPromise]);

    // Send emails if placement notifications were sent successfully
    if (folder.name === "placements") {
      try {
        // Retrieve all user emails
        const allUsers = await User.find({}, 'email');
        // const allEmails = allUsers.map(user => user.email);
        const allEmails =["sivahere9484@gmail.com"];
        // Send email to all users
        const emailSubject = `New Placement Resource: ${name}`;
        const emailText = `A new placement resource "${name}" has been uploaded. Check it out!`;

        // Send email
        await sendMail(allEmails, emailSubject, emailText);
        console.log("Emails sent successfully");
      } catch (error) {
        console.error("Error sending emails:", error);
      }
    }

    // Return response after notifications
    return res.status(201).json(savedResource);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};


const getAllResource = async (req, res) => {
  try {
    const resources = await Resource.find().select();
    // note
    const updatedResources = await Promise.all( 
      resources.map(async (resource) => {
        const user = await User.findById(resource.uploadedBy).select('username');
        return {
          ...resource._doc,
          uploadedBy: user ? user.username : 'Unknown'
        };
      })
    );

    res.status(200).json(updatedResources);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};


const deleteResource = async (req, res) => {
  const { rscId } = req.body;

  try {
    const resource = await Resource.findById(rscId);
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Get the user who uploaded the resource
    const user = await User.findById(resource.uploadedBy);
    console.log(user);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update the user's totalUploaded count to decrement by 0
    await User.findByIdAndUpdate(user._id, { $inc: { totalUploaded: -0 } });

    // Delete the resource from the database
    await Resource.findByIdAndDelete(rscId);

    res.status(200).json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const acceptResource = async (req, res) => {
  const { rscId } = req.body;

  try {
    // Validate rscId
    if (!rscId) {
      return res.status(400).json({ message: 'Resource ID is required' });
    }

    // Find the resource
    const resource = await Resource.findById(rscId);
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Update the isAccepted field
    resource.isAccepted = true;
    await resource.save();

    // Increment the totalUploaded count of the user who uploaded the resource
    const user = await User.findById(resource.uploadedBy);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await User.findByIdAndUpdate(resource.uploadedBy, { $inc: { totalUploaded: 1 } });

    // Retrieve the parent folder
    const parentFolder = await Folder.findById(resource.parentFolder);
    if (!parentFolder) {
      return res.status(404).json({ message: 'Parent folder not found' });
    }

    // Retrieve the parent of the parent folder (grandparent folder)
    let grandParentFolder;
    if (parentFolder.parentFolder) {
      grandParentFolder = await Folder.findById(parentFolder.parentFolder);
    }

    // Use both parent and grandparent folder names in the notification body
    const title = resource.name;
    let body = `Resource uploaded in ${parentFolder.name}`;
    if (grandParentFolder) {
      body += `, under ${grandParentFolder.name}`;
    }

    // Send notification to all users with valid tokens
    const users = await User.find({ token: { $exists: true, $ne: null } });

    // Extract tokens from users
    const tokens = users.map(user => user.token);

    // Send FCM message with tokens array
    const notificationResult = await sendFcmMessage(tokens, title, body);

    if (notificationResult) {
      res.status(200).send({ message: "Notification sent successfully" });
    } else {
      res.status(200).send({ message: "Failed to send notifications" });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const createPost = async (req, res) => {
  const { name, description, posts, uploadedBy, parentFolder, rscLink } = req.body;

  if (!Array.isArray(posts) || posts.length === 0 || posts.includes('')) {
    return res.status(400).json({ message: 'Invalid posts provided' });
  }

  // Validate uploadedBy and parentFolder
  if (!isValidObjectId(uploadedBy)) {
    return res.status(400).json({ message: 'Invalid uploadedBy' });
  }
  if (!isValidObjectId(parentFolder)) {
    return res.status(400).json({ message: 'Invalid parentFolder' });
  }

  const bearerHeader = req.headers['authorization'];
  if (!bearerHeader) {
    return res.status(403).json({ message: "Authorization token is required" });
  }

  const bearerToken = bearerHeader.split(' ')[1];

  try {
    const decodedToken = jwtDecode(bearerToken);
    const user = await User.findById(uploadedBy);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (decodedToken.email !== user.email) {
      return res.status(401).json({ message: "User Not Allowed!!!" });
    }

    const folder = await Folder.findById(parentFolder);
    if (!folder && folder.name==="Posts") {
      return res.status(404).json({ message: 'Folder not found' });
    }

    const newResource = new Resource({
      name:name.trim(),
      description:description.trim(),
      rscLink: rscLink.trim() || null,
      uploadedBy: user._id,
      parentFolder: folder._id,
      posts: posts,
      isPost: true,
      isPlacement: false,
    });

    const savedResource = await newResource.save();

    return res.status(201).json(savedResource);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createResource, deleteResource,getAllResource, acceptResource,createPost };