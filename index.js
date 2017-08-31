"use strict";

//////////
// imports

const yargs = require('yargs');

const express = require('express');
const cors = require('express-cors');
const csp = require('express-csp');
const compression = require('compression');

module.exports = function(config_)
{
  //////////
  // help and config

  const config = yargs
    .options(Object.assign({
      'port': {
        'alias': 'p',
        'description': 'Port where the service should run',
        'default': 8080,
        'type': 'number'
      },
      'static': {
        'default': '',
        'description': 'Path to static files to serve'
      },
      'cors': {
        'default': true,
        'description': 'Enable CORS or not'
      },
      'csp': {
        'default': true,
        'description': 'Enable CSP or not'
      },
      'csp-script-src': {
        'type': 'array',
        'description': 'Specify script src'
      },
      'csp-child-src': {
        'type': 'array',
        'description': 'Specify child src'
      },
      'csp-style-src': {
        'type': 'array',
        'description': 'Specify style src'
      },
      'csp-font-src': {
        'type': 'array',
        'description': 'Specify font src'
      },
      'compression': {
        'default': false,
        'description': 'Enable Compression or not'
      },
      'etag': {
        'default': Date.now().toString(16),
        'description': 'Enable Static ETAG or not'
      },
      'help': {
        'alias': 'h',
        'description': 'Show Help',
      }
    }, config_.options || {}))
    .argv;

  if (config.help)
  {
    yargs.showHelp()
    process.exit(1);
  }

  //////////
  // service implementation

  let app = express();

  // disable tech revealing header
  app.disable('x-powered-by');
  app.disable('etag');
  
  // add content security policy
  if (config.csp)
  {
    const default_directives =  ['self', 'unsafe-inline'];
    const directives = {
      'default-src': default_directives
    }
    if (config.cspScriptSrc && config.cspScriptSrc.length > 0)
    {
      directives['script-src'] = default_directives.concat(config.cspScriptSrc);
    }
    if (config.cspChildSrc && config.cspChildSrc.length > 0)
    {
      directives['child-src'] = default_directives.concat(config.cspChildSrc);
    }
    if (config.cspStyleSrc && config.cspStyleSrc.length > 0)
    {
      directives['style-src'] = default_directives.concat(config.cspStyleSrc);
    }
    if (config.cspFontSrc && config.cspFontSrc.length > 0)
    {
      directives['font-src'] = default_directives.concat(config.cspFontSrc);
    }
    csp.extend(app, {
      policy: {
        directives
      }
    });
  }
  
  // cross origin api/content access
  if (config.cors)
  {
    app.use(cors());
  }
  
  app.use(function(req, res, next)
  {
    res.sendDate = false;
    if (config.etag && req.headers['if-none-match'] === config.etag)
    {
      res.status(304)
         .send()
         .end();
    }
    else
    {
      if (config.etag && req.path && req.path.indexOf('/api') === -1)
      {
        res.header('ETag', config.etag)
          .header('Cache-Control', 'public, max-age=1800');
      }
      res.header('X-XSS-Protection', '1; mode=block');
      res.header('X-Content-Type-Options', 'nosniff');
      res.header('X-Frame-Options', 'SAMEORIGIN');
      next();
    }
  });

  if (config.compression)
  {
    app.use(compression({
      level: 9,
      filter: (req, res) => res._headers['content-encoding'] === undefined,
      threshold: 0
    }));
  }
  
  config.applicationName = config_.applicationName;
  config.express = express;
  config.app = app;

  // additional packages and stuff
  if (config.setup)
  {
    config.setup(config);
  }

  // content
  if (config.static)
  {
    app.use(express.static(config.static, {
      etag: false,
      lastModified: false
    }));
  }

  const initialise = () => app.listen(config.port,  () => console.log(`${config_.applicationName} is listening on port ${config.port}!`));

  if (config_.initialise)
  {
    config_.initialise(config, initialise);
  }
  else
  {
    initialise();
  }

};
