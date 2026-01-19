const mongoose = require('mongoose');
require('dotenv').config();

const dbConnection = async()=>{
    try {
        await mongoose.connect(process.env.MONGODB,{
            dbName:"RiseUp",
        })
        console.log("DB Online")
    } catch (error) {
        console.log("DBERROR",error);
        throw new Error('Error while starting the DB')
    }
}

module.exports = {
    dbConnection
}