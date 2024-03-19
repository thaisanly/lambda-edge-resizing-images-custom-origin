'use strict';

const https = require('https');
const Sharp = require('sharp');

const keepAliveAgent = new https.Agent({ keepAlive: true });

const MIN_WIDTH = 50;
const MAX_WIDTH = 1500;
const MIN_HEIGHT = 50;
const MAX_HEIGHT = 1500;

const ALLOW_IMAGES = ['jpg', 'jpeg', 'webp', 'avif', 'png'];

const isWhiteListImage = function (uri) {
  const urlParts = uri.split('?');
  const filename = urlParts[0].split('/').pop();
  const parts = filename.split('.');

  if (parts.length > 1) {
    const potentialExtension = parts.pop().toLowerCase();
    return ALLOW_IMAGES.includes(potentialExtension)
  }

  return false;
}

exports.handler = (event, context, callback) => {

  const request = event.Records[0].cf.request;

  /**
   * Read the custom origin name
   */
  const originName = request.origin.custom.domainName;
  const resizingOptions = {};
  const params = new URLSearchParams(request.querystring);
  const width = params.has('width') ? parseInt(params.get('width'), 10) : null;
  const height = params.has('height') ? parseInt(params.get('height'), 10) : null;
  const format = params.has('format') ? params.get('format') : 'jpg';

  console.log(request, width, height, format);

  /**
   * request validation if fail just pass the request
   */
  if (!params.has('width') && !params.has('height')) {
    callback(null, request);
    return;
  }

  if (width && (width > MAX_WIDTH || width < MIN_WIDTH)) {
    callback(null, request);
    return;
  }

  if (height && (height > MAX_HEIGHT || height < MIN_HEIGHT)) {
    callback(null, request);
    return;
  }

  if (!ALLOW_IMAGES.includes(format)) {
    callback(null, request);
    return;
  }

  if (!isWhiteListImage(request.uri)) {
    callback(null, request);
    return;
  }

  if (width) {
    resizingOptions.width = width;
  }

  if (height) {
    resizingOptions.height = height;
  }

  const options = {
    hostname: originName,
    port: 443,
    path: request.uri,
    method: 'GET',
    encoding: null,
    agent: keepAliveAgent
  };

  const req = https.request(options, res => {

    let chunks = [];

    res
      .on('data', (chunk) => {
        chunks.push(Buffer.from(chunk, 'binary'));
      })
      .on('end', () => {

        /**
         * Check the state code is 200 and a file extension is jpg
         */
        if (res.statusCode !== 200 || !request.uri.endsWith('\.jpg')) {
          req.destroy();
          callback(null, request);
          return;
        }

        const binary = Buffer.concat(chunks);

        try {
          /**
           * Generate a response with resized image
           */
          Sharp(binary)
            .resize(resizingOptions)
            .toFormat(format)
            .toBuffer()
            .then(output => {
              const base64String = output.toString('base64');

              /**
               * Resized filesize payload is greater than 10 MB.Returning original image
               */
              if (base64String.length > 10485760) {
                console.error('Resized filesize payload is greater than 10 MB.Returning original image');
                callback(null, request);
                return;
              }

              const response = {
                status: '200',
                statusDescription: 'OK',
                headers: {
                  'cache-control': [{
                    key: 'Cache-Control',
                    value: 'max-age=86400'
                  }],
                  'content-type': [{
                    key: 'Content-Type',
                    value: 'image/' + format
                  }]
                },
                bodyEncoding: 'base64',
                body: base64String
              };

              callback(null, response);
            });
        } catch (err) {
          console.error(err);
          callback(null, request);
        } finally {
          req.destroy();
        }
      });
  })

  req.end()
}
