const { User } = require("@root/db");

const hasPhone = async (req, res, next) => {
  const user = await User.findById(req.user.user._id);
  if (user.phone) {
    return next();
  } else {
    return res.status(404).send({ message: "Phone not added" });
  }
};
module.exports = hasPhone;
