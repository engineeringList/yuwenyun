const mongoose = require('mongoose')

const School = new mongoose.Schema({
    // school_classess: [{ type: mongoose.Schema.Types.ObjectId, ref: 'classes' }]
    school_classess: [{
        $ref: String,
        $id: String,
        $db: String
    }],
})

School.statics = {
    fetch: function (options) {
        for (let prop in options.where) {
            if (!options.where[prop]) {
                delete options.where[prop]
            }
        }
        return this
            .find(options.where)
            .exec()
    },
}

module.exports = mongoose.model('school', School)
