const Assessment = require('../models/assessment');
const Submission = require('../models/submission');
const User = require('../models/user');

const assessmentIdExists = async(id)=>{
    const isIdValid = await Assessment.findById(id);

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

module.exports = {
    assessmentIdExists,
    submissionIdExists,
    userIdExists,
}