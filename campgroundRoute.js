if (process.env.NODE_ENV !== "production") {
    require('dotenv').config()
}

const mapBox = require('@mapbox/mapbox-sdk/services/geocoding')
const geocoding = mapBox({ accessToken: process.env.MAP_BOX })
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const express = require('express')
const base = require('joi')
const mongoose = require('mongoose')
const campground = require('./models/campgrounds')
const review = require('./models/reviews')
const app = express.Router()
const session = require('express-session')
const { populate } = require('./models/campgrounds')
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "yelp-camp",
        allowed_formats: ['png', 'jpg', 'jpeg']
    },
});
const sanitizeHTML = require('sanitize-html')
const extension = (joi) => ({
    type: 'string',
    base: joi.string(),
    messages: {
        'string.escapeHTML': '{{#label}} must not include HTML!'
    }, rules: {
        escapeHTML: {
            validate(value, helpers) {
                const clean = sanitizeHTML(value, {
                    allowedTags: [], allowedAttributes: {}
                })
                if (clean !== value) return helpers.error('string.escapeHTML', { value })
                return clean
            }
        }
    }
})
const Joi = base.extend(extension)
const parser = multer({ storage: storage });
const authCamp = async (req, res, next) => {
    const { id } = req.params
    await campground.findById(id).then(async (v) => {
        if (v == null) {
            next({ status: 404, message: "not found" })
        }
        else {
            const auth = await campground.findById(id).populate('author')
            if (auth.author._id.toString() == req.user._id.toString()) {
                next()
            } else {

                next({ status: 401, message: "not authorize" })
            }
        }
    }).catch((value) => {

        next(value.message)
    })
}
const authRev = async (req, res, next) => {
    const { id, rId } = req.params

    await campground.findById(id).then(async () => {
        const auth = await campground.findById(id).populate('reviews')
        let found = false

        for (let r in auth["reviews"]) {
    
            if (auth["reviews"][r]._id.toString() == rId.toString()) {
    
                found = true
            }
        }
        if (found) {
            const auth1 = await review.findById(rId).populate('author')
            if (auth1.author._id.toString() == req.user._id.toString()) {
                next()
            } else {
                next({ status: 401, message: "not authorize" })
            }
        }
        else {
            next({ status: 404, message: "not found" })
        }
    }).catch((value) => {

        next({ status: 404, message: value.message })
    })
}
const valReview = (req, res, next) => {
    const { review } = req.body
    if (review) {
        const { error } = Joi.object({
            review: Joi.object({
                body: Joi.string().trim().min(3).required().escapeHTML(),
                stars: Joi.number().min(0).max(5).required()
            }).required()
        }).validate(req.body)
        if (error) {
            const msg = error.details.map(e => e.message).join(",")
            next({ status: 404, message: msg })
        }
        else {
            next()
        }
    }
    else {
        next({ status: 404, message: "no data found" })
    }

}
const wrapAsync = function (fn) {
    return function (req, res, next) {
        fn(req, res, next).catch((value) => {
            next({ message: value })
        })
    }
}

const val = async (req, res, next) => {
    const { camp } = req.body

    if (camp) {

        const { error } = Joi.object({
            camp: Joi.object({
                title: Joi.string().trim().min(3).required().escapeHTML(),
                price: Joi.number().min(0).required(),
                // image: Joi.string().trim().uri().required(),
                location: Joi.string().trim().required().escapeHTML(),
                description: Joi.string().trim().required().escapeHTML()
            }).required()
        }).validate(req.body)
        if (error) {
            req.files.forEach(async (value) => {
                await cloudinary.uploader.destroy(value.filename)
            })

            const msg = error.details.map(e => e.message).join(",")
            next({ message: msg })
        }
        else {
            next()
        }
    }
    else {
        next({ status: 404, message: "no data found" })
    }
}

const sch=Joi.object({
            camp: Joi.object({
                title: Joi.string().trim().min(3).required().escapeHTML(),
                price: Joi.number().min(0).required(),
                // image: Joi.string().trim().uri().required(),
                location: Joi.string().trim().required().escapeHTML(),
                description: Joi.string().trim().required().escapeHTML()
            }).required(), image: Joi.any(), deletedImage: Joi.array()
        })

const val1 = (req, res, next) => {
    const { camp } = req.body

    if (camp) {

        const { error } = sch.validate(req.body)
        if (error) {
            req.files.forEach(async (value) => {
                await cloudinary.uploader.destroy(value.filename)
            })
            const msg = error.details.map(e => e.message).join(",")
            next({ message: msg })
        }
        else {
            next()
        }
    }
    else {
        next({ status: 404, message: "no data found1" })
    }
}
const authval = async (req, res, next) => {
    if (req.isAuthenticated()) {
        next()
    }
    else {

        req.session.to = req.originalUrl
        await req.session.save()
        req.flash("err", "sign in first")
        res.redirect('/login')
    }
}
try {
    mongoose.connect("mongodb://localhost:27017/yelp-camp", {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true, useFindAndModify: true
    })
} catch (value) {
    throw new Error(value.message)
}
app.get('/', wrapAsync(async (req, res, next) => {

    await campground.find({}).then((v) => {
        let data = {
            "type": "FeatureCollection",
            "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
            "features": []
        }

        for (let index = 0; index < v.length; index++) {
            const element = v[index].geometry;

            data.features.push({ "type": "Feature", properties: v[index].Properties, geometry: { coordinates: element.coordinates } })
        }

        res.render('campground/index', { title: "our camp", all: v, data: data })
    }).catch((value) => {
        console.log(value)
        res.redirect('/')
    })

}))
app.get('/new', authval, (req, res) => {

    res.render('campground/new', { title: "add new camp" })


})

app.post('/new', authval, parser.array('image'), val, wrapAsync(async (req, res, next) => {
    if (req.files.length == 0) {
        req.flash("err", "image is required")
        res.redirect('/campground/new')
    }
    else {

        const result = await geocoding.forwardGeocode({
            query: req.body.camp.location,
            limit: 1
        }).send()

        if (result.body.features.length == 0) {
            req.files.forEach(async (value) => {
                await cloudinary.uploader.destroy(value.filename)
            })
            req.flash('err', 'please put a valid location')
            res.redirect('campground/new')
        }
        else {


            const obj = new campground({ ...req.body.camp })
            obj.author = req.user
            req.files.forEach(element => {
                const a = element.path.replace("/image/upload", "/image/upload/c_scale,h_197,w_400")
                obj.image.push({ url: a, filename: element.filename })
            });
            obj.geometry = result.body.features[0].geometry
            await obj.save()
            req.flash('success', 'success')
            res.redirect('/campground')
        }
    }
}))
app.delete('/:id/delete', authval, authCamp, wrapAsync(async (req, res, next) => {
    const { id } = req.params
    await campground.findById(id).then(async (v) => {
        v.image.forEach(async (element) => {
            await cloudinary.uploader.destroy(element.filename)
        });

    })

    await campground.findByIdAndDelete(id).then((v) => {
        req.flash('success', 'deleted')

        res.redirect('/campground')

    }).catch((value) => {
        req.flash('err', 'couldn\'t get deleted')
        res.redirect('/campground/' + id)


    })

}))
app.get('/:id/edit', authval, authCamp, wrapAsync(async (req, res, next) => {
    const { id } = req.params
    await campground.findById(id).then((v) => {
        if (!v) { res.redirect('/campground') }
        else {
            res.render('campground/edit', { p: v, title: v.title, accessToken: process.env.accessToken })
        }

    }).catch((value) => {
        res.redirect('/campground')
    })

}))
app.put('/:id/edit', authval, authCamp, parser.array('image'), val1, wrapAsync(async (req, res, next) => {
    const { id } = req.params
    await campground.findById(id).then(async (v) => {
        if (req.body.deletedImage && req.body.deletedImage.length == v.image.length && req.body.image == "") {
            req.flash("err", "there must be a one photo at least")
            res.redirect(`${id}/edit`)
        }
        else {
            if (req.body.image == "" && req.body.deletedImage) {
                req.body.deletedImage.forEach(async (element) => {
                    await cloudinary.uploader.destroy(element)
                });
                v.image = v.image.filter(item => !req.body.deletedImage.includes(item.filename))

            }
            else if (req.body.image != "" && !req.body.deletedImage) {

                req.files.forEach((value) => {

                    v.image.push({ url: value.path, filename: value.filename })
                })

            }
            else {
                req.body.deletedImage.forEach(async (element) => {
                    await cloudinary.uploader.destroy(element)
                });
                v.image = v.image.filter(item => !req.body.deletedImage.includes(item.filename))
                req.files.forEach((value) => {
                    v.image.push({ url: value.path, filename: value.filename })
                })
            }
            v.title = req.body.camp.title
            v.description = req.body.camp.description
            v.location = req.body.camp.location
            v.price = req.body.camp.price
            await v.save()
            res.redirect("/campground")
        }
    }).catch((value) => {

        req.flash("err", "no campground with that id")
        res.redirect(`/campground`)
    })



}))
app.get('/:id', wrapAsync(async (req, res, next) => {
    const { id } = req.params
    const v = await campground.findById(id).populate({
        path: 'reviews', populate: {
            path: "author"
        }
    }).populate("author")

    if (v.reviews) {
        res.render('campground/show', { title: v.title, p: v, r: v.reviews.reverse() })
    }
    else {
        res.render('campground/show', { title: v.title, p: v })
    }
}))
app.post('/:id', authval, valReview, wrapAsync(async (req, res, next) => {
    const { id } = req.params
    const v = await campground.findById(id)
    const r = new review({ ...req.body.review })
    r.author = req.user
    v.reviews.push(r)
    await r.save()
    await v.save()
    req.flash('success', 'posted')
    res.redirect(`/campground/${id}`)
}))
app.delete('/:id/review/:rId', authval, authRev, wrapAsync(async (req, res, next) => {

    const { id, rId } = req.params

    await campground.findByIdAndUpdate(id, { $pull: { reviews: rId } })
    await review.findByIdAndDelete(rId)
    req.flash('success', 'deleted')
    res.redirect(`/campground/${id}`)
}))

module.exports = app