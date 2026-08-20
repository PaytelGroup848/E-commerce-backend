const express = require("express");
const router = express.Router();

const contactController = require("../../controllers/contact.controller");

// Public - contact form submission
router.post("/", contactController.submitQuery);

router.get("/admin/stats", contactController.getStats);
router.get("/", contactController.getQueries);
router.get("/:id", contactController.getQueryById);
router.patch("/:id", contactController.updateQuery);
router.delete("/:id", contactController.deleteQuery);

module.exports = router;
