const express = require("express");
const {
  deleteDocument,
  uploadDocument,
  acceptDocument,
  getDocs,
} = require("../controllers/documentController");
const auth = require("../middlewares/auth");
const authAdmin = require("../middlewares/authAdmin");

const router = express.Router();
router.get("/docs",auth,getDocs);
router.post("/upload", auth, uploadDocument);
router.post("/accept", authAdmin, acceptDocument);
router.delete("/", authAdmin, deleteDocument);
module.exports = router;
