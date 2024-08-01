const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const folderSchema = new Schema({
  name: { type: String, required: true }, 
  parentFolder: { type: Schema.Types.ObjectId, ref: 'Folder' }, 
  subfolders: [{ type: Schema.Types.ObjectId, ref: 'Folder' }], 
  contents: [{ type: Schema.Types.ObjectId, ref: 'Document' }], 
  createdAt: { type: Date, default: Date.now },
  isSubject:{
    type:Boolean,
    required:true
  },
  isSem:{
    type:Boolean,
    required:false
  }
});

const Folder = mongoose.model('Folder', folderSchema);
module.exports = Folder;