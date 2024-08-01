const User = require("../model/User");
const Document = require("../model/Document");
const {sendFcmMessage}=require("../firebase/sendNotification");

const login = async (req, res) => {
  try {
    const { email, username } = req.userdata; // Destructure email and username from req
    const { token } = req.body;
    console.log(token);
    // Check if email, username, and token are present
    if (!email || !username) {
      return res
        .status(400)
        .json({ message: "Email, username, and token are required" });
    }

    // Find existing user by email
    const existingUser = await User.findOne({ email: email });

    if (existingUser) {
      // Update token for the existing user
      existingUser.token = token;
      await existingUser.save();
      const bool=await sendFcmMessage([existingUser.token],"Welcome To CoursMate","From Team CoursMate");
      if(bool){
        console.log("Welcome To CoursMate "+existingUser.username);
      }
      else{
        console.log("notification not sent to "+existingUser.username);
      }
      return res
        .status(200)
        .json({
          message: "Login successful",
          _id: existingUser._id,
          username: existingUser.username,
        });
    } else {
      // Validate username and email domain for new user creation
      if (!username) {
        return res
          .status(400)
          .json({ message: "Username is required to create a new user" });
      }

      if (!email.endsWith("@rguktn.ac.in")) {
        return res
          .status(400)
          .json({ message: "Email domain not allowed", login: false });
      }

      // Create new user with token
      const newUser = new User({
        username,
        email,
        token,
      });
      await newUser.save();
      return res
        .status(201)
        .json({ message: "User created successfully", user: newUser });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const exists = async (req, res) => {
  try {
    const { _id } = req.body;
    const userExists = await User.findById(_id);

    if (userExists) {
      res.status(200).json({ exists: true });
    } else {
      res.status(404).json({ exists: false });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const top10Contributions = async (req, res) => {
  try {
    const topUsers = await User.find({}, "username totalUploaded -_id")
      .sort({ totalUploaded: -1 })
      .limit(10);

    // Send the result as JSON
    res.status(200).json(topUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  login,
  exists,
  top10Contributions,
};
