import { describe, expect, it } from "vitest";
import { signPreviewToken, verifyPreviewToken } from "@/lib/preview/token";

describe("preview tokens", () => {
  it("round-trips a signed token", () => {
    const token = signPreviewToken("project-123");
    const result = verifyPreviewToken(token);
    expect(result).not.toBeNull();
    expect(result!.projectId).toBe("project-123");
    expect(result!.expiresAt).toBeGreaterThan(Date.now());
  });

  it("rejects tampered signatures", () => {
    const token = signPreviewToken("project-123");
    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
    expect(verifyPreviewToken(tampered)).toBeNull();
  });

  it("rejects a tampered body (project swap) — the signature binds the payload", () => {
    const token = signPreviewToken("project-123");
    const dot = token.lastIndexOf(".");
    const body = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    // flip one character of the body (the encoded projectId+expiry payload)
    const idx = body.length - 1;
    const flipped = body[idx] === "A" ? "B" : "A";
    const forged = `${body.slice(0, idx)}${flipped}${body.slice(idx + 1)}.${sig}`;
    expect(verifyPreviewToken(forged)).toBeNull();
    // and a token signed for another project only grants that other project
    expect(verifyPreviewToken(signPreviewToken("project-999"))?.projectId).toBe("project-999");
    expect(verifyPreviewToken(token)?.projectId).toBe("project-123");
  });

  it("rejects expired tokens", async () => {
    const token = signPreviewToken("project-123", 1); // expires in 1ms
    await new Promise((r) => setTimeout(r, 10));
    expect(verifyPreviewToken(token)).toBeNull();
  });

  it("rejects garbage", () => {
    expect(verifyPreviewToken("")).toBeNull();
    expect(verifyPreviewToken("not-a-token")).toBeNull();
    expect(verifyPreviewToken("!!!")).toBeNull();
  });
});
