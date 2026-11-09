export function success(res, data, status = 200) {
  return res.status(status).json({ data });
}
export function failure(res, code, message, details = [], status = 400) {
  return res.status(status).json({ error: { code, message, details } });
}
