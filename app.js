var express = require("express");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

const apiMetrics = require("prometheus-api-metrics");
var mqtt = require('mqtt')
const prom = require('prom-client');

var app = express();
app.use(apiMetrics());

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());


function isNumeric(str) {
  if (typeof str != "string") return false
  return !isNaN(str) && !isNaN(parseFloat(str)) 
}


var mqtt = require('mqtt')
var client  = mqtt.connect(process.env.MQTT_ADDRESS, {
  username: process.env.MQTT_USERNAME,//TODO better
  password: process.env.MQTT_PASSWORD 
})
 
client.on('connect', function () {
  console.log("Connected");
  client.subscribe('evse/#', function (err) {
    if(err){
      process.exit(1)
    }
  })
})

var metricsDict = {}

client.on('message', function (topic, message) {
  // message is Buffer
  //console.log(topic +" -> "+ message);

  var splitTopic = topic.split("/");
  var deviceId = splitTopic[0];
  var metricName = splitTopic[1]
  var valueRaw = message.toString();

  if(deviceId === "" || deviceId === undefined || metricName === "" || metricName === undefined){
    console.log({device: deviceId, metric: metricName, topicRaw: topic, valueRaw: valueRaw})
    return;
  }


  console.log("Got metric "+ metricName + " with value "+valueRaw);

  var value = Number(valueRaw);
  if(valueRaw === "yes"){
    value = 1;
  }
  if(valueRaw === "no"){
    value = 0;
  }
  
    if(valueRaw === "true"){
    value = 1;
  }
  if(valueRaw === "false"){
    value = 0;
  }

  var valueListRaw = valueRaw.split(",");
  var valueList = [];
  for(val of valueListRaw){
    if(isNumeric(val)){
      valueList.push(Number(val))
    }else{
      valueList = [];
      break;
    }
  }
  if(valueList.length == 0){
    valueList = [value]
  }
  
  if(metricsDict[metricName] === undefined){
    const gauge = new prom.Gauge({ name: metricName, help: 'No Help!', labelNames: ['valueRaw', 'device', 'metricIndex'],});
    metricsDict[metricName] = gauge
  }

  for(var i=0;i<valueList.length;i++){
      var rawV = valueRaw
      if(isNaN(valueList[i]) == false){
        rawV = "null"//no need since its already in there
      }
      gauge = metricsDict[metricName]
      gauge.set({ valueRaw: rawV, device: deviceId, metricIndex: i}, valueList[i]); 
  
      console.log({device: deviceId, metric: metricName, value: value, valueRaw: valueRaw})
  }

})

console.log("App running on port 3000");
module.exports = app;
