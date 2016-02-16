'use strict';

var fs = require('fs');
var path = require('path');

var azure = require('azure-storage');
var azureOptions = {};

var blobService;
function init (options) {
  azureOptions = options;
  blobService = azure.createBlobService(azureOptions.account, azureOptions.key);
}

function downloadFile (options, file, callback) {
  var remote = path.join(options.baseDir, file);
  var local = path.resolve(options.destDir, file);

  var localStream = fs.createWriteStream(local);

  blobService.getBlobToStream(
    azureOptions.container,
    remote,
    localStream,
    function () {

      localStream.on('finish', function () {
        setImmediate(callback, null, local);
      });
    }
  );
}

module.exports = downloadFile;
downloadFile.init = init;
