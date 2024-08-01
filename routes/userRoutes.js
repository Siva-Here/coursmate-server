const express = require("express");
const {
  login,
  exists,
  top10Contributions,
} = require("../controllers/userController");
const auth = require("../middlewares/auth");
const authAdmin = require("../middlewares/authAdmin");
const router = express.Router();

router.post("/exists",auth,exists)
router.post("/login",auth,login);
router.get("/contributions",auth,top10Contributions);
module.exports = router;