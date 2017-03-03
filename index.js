"use strict";

//////////
// imports

const yargs = require('yargs');

const express = require('express');
const cors = require('express-cors');
const csp = require('express-csp');
const compression = require('compression');
const session = require('express-session');

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
      'compression': {
        'default': true,
        'description': 'Enable Compression or not'
      },
      'sessions': {
        'default': false,
        'description': 'Enable Sessions or not'
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
  
  // add content security policy
  if (config.csp)
  {
    csp.extend(app, {
      policy: {
        directives: {
          'default-src': ['self', 'unsafe-inline']
        }
      }
    });
  }
  
  // cross origin api/content access
  if (config.csp)
  {
    app.use(cors({}));
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
      if (config.etag)
      {
        res.header('ETag', config.etag)
          .header('Cache-Control', 'public, max-age=1800');
      }
      res.header('X-XSS-Protection', '1; mode=block');
      next();
    }
  });

  if (config.sessions)
  {
    app.use(session({
      name: Date.now().toString(16),
      secret: Date.now().toString(16),
      resave: false,
      saveUninitialized: true
    }))
  }
  
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
