const record = require('node-record-lpcm16');
const snowboy = require('snowboy');
const player = require('play-sound')(opts = {});

const models = new snowboy.Models();

models.add({
  file: 'resources/alexa.umdl',
  sensitivity: '0.5',
  hotwords : 'alexa'
});

const detector = new snowboy.Detector({
  resource: "resources/common.res",
  models: models,
  audioGain: 2.0
});

detector.on('silence', function () {
});

detector.on('sound', function () {
  console.log('sound');
});

detector.on('error', function () {
  console.log('error');
});

detector.on('hotword', function (index, hotword) {
  console.log('hotword', index, hotword);
  playSoundFile('resources/dong.wav');
});

const mic = record.start({
  threshold: 0,
  verbose: false
});

const playSoundFile = (filePath) => {
  console.log(`${filePath} is played`);
  player.play(filePath, (err) => {
    if (err) throw err;
  })
}

mic.pipe(detector);
