const mongoose = require('mongoose')

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useCreateIndex:true,
    useUnifiedTopology:true

})

const connect = mongoose.connection

connect.once('open', () => console.log("Connected to database"))