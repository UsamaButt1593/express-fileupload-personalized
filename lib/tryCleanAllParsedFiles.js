const fs = require('fs');
const { debugLog } = require('./utilities');

const tryCleanFile = (fileUploadOptions, file) => {
  return new Promise((resolve, _reject) => {
    if (!file || !file.tempFilePath) {
      return;
    }

    debugLog(
      fileUploadOptions,
      `Cleaning up temporary file ${file.tempFilePath}...`
    );
    fs.unlink(file.tempFilePath, (err) => {
      if (err) {
        debugLog(
          fileUploadOptions,
          `Cleaning up temporary file ${file.tempFilePath} failed: ${err}`
        );
        resolve();
        return;
      }

      debugLog(
        fileUploadOptions,
        `Cleaning up temporary file ${file.tempFilePath} done.`
      );
      resolve();
    });
  });
};

module.exports = async (fileUploadOptions, req) => {
  if (req.files) {
    const filesKeys = Object.keys(req.files);
    for (let i = 0; i < filesKeys.length; i++) {
      const key = filesKeys[i];
      const value = req.files[key];
      // value can be undefined, null, parsed file object, or array of parsed file objects
      // because conversion of parsed file object to array of parsed file objects occur after
      // all files have been successfully parsed. But this function is called only when all
      // files were not parsed successfully parsed and one or more of files caused error.
      // See Fork Change#2
      if (!(value instanceof Array)) {
        await tryCleanFile(fileUploadOptions, value);
      } else {
        for (const file of value) {
          await tryCleanFile(fileUploadOptions, file);
        }
      }
    }
  }

  delete req.files;
};
