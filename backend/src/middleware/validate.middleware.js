/** Wraps a zod schema and validates req.body / req.query / req.params, replacing them with the parsed (typed/coerced) values. */
function validate(schema, source = 'body') {
  return function validateMiddleware(req, res, next) {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = validate;
