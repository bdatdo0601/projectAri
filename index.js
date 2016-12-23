const record = require('node-record-lpcm16');
const snowboy = require('snowboy');
const player = require('play-sound')(opts = {});
const fs = require('fs');
const google_speech = require('google-speech'); //this is use for text to speech
const speech = require('@google-cloud/speech')({
  projectID: 'projectari-153322',
  keyFilename: 'resources/projectAri-d1fc30912718.json',
});

const models = new snowboy.Models();
var isDetected = false;
var file;
var requestPath;

models.add({
  file: 'resources/alexa.umdl',
  sensitivity: '.1',
  hotwords : 'alexa'
});

models.add({
  file: 'resources/Hey_Justin.pmdl',
  hotwords: 'justin'
})

const detector = new snowboy.Detector({
  resource: "resources/common.res",
  models: models,
  audioGain: 2.0
});

detector.on('silence', function() {
  if(isDetected){
    file.end();
    playSoundFile('resources/ding.wav');
    isDetected = false;
    processRequest(requestPath);
  }
});

detector.on('sound', function () {
});

detector.on('error', function (err) {
  console.log('error');
  console.log(err);
});

detector.on('hotword', function (index, hotword) {
  console.log(isDetected);
  if (!isDetected){
    console.log('hotword', index, hotword);
    playSoundFile('resources/dong.wav');
    makeRequest('resources/request.wav');
  }
});

var mic = record.start({
  threshold: 0,
  verbose: false
});

mic.pipe(detector);

const playSoundFile = (filePath) => {
  console.log(`${filePath} is played`);
  player.play(filePath, (err) => {
    if (err) throw err;
  })
}

const makeRequest = (filePath) => {
  requestPath = filePath;
  file = fs.createWriteStream(filePath);
  record.start().pipe(file)
  setTimeout(() => {isDetected = true;}, 1000);
  setTimeout(()=>{
    if (isDetected){
      file.end();
      playSoundFile('resources/ding.wav');
      mic.pipe(detector);
      isDetected = false;
      processRequest(requestPath);
    }
  }, 5000);
}

const processRequest = (filePath) => {
  speech.recognize(filePath, {
    encoding: 'LINEAR16',
    sampleRate: 16000
  },function(err, transcript){
    if (err){
      console.log(err);
    } else {
      console.log(transcript);
    }
  });
};
