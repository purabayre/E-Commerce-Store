const csrf = require("csurf");

const csrfProtection = csrf({
  cookie: false, // using session-based csrf
});

module.exports = csrfProtection;
