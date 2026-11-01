import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { MAX_BODY_BYTES, readJson } from "./read-json";

function request(body: string, headers: HeadersInit = { "content-type": "application/json" }) {
  return new NextRequest("https://wedding.example/api/test", {
    method: "POST",
    headers,
    body,
  });
}

describe("bounded JSON request parsing", () => {
  it("parses a valid JSON object", async () => {
    await expect(readJson(request('{"name":"Linh"}'))).resolves.toEqual({ name: "Linh" });
  });

  it("accepts a body exactly at the byte limit", async () => {
    const prefix = '{"value":"';
    const suffix = '"}';
    const body = `${prefix}${"a".repeat(MAX_BODY_BYTES - prefix.length - suffix.length)}${suffix}`;
    await expect(readJson(request(body))).resolves.toEqual({ value: "a".repeat(MAX_BODY_BYTES - prefix.length - suffix.length) });
  });

  it("rejects a body larger than the limit even when content length is absent", async () => {
    const oversizedBody = JSON.stringify({ value: "a".repeat(MAX_BODY_BYTES) });
    await expect(readJson(request(oversizedBody))).resolves.toBeNull();
  });

  it("enforces the limit using UTF-8 bytes", async () => {
    await expect(readJson(request(JSON.stringify({ value: "💒".repeat(3000) })))).resolves.toBeNull();
  });

  it("rejects a declared oversized body before reading it", async () => {
    await expect(
      readJson(request("{}", { "content-type": "application/json", "content-length": String(MAX_BODY_BYTES + 1) })),
    ).resolves.toBeNull();
  });

  it("rejects malformed JSON and non-object payloads", async () => {
    await expect(readJson(request("{"))).resolves.toBeNull();
    await expect(readJson(request("[]"))).resolves.toBeNull();
  });

  it("rejects non-JSON content types", async () => {
    await expect(readJson(request('{"name":"Linh"}', { "content-type": "text/plain" }))).resolves.toBeNull();
  });
});
