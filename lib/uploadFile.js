'use strict';

var azure = require('azure-storage');
var mime = require('mime');
var path = require('path');
var fs = require('fs');
var accessOptions = {
  'publicAccessLevel': 'blob'
};
var azureOptions = {};
var blobService;


var cache;
var cacheFile = path.resolve(process.env.HOME, '.azure.cache.json');
try {
  cache = require(cacheFile);
} catch (e) {
  cache = {};
}

var encodingOptions = { 'encoding': 'utf8' };

function saveCache (key) {
  if (key) {
    cache[key] = true;
  }
  var data = JSON.stringify(cache, null, 2);
  fs.writeFileSync(cacheFile, data, encodingOptions);
}

function init (options) {

  azureOptions = options;
  blobService = azure.createBlobService(azureOptions.account, azureOptions.key);
}

function createContainer (container, callback) {

  blobService.createContainerIfNotExists(
    container,
    accessOptions,
    function (err) {
      callback(err);
    }
  );
}

function statusOkay (status) {

  return status === 200 || status === 201;
}

function upload (name, local, remote, callback) {

  var size = fs.statSync(local).size;
  var stream = fs.ReadStream(local);

  createContainer(azureOptions.container, function (err) {

    if (err) {
      callback(new Error('failed'));
    }
    else {
      // container, blobName, stream, streamLength, callback
      blobService.createBlockBlobFromStream (
        azureOptions.container,
        remote,
        stream,
        size,
        {
          'contentType': mime.lookup(name)
        },
        function (err, result, response) {

          if (err || !statusOkay(response.statusCode)) {
            // TODO: add re-trial
            callback(new Error('failed'));
          } else {
            saveCache(remote);
            process.nextTick(function () {
              callback(null, remote);
            });
          }
        }
      );
    }
  });
}

upload.cache = cache;
upload.init = init;
module.exports = upload;
