require('dotenv').config()
const mongoose=require('mongoose')
const startDB=async()=>{
    try{
        mongoose.connect(process.env.MONGODB_URI)
        console.log('Data Base Connected successfully...')
    }
    catch(err){
        console.log('Data Base connection Failed...')
        process.exit(0)
    }
}
module.exports=startDB