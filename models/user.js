const mongoose = require('mongoose')
const passportLocalMangoose = require('passport-local-mongoose')
const userSchema = new mongoose.Schema({
    email: {
        type: String, required: true, unique: true, trim: true
    }
})
userSchema.plugin(passportLocalMangoose)
module.exports = new mongoose.model('User', userSchema)