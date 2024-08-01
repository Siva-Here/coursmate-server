const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },  
  email: { type: String, required: true, unique: true },  
  totalUploaded: { type: Number, default: 0 },  
  uploadedDocs: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
  isAdmin:{
    type:Boolean,required:false,default:false,
  },
  token:{
    type:String,required:false,default:null,
  }
});

const User = mongoose.model('User', userSchema);   

module.exports = User;
