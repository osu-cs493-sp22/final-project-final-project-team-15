const { Router } = require("express");

const router = Router();

router.use("/businesses", require("./businesses"));
router.use("/photos", require("./photos"));
router.use("/users", require("./users").router);
router.use("/assignments", require("./assignments").router);
router.use("/courses", require("./courses").router);

module.exports = router;
