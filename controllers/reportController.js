const Assessment = require("../models/assessment");
const Result = require("../models/result");
const Submission = require("../models/submission");

const getReportInfo = async(req,res) =>{

    const {assessmentId, userId} = req.params;

    try { 
        const submission = await Submission.findOne({assessmentId,userId,active:true});
        const assessment = await Assessment.findById(assessmentId);


        const countsBySection = {};

        assessment.sections.forEach(section => {
            const sectionId = section.customId || section._id.toString();
            countsBySection[sectionId] = {};

            section.questions.forEach(question => {
                // Buscar la respuesta que dio el usuario a esta pregunta
                const userChoice = submission.answers.find(a => a.customId === question.customId);
                
                if (userChoice) {
                    // Buscar la opción seleccionada dentro de la pregunta para ver su categoría
                    const selectedOption = question.options.find(opt => opt.text === userChoice.value);
                    
                    if (selectedOption && selectedOption.category) {
                        const cat = selectedOption.category;
                        countsBySection[sectionId][cat] = (countsBySection[sectionId][cat] || 0) + 1;
                    }
                }
            });
        });

        const reportInfo = await getFinalResults(countsBySection,assessmentId);

        return res.status(200).json({
            msg:'Ok',
            report: reportInfo
        });
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            msg:"Login fail."
        });
    }
}

const getFinalResults = async (countsBySection, assessmentId) => {
    const fullReport = [];

    // Iteramos sobre cada sección (s1, s2, s3...)
    for (const sectionKey in countsBySection) {
        const categories = countsBySection[sectionKey];

        // 1. Convertimos el objeto en un arreglo de [nombre, valor] y ordenamos de mayor a mayor
        const sorted = Object.entries(categories).sort((a, b) => { 
            if (b[1] !== a[1]) { 
                return b[1] - a[1];
            } else {
                return a[0].localeCompare(b[0]);
            }
        });
         
        // 2. Tomamos los dos más altos
        const topTwo = sorted.slice(0, 2); 
        const [first,second] = topTwo;
        let searchQueries = new Set();

        if(sectionKey === "s1"){
            if((first[1] >= 9) && ((first[1]-second[1]) >= 2)){
                searchQueries.add(first[0]);
            }
            if(second[1] >= 4){
                searchQueries.add(`${first[0]} + ${second[0]}`);
            }
            if((first[1] === second[1]) && first[1] >= 4 && second[1]>= 4){ 
                searchQueries.add(`${first[0]} and ${second[0]}`);
            }
        }else{
            if((first[1] >= 10) && ((first[1]-second[1]) >= 2)){
                searchQueries.add(first[0]);
            }
            /* if(second[1] >= 4){
                categoryKey = first[0] +" + "+second[0];
            }
            if((first[1] === second[1]) && first[1] >= 4 && second[1]>= 4){
                categoryKey = first[0] +" + "+second[0];
            } */
            if (second[1] >= 4) {
                if(sectionKey === "s2"){
                    searchQueries.add(`${first[0]} + ${second[0]}`);
                    searchQueries.add(`${second[0]} + ${first[0]}`);
                }else{
                    searchQueries.add(`${first[0]} + ${second[0]}`);
                }
            }
        }

        if (searchQueries.size === 0) searchQueries.add(first[0]);
        const categoryKeyArray = Array.from(searchQueries);

        const resultText = await Result.findOne({
            assessmentId,
            sectionCustomId: sectionKey,
            category: { $in: categoryKeyArray }
        });

        fullReport.push({
            section: sectionKey,
            topCategories: topTwo,
            keyUsed: categoryKeyArray,
            content: resultText ? resultText : {
                title: categoryKey[0],
                content: "NOT FOUND"
            }
        });
    }

    return fullReport;
};

module.exports = {
    getReportInfo,
}