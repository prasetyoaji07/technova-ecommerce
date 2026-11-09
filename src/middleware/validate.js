import { AppError } from '../utils/app-error.js';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(new AppError(422, 'VALIDATION_ERROR', 'Data yang dikirim tidak valid.',
        result.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message }))));
    }
    req[source] = result.data;
    return next();
  };
}
