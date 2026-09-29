export function redirect(url: string): never {
  throw Object.assign(new Error(`NEXT_REDIRECT:${url}`), { digest: "NEXT_REDIRECT" });
}
export function notFound(): never {
  throw new Error("NEXT_NOT_FOUND");
}
