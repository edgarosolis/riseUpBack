const {Schema, model} = require('mongoose');

const UserSchema = Schema({
    firstName:{
        type: String,
    },
    lastName:{
        type: String,
    },
    email:{
        type:String,
        required: [true,'Email is required.'],
        unique:true,
        lowercase: true,
    },
    password:{
        type:String,
    },
    rawPassword:{
        type:String
    },
    rol:{
        type:String,
        default: "user"
    },
    permissions:{
        type: [String],
    },
    status:{
        type:Boolean,
        default: true
    },
    has360:{
        type:Boolean,
        default: false
    },
    source:{
        type:String,
        enum: ['manual', 'learnworlds'],
        default: 'manual'
    }
},{timestamps:true});

UserSchema.methods.toJSON = function(){
    const { __v,password,rawPassword,...user} = this.toObject();
    return user;
}

module.exports = model('User',UserSchema);