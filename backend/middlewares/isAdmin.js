const { User } = require("@root/db");

const isAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).send({ message: "unauthenticated" });
  }
  const user = await User.findById(req.user.user._id, { power: 1 });
  if (user.power == 10) {
    return next();
  } else {
    return res.status(404).send({ message: "invalid route" });
  }
};
module.exports = isAdmin;
