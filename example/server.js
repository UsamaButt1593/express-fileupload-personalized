const express = require('express');
const { createFileUploaderMiddleware } = require('../lib/index');

const getUploadedFileData = (file) => ({
  md5: file.md5,
  name: file.name,
  size: file.size,
});

const app = express();

const PORT = 8000;
app.use('/form', express.static(__dirname + '/index.html'));

// default options
app.use(createFileUploaderMiddleware());

app.get('/ping', function (req, res) {
  res.send('pong');
});

app.post('/upload_single', function (req, res) {
  if (
    !req.files ||
    Object.keys(req.files).length === 0 ||
    req.files.sampleFile.length === 0
  ) {
    res.status(400).send('No files were uploaded.');
    return;
  }

  console.log('req.files >>>', req.files); // eslint-disable-line

  const sampleFiles = req.files.sampleFile;
  const filesData = sampleFiles.map((file) => getUploadedFileData(file));
  res.json({ sampleFile: filesData });
});

app.post('/upload_multiple', function (req, res) {
  if (!req.files || Object.keys(req.files).length === 0) {
    res.status(400).send('No files were uploaded.');
    return;
  }

  console.log('req.files >>>', req.files); // eslint-disable-line

  const results = {};
  for (const [field, files] of Object.entries(req.files)) {
    const filesData = files.map((file) => getUploadedFileData(file));
    results[field] = filesData;
  }

  res.json(results);
});

app.listen(PORT, function () {
  console.log('Express server listening on port ', PORT); // eslint-disable-line
});
