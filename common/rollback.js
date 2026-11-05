const { logger } = require("./logger");

/**
 * Compensating rollback for multi-document operations.
 *
 * MongoDB transactions need a replica set (Atlas has one; a local standalone mongod
 * does not), so the term lifecycle cannot depend on them. Instead each created
 * document is registered here as it is written, and if a later step fails everything
 * registered is removed again, newest first. Only documents THIS request created are
 * ever removed.
 *
 *   const created = createRollback();
 *   const term = created.track(Term, await Term.create(...));
 *   try { ... } catch (e) { await created.undo(); throw e; }
 */
const createRollback = () => {
  const entries = [];

  return {
    /** Register one created document (or, for insertMany results, an array of them). */
    track(Model, docOrDocs) {
      const ids = [].concat(docOrDocs).filter(Boolean).map((doc) => doc._id);
      if (ids.length) entries.push({ Model, ids });
      return docOrDocs;
    },
    /** Register ids directly, e.g. for documents created by a query helper. */
    trackIds(Model, ids) {
      const list = [].concat(ids).filter(Boolean);
      if (list.length) entries.push({ Model, ids: list });
    },
    size: () => entries.length,
    /** Remove everything registered, newest first. Never throws; failures are logged. */
    async undo() {
      for (const { Model, ids } of entries.reverse()) {
        try {
          await Model.deleteMany({ _id: { $in: ids } });
        } catch (error) {
          logger.error("rollback step failed; manual cleanup may be needed", {
            err: error,
            model: Model.modelName,
            count: ids.length,
          });
        }
      }
      entries.length = 0;
    },
  };
};

module.exports = { createRollback };
