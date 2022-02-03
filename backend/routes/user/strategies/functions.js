const { User } = require('../../../db')
async function getUser(req) {
  var UserId = req.user.user._id
  var user = await User.findById(UserId)
  return user
}

module.exports = {
  getUser
};