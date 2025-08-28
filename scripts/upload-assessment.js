const config = require("../widget.config");

const { server, file, uploadScript } = config;

console.log("Assessment Upload:", "softskillsAssessment", uploadScript, file, server);
const open = require("open");
const path = require("path");

const fileUrl = `fmp://${server}/${file}?script=${uploadScript}&param=`;

const thePath = path.join(__dirname, "../", "dist", "assessment.html");
const params = { widgetName: "softskillsAssessment", thePath };
const url = fileUrl + encodeURIComponent(JSON.stringify(params));
open(url);
