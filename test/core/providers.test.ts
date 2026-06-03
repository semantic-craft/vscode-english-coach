import { describe, it, expect, vi, afterEach } from "vitest";
import { detectProtocol, generateWithProvider } from "../../src/core/providers";
import type { ProviderConfig } from "../../src/core/types";

afterEach(() => vi.restoreAllMocks());

describe("detectProtocol", () => {
  it("gemini and openai are always openai", () => {
    expect(detectProtocol("gemini", "https://x")).toBe("openai");
    expect(detectProtocol("openai", "https://x")).toBe("openai");
  });
  it("anthropic-shaped paths -> anthropic", () => {
    expect(detectProtocol("deepseek", "https://api.deepseek.com/anthropic")).toBe("anthropic");
    expect(detectProtocol("qwen", "https://token-plan.cn-beijing.maas.aliyuncs.com/apps/anthropic")).toBe("anthropic");
  });
  it("keeps MiMo text generation on the Anthropic-compatible protocol", () => {
    expect(detectProtocol("mimo", "https://token-plan-cn.xiaomimimo.com/v1")).toBe("anthropic");
    expect(detectProtocol("mimo", "https://api.xiaomimimo.com/v1")).toBe("anthropic");
    expect(detectProtocol("mimo", "https://token-plan-cn.xiaomimimo.com/anthropic")).toBe("anthropic");
  });
  it("routes Qwen Token Plan by base URL protocol", () => {
    expect(detectProtocol("qwen", "https://dashscope.aliyuncs.com/compatible-mode/v1")).toBe("openai");
    expect(detectProtocol("qwen", "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1")).toBe("openai");
    expect(detectProtocol("qwen", "https://token-plan.cn-beijing.maas.aliyuncs.com/apps/anthropic")).toBe("anthropic");
  });
  it("falls back to anthropic", () => {
    expect(detectProtocol("mimo", "https://example.com/foo")).toBe("anthropic");
  });
});

describe("generateWithProvider (OpenAI protocol)", () => {
  it("posts to /chat/completions and returns content", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ choices: [{ message: { content: "hello" } }] }), { status: 200 }),
      );
    const config: ProviderConfig = {
      id: "openai",
      title: "OpenAI",
      apiKey: "sk-test",
      baseURL: "https://api.openai.com/v1",
      model: "openai-chat-test-model",
      apiProtocol: "openai",
    };
    const out = await generateWithProvider(config, { system: "s", user: "u" }, 5000, 256);
    expect(out).toBe("hello");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("disables reasoning for GPT-5.5 chat completions", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ choices: [{ message: { content: "hello" } }] }), { status: 200 }),
      );
    const config: ProviderConfig = {
      id: "openai",
      title: "OpenAI",
      apiKey: "sk-test",
      baseURL: "https://api.openai.com/v1",
      model: "gpt-5.5",
      apiProtocol: "openai",
    };
    const out = await generateWithProvider(config, { system: "s", user: "u" }, 5000, 256);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(out).toBe("hello");
    expect(body.max_completion_tokens).toBe(256);
    expect(body.reasoning_effort).toBe("none");
    expect(body.max_tokens).toBeUndefined();
    expect(body.temperature).toBeUndefined();
  });

  it("enables medium reasoning for GPT-5.5 when requested", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ choices: [{ message: { content: "hello" } }] }), { status: 200 }),
      );
    const config: ProviderConfig = {
      id: "openai",
      title: "OpenAI",
      apiKey: "sk-test",
      baseURL: "https://api.openai.com/v1",
      model: "gpt-5.5",
      reasoningMode: "on",
      apiProtocol: "openai",
    };
    await generateWithProvider(config, { system: "s", user: "u" }, 5000, 256);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.reasoning_effort).toBe("medium");
    expect(body.max_completion_tokens).toBe(256);
  });

  it("normalizes optional JSON schema fields for OpenAI strict structured outputs", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), { status: 200 }));
    const config: ProviderConfig = {
      id: "openai",
      title: "OpenAI",
      apiKey: "sk-test",
      baseURL: "https://api.openai.com/v1",
      model: "gpt-5.5",
      apiProtocol: "openai",
    };
    await generateWithProvider(config, { system: "s", user: "u" }, 5000, 256, {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        required: ["text"],
        propertyOrdering: ["text", "maybe", "words"],
        properties: {
          text: { type: "string" },
          maybe: { type: "string" },
          words: {
            type: "array",
            items: {
              type: "object",
              required: ["text"],
              properties: {
                text: { type: "string" },
                ipa: { type: "string" },
                linkToNext: { type: ["string", "null"], enum: ["liaison", null] },
              },
            },
          },
        },
      },
    });
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    const schema = body.response_format.json_schema.schema;
    expect(schema.propertyOrdering).toBeUndefined();
    expect(schema.required).toEqual(["text", "maybe", "words"]);
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties.maybe.type).toEqual(["string", "null"]);
    expect(schema.properties.words.items.required).toEqual(["text", "ipa", "linkToNext"]);
    expect(schema.properties.words.items.additionalProperties).toBe(false);
    expect(schema.properties.words.items.properties.ipa.type).toEqual(["string", "null"]);
    expect(schema.properties.words.items.properties.linkToNext.type).toEqual(["string", "null"]);
    expect(schema.properties.words.items.properties.linkToNext.enum).toEqual(["liaison", null]);
  });

  it("maps the thinking toggle to OpenAI-compatible Qwen enable_thinking", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      return new Response(JSON.stringify({ choices: [{ message: { content: "hello" } }] }), { status: 200 });
    });
    const config: ProviderConfig = {
      id: "qwen",
      title: "Qwen",
      apiKey: "qwen-test",
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: "qwen3.6-flash",
      apiProtocol: "openai",
    };
    await generateWithProvider(config, { system: "s", user: "u" }, 5000, 256);
    let body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.enable_thinking).toBe(false);

    fetchMock.mockClear();
    await generateWithProvider({ ...config, reasoningMode: "on" }, { system: "s", user: "u" }, 5000, 256);
    body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.enable_thinking).toBe(true);
  });

  it("uses Anthropic-compatible Qwen Token Plan when the base URL requests it", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      return new Response(JSON.stringify({ content: [{ type: "text", text: "hello" }] }), { status: 200 });
    });
    const config: ProviderConfig = {
      id: "qwen",
      title: "Qwen",
      apiKey: "qwen-test",
      baseURL: "https://token-plan.cn-beijing.maas.aliyuncs.com/apps/anthropic",
      model: "qwen3.6-flash",
      apiProtocol: "anthropic",
      reasoningMode: "off",
    };
    const out = await generateWithProvider(config, { system: "s", user: "u" }, 5000, 256);
    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(out).toBe("hello");
    expect(url).toBe("https://token-plan.cn-beijing.maas.aliyuncs.com/apps/anthropic/v1/messages");
    expect(body.thinking).toEqual({ type: "disabled" });
    expect((init?.headers as Record<string, string>)["anthropic-version"]).toBe("2023-06-01");
  });

  it("uses MiMo Anthropic Token Plan headers, disables thinking, and embeds JSON constraints", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ content: [{ type: "text", text: "{}" }] }), { status: 200 }));
    const config: ProviderConfig = {
      id: "mimo",
      title: "Xiaomi MiMo",
      apiKey: "tp-test",
      baseURL: "https://token-plan-cn.xiaomimimo.com/anthropic",
      model: "mimo-v2.5-pro",
      apiProtocol: "anthropic",
    };
    await generateWithProvider(config, { system: "s", user: "u" }, 5000, 256, {
      responseMimeType: "application/json",
      responseJsonSchema: { type: "object", properties: { ok: { type: "boolean" } } },
    });
    const [url, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    const body = JSON.parse(String(init?.body));
    expect(url).toBe("https://token-plan-cn.xiaomimimo.com/anthropic/v1/messages");
    expect(headers.Authorization).toBe("Bearer tp-test");
    expect(headers["api-key"]).toBe("tp-test");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    expect(body.thinking).toEqual({ type: "disabled" });
    expect(body.system).toContain("JSON schema");
    expect(body.response_format).toBeUndefined();
  });

  it("does not inject disabled MiMo thinking when requested", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ content: [{ type: "text", text: "{}" }] }), { status: 200 }));
    const config: ProviderConfig = {
      id: "mimo",
      title: "Xiaomi MiMo",
      apiKey: "tp-test",
      baseURL: "https://token-plan-cn.xiaomimimo.com/anthropic",
      model: "mimo-v2.5-pro",
      reasoningMode: "on",
      apiProtocol: "anthropic",
    };
    await generateWithProvider(config, { system: "s", user: "u" }, 5000, 256);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.thinking).toBeUndefined();
  });
});

describe("generateWithProvider (Gemini protocol)", () => {
  it("uses Gemini JSON mime mode and embeds schema constraints in the prompt", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }), { status: 200 }),
      );
    const config: ProviderConfig = {
      id: "gemini",
      title: "Gemini",
      apiKey: "gem-test",
      baseURL: "https://generativelanguage.googleapis.com/v1beta",
      model: "gemini-3.5-flash",
      apiProtocol: "openai",
    };
    await generateWithProvider(config, { system: "s", user: "u" }, 5000, 256, {
      responseMimeType: "application/json",
      responseJsonSchema: { type: "object", properties: { ok: { type: "boolean" } } },
    });
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseFormat).toBeUndefined();
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingLevel: "minimal" });
    expect(body.system_instruction.parts[0].text).toContain("Structured output requirements");
    expect(body.system_instruction.parts[0].text).toContain("JSON schema");
  });

  it("uses medium thinking for Gemini 3.5 Flash when requested", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }), { status: 200 }),
      );
    const config: ProviderConfig = {
      id: "gemini",
      title: "Gemini",
      apiKey: "gem-test",
      baseURL: "https://generativelanguage.googleapis.com/v1beta",
      model: "gemini-3.5-flash",
      reasoningMode: "on",
      apiProtocol: "openai",
    };
    await generateWithProvider(config, { system: "s", user: "u" }, 5000, 256);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingLevel: "medium" });
  });

  it("keeps thinking enabled for Gemini Pro models (which require it)", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }), { status: 200 }),
      );
    const config: ProviderConfig = {
      id: "gemini",
      title: "Gemini",
      apiKey: "gem-test",
      baseURL: "https://generativelanguage.googleapis.com/v1beta",
      model: "gemini-3.1-pro-preview",
      apiProtocol: "openai",
    };
    await generateWithProvider(config, { system: "s", user: "u" }, 5000, 256, { responseMimeType: "application/json" });
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.generationConfig.thinkingConfig).toBeUndefined();
  });
});

describe("generateWithProvider (Anthropic protocol)", () => {
  it("disables thinking by default and lets provider-native thinking run when requested", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      return new Response(JSON.stringify({ content: [{ type: "text", text: "hello" }] }), { status: 200 });
    });
    const config: ProviderConfig = {
      id: "deepseek",
      title: "DeepSeek",
      apiKey: "deepseek-test",
      baseURL: "https://api.deepseek.com/anthropic",
      model: "deepseek-v4-pro",
      apiProtocol: "anthropic",
    };
    await generateWithProvider(config, { system: "s", user: "u" }, 5000, 256);
    let body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.thinking).toEqual({ type: "disabled" });

    fetchMock.mockClear();
    await generateWithProvider({ ...config, reasoningMode: "on" }, { system: "s", user: "u" }, 5000, 256);
    body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.thinking).toBeUndefined();
  });
});
