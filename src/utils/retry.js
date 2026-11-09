export async function generateWithRetry(model, options, attempts = 3) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await model.generateContent(options);
    } catch (error) {
      lastError = error;
      const status = error?.status || error?.code;
      if (![429, 503].includes(Number(status)) || i === attempts - 1) break;
      await new Promise(resolve => setTimeout(resolve, 400 * (i + 1)));
    }
  }
  throw lastError;
}
