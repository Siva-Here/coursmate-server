const express = require("express");
const {
  createResource,
  deleteResource,
  getAllResource,
  acceptResource,
  createPost
} = require("../controllers/resourceController");
const auth = require("../middlewares/auth");
const authAdmin = require("../middlewares/authAdmin");

const router = express.Router();
router.post("/accept",authAdmin,acceptResource);
router.get("/resources",auth,getAllResource);
router.post("/create",auth, createResource);
router.delete("/",authAdmin,deleteResource);  
router.post("/addPost",auth,createPost);
module.exports = router;
