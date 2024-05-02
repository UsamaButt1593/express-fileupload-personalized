# express-fileupload-personalized

Personalized version of express-fileupload package

# Changes in Fork

### 1). Clean all files if error occurs for any of files being uploaded

_**One thing important to keep in mind is that busboy parses request body sequentially, and as a result this library also sequentially parses files present in the request body**_

#### Original Behaviour

When multiple files are being uploaded either via single input field or via multiple input fields, default behaviour if error occurs for any of the files, is to stop parsing request furthermore, clean the file which gave the error, and call `next(error)` to propagate error to next error handler.

This behaviour is true for files which exceed configured size limits.

### Problem Statement

There is a serious drawback of original approach when using with `useTempFiles` option. Let's consider our form has 6 file fields and if error occurs for 4th file being parsed, what will be the behaviour of original library? We have to acknowledge that at the time of error, 3 files have already been parsed and saved to `tempFileDir`. The behaviour will be to stop parsing request furthermore, clean the 4th file being parsed from `tempFileDir`, call `next(error)` to propagate error to next error handler which will most probably do some logging and end the response with details of error. **_It will not parse remaining 2 files and it will also not clean 3 files which have already been parsed._**

One might say that rationale behind not cleaning already parsed files from `tempFileDir` is that library user may need to know which files the library was able to parse and save to `tempFileDir` without any errors so that he/she may somehow process those files or log those files. But this seems very illogical because we have already skipped remaining 2 files which would have alse been parsed without errors if we would have continued parsing request after encountring error in one file.

### Fork Behaviour

If error occurs for any of the files being uploaded, stop parsing request furthermore, clean the file which gave the error, clean files which have already been parsed for current request, and call `errorHandler` if passed by the user or `next(error)` so that error may be handled appropriately by the user.

If user passed `errorHandler`, it is then responsibility of the user to end the response. If files are optional fotr next middleware, User may either decide to call `next()` to propagate request to next middleware in chain. User may call `next(error)` to propagate error to next errorHandlerMiddleware in chain. User may call `res.send`, `res.end`, or `res.json` to end the response.

### 2). Remove `abortOnLimit` and `truncated` support

**In Original**, if `limit` is defined in options, default behaviour is to stop receiving more bytes for that file and set file on `req` object with `truncated` flag set to true on file, and call the next middleware without any errors. If `abortOnLimit` is also set to `true`, it first calls `limitHandler` and then tries to close connection by calling `res.end` with `413` status code. There is no cleaning of already parsed file as desctibed above.

**In Fork**, if `limit` is defined, default behaviour is to stop receiving more bytes for that file, clean that file, clean files which have already been parsed for current request, and call the `errorHandler` with `FileUploadLimitError` if `errorHandler` is passed by user or `next(FileUploadLimitError)` so that error may be handled appropriately by the user.

We are doing this change because, desired behaviour in most of cases, is to abort and do not process truncated files. In original version, we could not call `res.end` in `limitHandler` if `abortOnLimit` is used as it will result in errors because library has already sent response in `closeConnection` method. If we do not use `abortOnLimit`, `closeConnection` is not called and library will continue to parse other files, if any, because `req.unpipe(busboy)` is called in `closeConnection`.

### 3). Make `req.files` an array in case of single file upload also

**In Original**, `req.files` is array of file objects only if user sends multiple files per key by setting `multiple` prop of html's input element set to `true`, otherwise `req.files` is a file object if user only sends one file per key.

**In Fork**, `req.files` is always array of file objects irrespective of whether user send multiple or one file per key.

We are doing this change because of better typing and validation.

### 4). Fix Bug. next middleware is called even after uploadTimeout.

**In Original**, uploadTimeout sends an error event to file that does cleanup and calls the next middleware without passing error. So express thinks that uploadFile middleware was successful but in reality it was not successful.

**In Fork**, call `next(err)` instead of `next` in `file.on('err', ...)` so that uploadFile middleware is not considered successful and error is propagated to appropriate error handler by express.

# TODO

- Re add testing

# Install

```bash
# With NPM
npm i express-fileupload-personalized

# With Yarn
yarn add express-fileupload-personalized
```

# Usage

When you upload a file, the file will be accessible from `req.files`.

### Example:

- You're uploading 2 files called **car.jpg** and **bike.jpg** respectively
- Your input's name field is **foo**: `<input name="foo" type="file" multiple/>`
- In your express server request, you can access your uploaded files from `req.files.foo`:

```javascript
app.post('/upload', function (req, res) {
  console.log(req.files.foo.length); // 2
  console.log(req.files.foo[0]); // the uploaded file object for car.jpg
  console.log(req.files.foo[1]); // the uploaded file object for bike.jpg
});
```

The **req.files.foo[index]** object will contain the following:

- `req.files.foo.name`: "car.jpg"
- `req.files.foo.mv`: A function to move the file elsewhere on your server. Can take a callback or return a promise.
- `req.files.foo.mimetype`: The mimetype of your file
- `req.files.foo.data`: A buffer representation of your file, returns empty buffer in case useTempFiles option was set to true.
- `req.files.foo.tempFilePath`: A path to the temporary file in case useTempFiles option was set to true.
- `req.files.foo.size`: Uploaded size in bytes
- `req.files.foo.md5`: MD5 checksum of the uploaded file

**Notes about breaking changes with MD5 handling:**

- Before 1.0.0, `md5` is an MD5 checksum of the uploaded file.
- From 1.0.0 until 1.1.1, `md5` is a function to compute an MD5 hash ([Read about it here.](https://github.com/richardgirges/express-fileupload/releases/tag/v1.0.0-alpha.1)).
- From 1.1.1 onward, `md5` is reverted back to MD5 checksum value and also added full MD5 support in case you are using temporary files.

### Examples

- [Example Project](https://github.com/UsamaButt1593/express-fileupload-personalized/tree/master/example)
- [Basic File Upload](https://github.com/UsamaButt1593/express-fileupload-personalized/tree/master/example#basic-file-upload)
- [Multi-File Upload](https://github.com/UsamaButt1593/express-fileupload-personalized/tree/master/example#multi-file-upload)

### Using Busboy Options

Pass in Busboy options directly to the express-fileupload-personalized middleware. [Check out the Busboy documentation here](https://github.com/mscdex/busboy#api).

```javascript
app.use(
  createFileUploaderMiddleware({
    limits: { fileSize: 50 * 1024 * 1024 },
  })
);
```

### Limiting size of file that can be uploaded

Let's say we have an endpoint called `/upload` to which we can post csv file(s). Here is frontend code:

```html
<form action="/upload" method="post" enctype="multipart/form-data">
  <p>
    <label for="csv">CSV File</label>
    <input id="csv" type="file" name="csv" accept=".csv" multiple />
  </p>
  <p><button type="submit">Submit</button></p>
</form>
```

Here is backend code:

```javascript
app = express();

app.post('/upload', createFileUploaderMiddleware(), (req, res) => {
  let csvFiles = req.files.csv;
  if (csvFiles === undefined || csvFiles === null) {
    return res.send('No files were uploaded!');
  }

  const response = [];
  for (const csvFile of csvFiles) {
    response.push({
      name: csvFile.name,
      size: csvFile.size,
      md5: csvFile.md5,
    });
  }
  res.json(response);
});
```

If we want to limit the size of individual file that can be uploaded to 2MB, you can configure `limits` on middleware like:

```javascript
// If we do not set `errorHandler` option, default behaviour of file uploader muddleware is to call next(err)
createFileUploaderMiddleware({
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB
  },
});

// global error handler
app.use((err, req, res, next) => {
  // handle errors here, including any limit exceeded errors
  res.status(500).json({
    error: true,
    code: 500,
    message: 'Internal Server Error',
  });
});
```

If you want to distinguish errors coming from file uploader middlewares from other errors, you can configure an `errorHandler` like:

```javascript
createFileUploaderMiddleware({
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB
  },
  errorHandler: (err, req, res, next) => {
    // handle all errors from file uploader middleware here
    if (err instanceof FileUploadLimitError) {
      return res.status(413 /* request entity too large code */).json({
        error: true,
        code: 413,
        message: err.message,
      });
    }

    // pass errors other than limit exceeded errors to global error handler
    next(err);
  },
});

// global error handler
app.use((err, req, res, next) => {
  res.status(500).json({
    error: true,
    code: 500,
    message: 'Internal Server Error',
  });
});
```

**_NOT RECOMMENDED,_** but if you want to ignore all errors including limit exceeded errors, and continue to next middleware without files **_(`req.files` will be `undefined`)_**, you can do something like:

```javascript
createFileUploaderMiddleware({
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB
  },
  errorHandler: (err, req, res, next) => {
    // ignore all errors and continue to next middleware (req.files will be undefined)
    next();
  },
});
```

### Using useTempFile Options

Use temp files instead of memory for managing the upload process.

```javascript
// Note that this option available for versions 1.0.0 and newer.
app.use(
  createFileUploaderMiddleware({
    useTempFiles: true,
    tempFileDir: '/tmp/',
  })
);
```

### Using debug option

You can set `debug` option to `true` to see some logging about upload process.
In this case middleware uses `console.log` and adds `express-fileupload-personalized` prefix for outputs.
You can set a custom logger having `.log()` method to the `logger` option.

It will show you whether the request is invalid and also common events triggered during upload.
That can be really useful for troubleshooting and **_we recommend attaching debug output to each issue on Github_**.

**_Output example:_**

```
express-fileupload-personalized: Temporary file path is /node/express-fileupload/test/temp/tmp-16-1570084843942
express-fileupload-personalized: New upload started testFile->car.png, bytes:0
express-fileupload-personalized: Uploading testFile->car.png, bytes:21232...
express-fileupload-personalized: Uploading testFile->car.png, bytes:86768...
express-fileupload-personalized: Upload timeout testFile->car.png, bytes:86768
express-fileupload-personalized: Cleaning up temporary file /node/express-fileupload/test/temp/tmp-16-1570084843942...
```

**_Description:_**

- `Temporary file path is...` says that `useTempfiles` was set to true and also shows you temp file name and path.
- `New upload started testFile->car.png` says that new upload started with field `testFile` and file name `car.png`.
- `Uploading testFile->car.png, bytes:21232...` shows current progress for each new data chunk.
- `Upload timeout` means that no data came during `uploadTimeout`.
- `Cleaning up temporary file` Here finaly we see cleaning up of the temporary file because of upload timeout reached.

### Available Options

Pass in non-Busboy options directly to the middleware. These are express-fileupload-personalized specific options.

| Option             | Acceptable&nbsp;Values                                                                                          | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| createParentPath   | <ul><li><code>false</code>&nbsp;**(default)**</li><li><code>true</code></ul>                                    | Automatically creates the directory path specified in `.mv(filePathName)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| uriDecodeFileNames | <ul><li><code>false</code>&nbsp;**(default)**</li><li><code>true</code></ul>                                    | Applies uri decoding to file names if set true.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| safeFileNames      | <ul><li><code>false</code>&nbsp;**(default)**</li><li><code>true</code></li><li>regex</li></ul>                 | Strips characters from the upload's filename. You can use custom regex to determine what to strip. If set to `true`, non-alphanumeric characters _except_ dashes and underscores will be stripped. This option is off by default.<br /><br />**Example #1 (strip slashes from file names):** `app.use(createFileUploaderMiddleware({ safeFileNames: /\\/g }))`<br />**Example #2:** `app.use(createFileUploaderMiddleware({ safeFileNames: true }))`                                                                                                                                                                                                                                                                                                                         |
| preserveExtension  | <ul><li><code>false</code>&nbsp;**(default)**</li><li><code>true</code></li><li><code>_Number_</code></li></ul> | Preserves filename extension when using <code>safeFileNames</code> option. If set to <code>true</code>, will default to an extension length of 3. If set to <code>_Number_</code>, this will be the max allowable extension length. If an extension is smaller than the extension length, it remains untouched. If the extension is longer, it is shifted.<br /><br />**Example #1 (true):**<br /><code>app.use(createFileUploaderMiddleware({ safeFileNames: true, preserveExtension: true }));</code><br />_myFileName.ext_ --> _myFileName.ext_<br /><br />**Example #2 (max extension length 2, extension shifted):**<br /><code>app.use(createFileUploaderMiddleware({ safeFileNames: true, preserveExtension: 2 }));</code><br />_myFileName.ext_ --> _myFileNamee.xt_ |
| useTempFiles       | <ul><li><code>false</code>&nbsp;**(default)**</li><li><code>true</code></ul>                                    | By default this module uploads files into RAM. Setting this option to True turns on using temporary files instead of utilising RAM. This avoids memory overflow issues when uploading large files or in case of uploading lots of files at same time.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| tempFileDir        | <ul><li><code>String</code>&nbsp;**(path)**</li></ul>                                                           | Path to store temporary files.<br />Used along with the <code>useTempFiles</code> option. By default this module uses 'tmp' folder in the current working directory.<br />You can use trailing slash, but it is not necessary.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| parseNested        | <ul><li><code>false</code>&nbsp;**(default)**</li><li><code>true</code></li></ul>                               | By default, req.body and req.files are flattened like this: <code>{'name': 'John', 'hobbies[0]': 'Cinema', 'hobbies[1]': 'Bike'}</code><br /><br/>When this option is enabled they are parsed in order to be nested like this: <code>{'name': 'John', 'hobbies': ['Cinema', 'Bike']}</code>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| debug              | <ul><li><code>false</code>&nbsp;**(default)**</li><li><code>true</code></ul>                                    | Turn on/off upload process logging. Can be useful for troubleshooting.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| logger             | <ul><li><code>console</code>&nbsp;**(default)**</li><li><code>{log: function(msg: string)}</code></li></ul>     | Customizable logger to write debug messages to. Console is default.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| uploadTimeout      | <ul><li><code>60000</code>&nbsp;**(default)**</li><li><code>Integer</code></ul>                                 | This defines how long to wait for data before aborting. Set to 0 if you want to turn off timeout checks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| errorHandler       | <ul><li><code>false</code>&nbsp;**(default)**</li><li><code>function(err, req, res, next)</code></li></ul>      | User defined error handler which will be invoked if there was any error, including exceeding limit error, while parsing files.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

# Thanks & Credit

[Brian White](https://github.com/mscdex) for his stellar work on the [Busboy Package](https://github.com/mscdex/busboy) and the [connect-busboy Package](https://github.com/mscdex/connect-busboy)
