const mongoose = require('mongoose')
const campground = require('./models/campgrounds')
const users = require('./models/user')
const tit = require('./seedHelper.js')
mongoose.connect("mongodb://localhost:27017/yelp-camp", {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
})
const loc = require('./cities.js')

const seed = async () => {
let allUser=await users.find({})
ids=[]
for(let i in allUser){
ids.push(allUser[i]._id)
}

    await campground.deleteMany({})
    for (let i = 0; i < 50; i++) {
        const index = Math.floor(Math.random() * loc.length)
        const u = new campground({
            author: ids[Math.floor(Math.random()*ids.length)],
            description: "lorem ksmwnjwnjsjjmjm",
            price: Math.floor(Math.random() * 20) + 10
            , location: `${loc[index].city},${loc[index].state}`, title: `${tit.descriptors[Math.floor(Math.random() * tit.descriptors.length)]},${tit.places[Math.floor(Math.random() * tit.places.length)]}`
        })
        u.geometry = { type: 'Point', coordinates: [loc[index].longitude, loc[index].latitude] }
        u.image.push({ url: "https://images.unsplash.com/photo-1496886951268-3dcd336e467e", filename: "image" })
        await u.save()
    }
}
seed().then(() => {
    mongoose.connection.close()
})
