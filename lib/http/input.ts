export class InputError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function readJson(
  request: Request,
  limit = 8192,
): Promise<unknown> {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new InputError(403, "Submit the form from this website.");
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new InputError(415, "Use the application form.");
  const reader = request.body?.getReader();
  if (!reader) throw new InputError(400, "Request body required.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new InputError(413, "Request too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new InputError(400, "Invalid request.");
  }
}
export const reply = (status: number, message: string) =>
  Response.json(
    { message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
