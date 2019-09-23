const { Users } = require('../models');
const tokens = require('./tokens');

const register = (user) => {
  return new Promise(async (resolve, reject) => {
    try {
      const userModel = new Users();
      if(typeof user.password !== 'undefined') {
        user.password = userModel.generateHash(user.password);
      }

      let newUser = await Users.create(user);
      const token = await tokens.generate({_id: newUser.id});
      
      newUser = Object.assign(newUser.toObject(), { tokens: {local: token} });
      await Users.update({_id: newUser._id}, {$set: { tokens: {local: token} } });

      resolve(newUser);

    }
    catch(err) {
      console.log(err);
      reject(err);
    }
  });

}

const registerMiddleware = async (req, res) => {
  try {
    user = req.body;
    const newUser = await register(user);
    res.send(newUser);
  }
  catch(err) {
    console.log(err);
    res.send(err);
  }
}

module.exports = { register, registerMiddleware };
