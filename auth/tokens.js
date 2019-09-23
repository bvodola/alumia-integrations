var jwt = require('jsonwebtoken');
var { Users } = require('../models');

let tokens = {};

tokens.generate = (data) => {
  return new Promise((resolve, reject) => {
    jwt.sign(data, 'robocopisthesecret', {}, function(err, token) {
      if(err) reject(err);
      else {
        resolve(token);
      }
    });
  })
};

tokens.save = (user, token) => {
  return new Promise((resolve, reject) => {
    Users.findByIdAndUpdate(user._id, {
      tokens: {
        local: token
      }
    }, function(err, response) {
      if(err) reject(err);
      else resolve(response);
    });
  });
}

tokens.validate = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, 'robocopisthesecret', function(err, data) {
      if(err) reject(err);
      else resolve(data);
    });
  })
}

tokens.validateMiddleware = async (req, res, next) => {
  if(req.method !== 'OPTIONS') {
    if(typeof req.headers.authorization !== 'undefined') {
      const token = String(req.headers.authorization).split('Bearer ')[1];
      const token_data = await tokens.validate(token);
      if(token.data !== 'undefined') {
        res.locals.user_id = token_data._id;
        next();
      }
      else {
        res.sendStatus(401);
      }
  
    }
    else {
      res.sendStatus(401);
    }
  } else {
    res.send(200);
  }
	
}

module.exports = tokens;