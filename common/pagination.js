const { ValidationError } = require("./errors");

const DEFAULT_MAX_LIMIT = 200;

/**
 * Opt-in pagination. Without `page` or `limit` in the query string nothing changes:
 * the endpoint returns the full array it always did. With them, the same array
 * shape is returned for one page, and the total is sent in the `X-Total-Count`
 * header (exposed through CORS), so existing clients keep working.
 *
 * `limit` is capped at `maxLimit`; zero, negative or non-numeric values are a 400.
 */
const parsePagination = (queryString = {}, { maxLimit = DEFAULT_MAX_LIMIT, defaultLimit = 50 } = {}) => {
  const { page, limit } = queryString;
  if (page === undefined && limit === undefined) return null;

  const toPositiveInt = (value, name, fallback) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^[0-9]+$/.test(value) || Number(value) < 1) {
      throw new ValidationError(`${name} must be a positive whole number`);
    }
    return Number(value);
  };

  const pageNumber = toPositiveInt(page, "page", 1);
  const pageSize = Math.min(toPositiveInt(limit, "limit", defaultLimit), maxLimit);
  return { page: pageNumber, limit: pageSize, skip: (pageNumber - 1) * pageSize };
};

/**
 * Apply pagination to a Mongoose query when the client asked for it.
 * `count` is a function returning the total for the same filter.
 */
const withPagination = async (req, res, query, count, options) => {
  const paging = parsePagination(req.query, options);
  if (!paging) return query;

  res.set("X-Total-Count", String(await count()));
  res.set("X-Page", String(paging.page));
  res.set("X-Page-Size", String(paging.limit));
  return query.skip(paging.skip).limit(paging.limit);
};

module.exports = { parsePagination, withPagination, DEFAULT_MAX_LIMIT };
