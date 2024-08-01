const Folder = require('../model/Folder');
const getFolders = async (req, res) => {
    try {
        const folders = await Folder.find();
        console.log(folders[0]);
        if (folders.length === 0) {
            return res.status(404).json({ message: 'No folders found' });
        }
        res.status(200).json(folders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {getFolders};
