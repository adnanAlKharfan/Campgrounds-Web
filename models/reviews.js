const mangoose = require('mongoose')
const schema = new mangoose.Schema({
    body: { type: String, required: true },
    stars: {
        type: Number,
        required: true,
        min: 0,
        max: 5
    }, author: { type: mangoose.Types.ObjectId, ref: 'User' }
})

module.exports = new mangoose.model('Review', schema)