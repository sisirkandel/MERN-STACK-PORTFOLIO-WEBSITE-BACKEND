import mongoose from "mongoose";

const dbConnection = ()=>{
    mongoose
    .connect(process.env.MONGO_URI,{
        dbName:"NEW_PORTFOLIOWEB"
    })
    .then(()=>{
        console.log("Connected to Database")
    })
    .catch((error)=>{
        console.log(`Some Error Occured While Connecting To Database: ${error}`);
    });
};

export default dbConnection;