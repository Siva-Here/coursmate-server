const mongoose = require("mongoose");
const User = require("../model/User");
const Document = require("../model/Document");
const Folder = require("../model/Folder");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { jwtDecode } = require('jwt-decode');
const { sendFcmMessage } = require('../firebase/sendNotification');
require("dotenv").config();

// Configure multer to save files with a timestamp and original filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Temporarily save in 'uploads' folder
  },
  filename: (req, file, cb) => {
    // Sanitize file name
    const originalFileName = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, '_'); 
    const fileExtension = path.extname(file.originalname).toLowerCase(); // Ensure extension is lowercase
    const timestamp = new Date().toISOString().replace(/[-:.]/g, ''); // Generate a timestamp
    const filename = `${originalFileName}_${timestamp}${fileExtension}`; // Combine them
    cb(null, filename);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    allowedTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error("Invalid file type. Only PDF, PPT, PPTX, and DOCX files are allowed."));
  },
  limits: {
    fileSize: 30 * 1024 * 1024, // 30 MB
  },
}).single("file");

const uploadDocument = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File is too large. Maximum size allowed is 30MB." });
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const { name, parentFolder, uploadedBy } = req.body;
    const bearerHeader = req.headers['authorization'];

    if (!bearerHeader) {
      return res.status(403).json({ message: "Authorization token is required" });
    }

    const bearerToken = bearerHeader.split(' ')[1];

    if (!name || !parentFolder || !uploadedBy) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate that uploadedBy is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(uploadedBy)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    try {
      // Decode the token and find the user
      const decodedToken = jwtDecode(bearerToken);
      const user = await User.findById(uploadedBy);

      // Check if user exists and matches the token
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (decodedToken.email !== user.email) {
        return res.status(401).json({ message: "User Not Allowed!!!" });
      }

      // File operations are only done after successful validation
      const originalFileName = req.file.originalname;
      const securePath = path.join("secure_uploads", req.file.filename); // Filename with timestamp and original name
      const localhostLink = `http://localhost:5000/uploads/${req.file.filename}`;

      // Move the file to the secure directory
      fs.mkdirSync("secure_uploads", { recursive: true });
      fs.renameSync(req.file.path, securePath);

      // Create a new document entry
      const newDocument = new Document({
        name,
        parentFolder,
        uploadedBy,
        viewLink: localhostLink,
        downloadLink: localhostLink,
        rscLink: securePath,
      });

      const savedDocument = await newDocument.save();

      // Notify admins about the new document
      const parentFolderDoc = await Folder.findById(savedDocument.parentFolder);
      if (!parentFolderDoc) {
        return res.status(404).json({ message: "Parent folder not found" });
      }

      let body = `Document uploaded in ${parentFolderDoc.name}`;
      const grandParentFolder = await Folder.findById(parentFolderDoc.parentFolder);
      body += grandParentFolder ? `, under ${grandParentFolder.name} to be accepted` : ' in GATE';

      const title = newDocument.name;

      const adminUsers = await User.find({ isAdmin: true, token: { $exists: true, $ne: null } });
      const tokens = adminUsers.map(admin => admin.token);
      const success = await sendFcmMessage(tokens, title, body);

      success ? console.log("Notification sent successfully") : console.log("Failed to send some notifications");

      return res.status(201).json({
        message: "Document saved successfully",
        document: savedDocument
      });
    } catch (error) {
      console.error("Error uploading document:", error);

      // Clean up the uploaded file if an error occurs
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(500).json({ error: "Failed to upload the document" });
    }
  });
};

const deleteDocument = async (req, res) => {
  const { docId } = req.body;
  try {
    const document = await Document.findById(docId);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const parentFolder = await Folder.findById(document.parentFolder);
    if (parentFolder) {
      parentFolder.isSubject = parentFolder.isSubject ?? false;
      parentFolder.isSem = parentFolder.isSem ?? false;
      parentFolder.contents = parentFolder.contents.filter(
        (id) => id.toString() !== docId
      );
      await parentFolder.save();
    }

    const user = await User.findById(document.uploadedBy);
    if (user) {
      user.totalUploaded -= 1;
      user.uploadedDocs = user.uploadedDocs.filter(
        (id) => id.toString() !== docId
      );
      await user.save();
    }

    fs.unlinkSync(path.join("secure_uploads", path.basename(document.rscLink)));

    await Document.findByIdAndDelete(docId);

    res.status(200).json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const acceptDocument = async (req, res) => {
  const { docId } = req.body;

  try {
    const document = await Document.findById(docId);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    document.isAccepted = true;
    await document.save();

    const user = await User.findById(document.uploadedBy);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    await User.findByIdAndUpdate(document.uploadedBy, { $inc: { totalUploaded: 1 } });

    const parentFolder = await Folder.findById(document.parentFolder);
    if (!parentFolder) {
      return res.status(404).json({ message: "Parent folder not found" });
    }
    parentFolder.contents.push(docId);
    await parentFolder.save();

    res.status(200).json({ message: "Document accepted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getDocs = async (req, res) => {
  try {
    // Fetch documents and populate the uploadedBy field with the user information
    const docs = await Document.find().populate('uploadedBy', 'username email');

    // Format the documents to exclude fileId and include _id, username for uploadedBy
    const formattedDocs = docs.map(doc => ({
      _id: doc._id,
      name: doc.name,
      parentFolder: doc.parentFolder,
      avgRating: doc.avgRating,
      uploadedBy: doc.uploadedBy.username,
      createdAt: doc.createdAt,
      rscLink: doc.rscLink,
      viewLink: doc.viewLink,
      downloadLink: doc.downloadLink,
      isAccepted: doc.isAccepted
    }));

    if (formattedDocs.length > 0) {
      res.status(200).json({ docs: formattedDocs });
    } else {
      res.status(404).json({ message: "No docs found..." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getDocs,
  uploadDocument,
  deleteDocument,
  acceptDocument,
};
