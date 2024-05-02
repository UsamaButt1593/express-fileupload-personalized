# express-fileupload-personalized

Personalized version of express-fileupload package

# Changes in Fork

### 1). Remove `limitHandler`, `abortOnLimit` and `truncated` support

**In original**, if `limit` is defined in options, default behaviour is to stop receiving more bytes for that file and set file on `req` object with `truncated` flag set to true on file, and call the next middleware without any errors. If `abortOnLimit` is also set to `true`, it first calls `limitHandler` and then tries to close connection by calling `res.end` with `413` status code.

**In Fork**, if `limit` is defined, default behaviour is to stop receiving more bytes for that file, and call the `next(err)` so that express or user itself may handle it in appropriate errorHandler.

We are doing this change because, desired behaviour in most of cases, is to abort and do not process truncated files. In original version, we cannot call `res.end` in `limitHandler` if `abortOnLimit` is used as it will result in errors because library has already sent response in `closeConnection` method. If we do not use `abortOnLimit`, `closeConnection` is not called and library will continue to parse other files, if any, because `req.unpipe(busboy)` is called in `closeConnection`.

### 2). Make `req.files` an array in case of single file upload also

**In original**, `req.files` is array of file objects only if user sends multiple files per key by setting `multiple` prop of html's input element set to `true`, otherwise `req.files` is a file object if user only sends one file per key.

**In Fork**, `req.files` is always array of file objects irrespective of whether user send multiple or one file per key.

We are doing this change because of better typing and validation.

### 3). Fix Bug. next middleware is called even after uploadTimeout.

**In original**, uploadTimeout sends an error event to file that does cleanup and calls the next middleware without passing error. So express thinks that uploadFile middleware was successful but in reality it was not successful.

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
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
  })
);
```

### Using useTempFile Options

Use temp files instead of memory for managing the upload process.

```javascript
// Note that this option available for versions 1.0.0 and newer.
app.use(
  fileUpload({
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

| Option             | Acceptable&nbsp;Values                                                                                          | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| createParentPath   | <ul><li><code>false</code>&nbsp;**(default)**</li><li><code>true</code></ul>                                    | Automatically creates the directory path specified in `.mv(filePathName)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| uriDecodeFileNames | <ul><li><code>false</code>&nbsp;**(default)**</li><li><code>true</code></ul>                                    | Applies uri decoding to file names if set true.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| safeFileNames      | <ul><li><code>false</code>&nbsp;**(default)**</li><li><code>true</code></li><li>regex</li></ul>                 | Strips characters from the upload's filename. You can use custom regex to determine what to strip. If set to `true`, non-alphanumeric characters _except_ dashes and underscores will be stripped. This option is off by default.<br /><br />**Example #1 (strip slashes from file names):** `app.use(fileUpload({ safeFileNames: /\\/g }))`<br />**Example #2:** `app.use(fileUpload({ safeFileNames: true }))`                                                                                                                                                                                                                                                                                                                         |
| preserveExtension  | <ul><li><code>false</code>&nbsp;**(default)**</li><li><code>true</code></li><li><code>_Number_</code></li></ul> | Preserves filename extension when using <code>safeFileNames</code> option. If set to <code>true</code>, will default to an extension length of 3. If set to <code>_Number_</code>, this will be the max allowable extension length. If an extension is smaller than the extension length, it remains untouched. If the extension is longer, it is shifted.<br /><br />**Example #1 (true):**<br /><code>app.use(fileUpload({ safeFileNames: true, preserveExtension: true }));</code><br />_myFileName.ext_ --> _myFileName.ext_<br /><br />**Example #2 (max extension length 2, extension shifted):**<br /><code>app.use(fileUpload({ safeFileNames: true, preserveExtension: 2 }));</code><br />_myFileName.ext_ --> _myFileNamee.xt_ |
| useTempFiles       | <ul><li><code>false</code>&nbsp;**(default)**</li><li><code>true</code></ul>                                    | By default this module uploads files into RAM. Setting this option to True turns on using temporary files instead of utilising RAM. This avoids memory overflow issues when uploading large files or in case of uploading lots of files at same time.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| tempFileDir        | <ul><li><code>String</code>&nbsp;**(path)**</li></ul>                                                           | Path to store temporary files.<br />Used along with the <code>useTempFiles</code> option. By default this module uses 'tmp' folder in the current working directory.<br />You can use trailing slash, but it is not necessary.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| parseNested        | <ul><li><code>false</code>&nbsp;**(default)**</li><li><code>true</code></li></ul>                               | By default, req.body and req.files are flattened like this: <code>{'name': 'John', 'hobbies[0]': 'Cinema', 'hobbies[1]': 'Bike'}</code><br /><br/>When this option is enabled they are parsed in order to be nested like this: <code>{'name': 'John', 'hobbies': ['Cinema', 'Bike']}</code>                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| debug              | <ul><li><code>false</code>&nbsp;**(default)**</li><li><code>true</code></ul>                                    | Turn on/off upload process logging. Can be useful for troubleshooting.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| logger             | <ul><li><code>console</code>&nbsp;**(default)**</li><li><code>{log: function(msg: string)}</code></li></ul>     | Customizable logger to write debug messages to. Console is default.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| uploadTimeout      | <ul><li><code>60000</code>&nbsp;**(default)**</li><li><code>Integer</code></ul>                                 | This defines how long to wait for data before aborting. Set to 0 if you want to turn off timeout checks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

# Thanks & Credit

[Brian White](https://github.com/mscdex) for his stellar work on the [Busboy Package](https://github.com/mscdex/busboy) and the [connect-busboy Package](https://github.com/mscdex/connect-busboy)
