const express = require("express");
const {
  getFolders
} = require("../controllers/folderController");

const auth = require("../middlewares/auth");
const authAdmin = require("../middlewares/authAdmin");

const router = express.Router();
router.get("/folders",auth,getFolders);
module.exports = router;