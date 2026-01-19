require("dotenv").config();
const cors = require("cors");
const express = require("express");
/* const fileUpload = require('express-fileupload'); */
const { dbConnection } = require("./database/config");
const routes = require("./routes/routes");
const path = require('path');

//const { dbConnection } = require("./database/config");

const app = express();
const PORT = process.env.PORT || 8080;

//DB CONNECTION
dbConnection();

//MIDDLEWARES
//CORS --------------------------- COMMENT ON PROD
app.use(cors());

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
  })
);

//PARSE BODY
app.use(express.json());

/* //UPLOAD FILES
app.use(fileUpload({
    useTempFiles:true,
    tempFileDir:"./tmp/",
    createParentPath: true
})); */

//PUBLIC DIRECTORY
app.use(express.static("public"));

//ROUTES
app.use("/api",routes);

app.use("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.listen(PORT, () => {
  console.log("SERVER RUNNING ON PORT", PORT);
});
