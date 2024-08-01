const {jwtDecode} = require('jwt-decode');
const emails=require('../db/emails');
const verifyToken = (req, res, next) => {
  const bearerHeader = req.headers['authorization'];
  if (typeof bearerHeader !== 'undefined') {
    const bearerToken = bearerHeader.split(' ')[1];
    try {
      const decodedToken = jwtDecode(bearerToken);
      req.userdata = {email: decodedToken.email, username: decodedToken.family_name}; // Extract email from decoded token
      console.log(decodedToken);
      // Check if userEmail ends with '@rguktn.ac.in'
      if (decodedToken.email.slice(-13) === '@rguktn.ac.in') {
        console.log(decodedToken.email.indexOf('@'));
        if(emails.includes(decodedToken.email.toLowerCase())) {
          next();
        }
        else{
          res.status(401).json({error:'Unauthorized: Only CSE Mails are allowed...'});
        }
      } else {
        res.status(401).json({ error: 'Unauthorized: Email domain not allowed' });
      }
    } catch (error) {
      console.log(error)
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  } else {
    res.sendStatus(401);
  }
};

module.exports = verifyToken;
