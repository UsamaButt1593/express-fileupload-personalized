'use strict';

const path = require('path');
const processMultipart = require('./processMultipart');
const isEligibleRequest = require('./isEligibleRequest');
const { buildOptions, debugLog } = require('./utilities');
const FileUploadLimitError = require('./fileUploadLimitError');
const busboy = require('busboy'); // eslint-disable-line no-unused-vars

const DEFAULT_OPTIONS = {
  debug: false,
  logger: console,
  uploadTimeout: 60000,
  fileHandler: false,
  uriDecodeFileNames: false,
  safeFileNames: false,
  preserveExtension: false,
  errorHandler: false,
  createParentPath: false,
  parseNested: false,
  useTempFiles: false,
  tempFileDir: path.join(process.cwd(), 'tmp'),
};

/**
 * the file uploader middleware
 * @param {DEFAULT_OPTIONS & busboy.BusboyConfig} options - Middleware options.
 * @returns {Function} - express-fileupload middleware.
 */
const createFileUploaderMiddleware = (options) => {
  const uploadOptions = buildOptions(DEFAULT_OPTIONS, options);
  return (req, res, next) => {
    if (!isEligibleRequest(req)) {
      debugLog(uploadOptions, 'Request is not eligible for file upload!');
      return next();
    }
    processMultipart(uploadOptions, req, res, next);
  };
};

module.exports = {
  createFileUploaderMiddleware,
  FileUploadLimitError,
};
