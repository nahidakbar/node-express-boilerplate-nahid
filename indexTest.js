"use strict";

const assert = require('assert');
const boilerplate = require('.');
const http = require('http');
const fs = require('fs');

function request(path, headers = {})
{
  return new Promise((resolve) =>
  {
    const options = {
      host: 'localhost',
      port: 8080,
      path,
      headers
    }
    // `http://localhost:8080/${path}`
    const req = http.get(options, (res) =>
    {
      let data = new Buffer(0);

      res.on('data', (chunk) =>
      {
        data += chunk;
      });
      res.on('end', () =>
      {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data
        });
        console.log('end');
      });
    });
  });
}

describe(`Boilerplate test`, function ()
{
  let config;

  function initialise(params = {})
  {
    return new Promise((resolve) =>
    {
      params.initialise = (configParam, init) =>
      {
        config = configParam;
        init();
        resolve(config);
      };
      boilerplate(params);
    });
  }

  beforeEach(function ()
  {
    config = null;
  })
  afterEach(function ()
  {
    if (config)
    {
      return new Promise((resolve) =>
      {
        config.server.close(() =>
        {
          console.log('CLOSED');
          resolve();
        })
      });
    }
  })

  it('setup', async function ()
  {
    let done = false

    initialise({
      setup: () => done = true
    });
    assert.equal(done, true)
  })

  it('zero config initialisation', async function ()
  {
    await initialise();
  })

  it('zero config initialisation', async function ()
  {
    config = boilerplate({});
  })

  it('static', async function ()
  {
    await initialise({
      options: {
        static: {
          default: __dirname,
        }
      }
    });
    let
    {
      status,
      data
    } = await request('/index.js');

    assert.equal(status, 200);
    assert.equal(data, fs.readFileSync('index.js'));
  })

  it('compression', async function ()
  {
    await initialise({
      options: {
        static: {
          default: __dirname,
        },
        compression: {
          default: true,
        }
      }
    });
    let
    {
      status,
      data
    } = await request('/index.js');

    assert.equal(status, 200);
    assert.equal(data, fs.readFileSync('index.js'));
  })

  it('etag', async function ()
  {
    await initialise({
      options: {
        etag: {
          default: 'test',
        }
      }
    });
    let
    {
      status,
      data
    } = await request('/index.js', {
      'if-none-match': 'test'
    });

    assert.equal(status, 304);
    assert.equal(data, '');
  })

  it('cors', async function ()
  {
    await initialise({});
    const
    {
      headers
    } = await request('/index.js', {
      origin: 'http://test'
    });

    assert.equal(headers['access-control-allow-origin'], '*')
  })

  it('csp', async function ()
  {
    await initialise({
      options: {
        'csp-font-src': {
          default: 'font-src-value',
        },
        'csp-style-src': {
          default: 'style-src-value',
        },
        'csp-child-src': {
          default: 'child-src-value',
        },
        'csp-script-src': {
          default: 'script-src-value',
        }
      }
    });
    const
    {
      headers
    } = await request('/index.js', {
      origin: 'http://test'
    });
    const csp = headers['content-security-policy'];

    assert(csp.indexOf('font-src-value') !== -1)
    assert(csp.indexOf('style-src-value') !== -1)
    assert(csp.indexOf('child-src-value') !== -1)
    assert(csp.indexOf('script-src-value') !== -1)

  })

});
