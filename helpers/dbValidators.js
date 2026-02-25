const Assessment = require('../models/assessment');
const Church = require('../models/church');
const Group = require('../models/group');
const Group360 = require('../models/group360');
const Result = require('../models/result');
const Submission = require('../models/submission');
const Submission360 = require('../models/submission360');
const User = require('../models/user');

const assessmentIdExists = async(id)=>{
    const isIdValid = await Assessment.findById(id);

    if(!isIdValid){
        throw new Error('Id not valid');
    }
}

const resultIdExists = async(id)=>{
    const isIdValid = await Result.findById(id);

    if(!isIdValid){
        throw new Error('Id not valid');
    }
}

const submissionIdExists = async(id)=>{
    const isIdValid = await Submission.findById(id);

    if(!isIdValid){
        throw new Error('Id not valid');
    }
}
const userIdExists = async(id)=>{
    const isIdValid = await User.findById(id);

    if(!isIdValid){
        throw new Error('Id not valid');
    }
}

const churchIdExists = async(id)=>{
    const isIdValid = await Church.findById(id);

    if(!isIdValid){
        throw new Error('Id not valid');
    }
}

const groupIdExists = async(id)=>{
    const isIdValid = await Group.findById(id);

    if(!isIdValid){
        throw new Error('Id not valid');
    }
}

const group360IdExists = async(id)=>{
    const isIdValid = await Group360.findById(id);

    if(!isIdValid){
        throw new Error('Id not valid');
    }
}

const submission360IdExists = async(id)=>{
    const isIdValid = await Submission360.findById(id);

    if(!isIdValid){
        throw new Error('Id not valid');
    }
}

module.exports = {
    assessmentIdExists,
    churchIdExists,
    groupIdExists,
    group360IdExists,
    resultIdExists,
    submissionIdExists,
    submission360IdExists,
    userIdExists,
}