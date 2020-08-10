const { Mongoose } = require("mongoose")

const mongodb='mongodb://localhost:27017/mydb'
const connect=Mongoose.createConnection(mongodb,{
    useNewUrlParser:true,
    userUnifiedTopology:true
})