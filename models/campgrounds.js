const mongoose = require('mongoose')
const rev = require('./reviews')
const schema = mongoose.Schema
const campground = new schema({
    title: {
        type: String, required: [true, "missing information"]
    },
    price: {
        type: Number, required: [true, "missing information"], min: [0, "you gone under minmum"]
    },
    description: {
        type: String, required: [true, "missing information"]
    },
    location: {
        type: String, required: [true, "missing information"]
    }, image: [{
        url: {
            type: String, required: [true, "missing information"]
        }, filename: {
            type: String, required: [true, "missing information"]
        }
    }],
    reviews: [
        { type: mongoose.Types.ObjectId, ref: 'Review' }
    ], author: { type: mongoose.Types.ObjectId, ref: 'User' },
    geometry: {
        type: {
            type: String, enum: ['Point'], required: true
        }, coordinates: { type: schema.Types.Array, min: 2, max: 2, required: true }
    }
}, { toJSON: { virtuals: true } })
campground.post('findOneAndDelete', async (obj) => {
    if (obj) {
        if (obj.reviews.length > 0) {
            await rev.remove({ _id: { $in: obj.reviews } })
        }
    }
})
campground.virtual('Properties').get(function () {
    return { id: this._id, title: this.title, body: this.description.substring(0, 10) }
});
module.exports = mongoose.model('Campground', campground)