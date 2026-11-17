// What each kind of background job does. The handler receives the job's data and a context
// with `progress(payload)` to report how far it has got.
const { runPublication } = require("../services/reportPublishing");

module.exports = {
  "publish-reports": (data, ctx) => runPublication(data.publicationId, ctx),
};
