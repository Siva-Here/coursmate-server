const startDB = require('../db/conn');
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();

dotenv.config(); 
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// Serve static files from 'secure_uploads' folder
app.use("/uploads", express.static("secure_uploads"));

app.use("/folder", require("../routes/folderRoutes"));
app.use("/document", require("../routes/documentRoutes"));
app.use("/resource", require("../routes/resourceRoutes"));
app.use("/user", require("../routes/userRoutes"));

startDB().then(() => {
  start();
});

const start = async () => {
  try {
    app.listen(process.env.PORT, () => { 
      console.log(`Server Running successfully on ${process.env.PORT}`); 
    });
  } catch (err) {
    console.log(err); 
  }
};
