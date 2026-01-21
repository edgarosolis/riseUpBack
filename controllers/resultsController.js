const Result = require("../models/result");

const getAllResults= async(req=request,res=response)=>{
    try {
        const results = await Result.find();
        return res.json(results);
    
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }

}

const getResultById = async(req,res)=>{
    const {id} = req.params;
    try {
        const results= await Result.findById(id);
        return res.json({
            msg:'Ok',
            results,
        });
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const createResult = async(req,res=response)=>{
try {
        const result = new Result(req.body);
        await result.save();
    
        return res.json({
            msg:"Result created",
            result,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const updateResult = async(req,res)=>{
    try {
        const {id} = req.params;
        const updatedResult = await Result.findByIdAndUpdate(id,{$set:req.body},{new:true});
        return res.json({result:updatedResult,msg:"Saved correctly"});
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error});
    }
}

const deleteResult = async(req=request,res=response)=>{
    const {id} = req.params;

    //TODO or turn status to "FALSE"
    await Result.findByIdAndDelete(id);

    return res.json({
        msg:"Ok"
    })
}

module.exports = {
    getAllResults,
    getResultById,
    createResult,
    updateResult,
    deleteResult,
}
