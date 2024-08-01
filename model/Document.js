const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const documentSchema = new Schema({
  name: { type: String, required: true },  
  parentFolder: { type: Schema.Types.ObjectId, ref: 'Folder', required: true },  
  avgRating: { type: Number, default: 0 },  
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },  
  createdAt: { type: Date, default: Date.now },
  rscLink: {type: String, required: false},
  viewLink:{
    type: String, required: false
  },
  downloadLink:{
    type: String, required: false
  },
  fileId: { type: String, required:false,default:null},
  isAccepted:{
    type: Boolean, required:false,default:false
  }
});

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
