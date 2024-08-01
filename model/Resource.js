const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const resourceSchema = new Schema({
  name: { type: String, required: true },  
  description: { type: String, required: true },  
  rscLink: { type: String, required: true,default:null },  
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },  
  uploadedAt: { type: Date, default: Date.now },  
  parentFolder: { type: Schema.Types.ObjectId, ref: 'Folder' },
  byAdmin:{
    type:Boolean,required:false
  },
  isAccepted:{
    type:Boolean,required:false,default:false
  },
  isPlacement:{
    type:Boolean,required:false,default:false
  }, 
  isPost:{
    required:false,
    type:Boolean,
  },
  posts:{
    type: [{ type: String}],
    required:false,
    default:[],
  },
  isJobUpdate:{
    type:Boolean,
    default:false
  },
});



const Resource = mongoose.model('Resource', resourceSchema);

module.exports = Resource;
