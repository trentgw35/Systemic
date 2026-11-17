/**
 * AI provider adapter (Context 05).
 * Checks must never call this. Feature-flagged; no-op until a provider is configured.
 */

export type DraftTreeInput = {
  mode: "decision" | "rcca";
  title: string;
  sourceMaterial: string;
};

export type DraftTreeNode = {
  label: string;
  kind: "opinion" | "anecdote" | "advisory" | "data" | "process";
  localWeight: number;
  children?: DraftTreeNode[];
};

export type DraftTreeResult = {
  sections: Array<{
    label: string;
    localWeight: number;
    children: DraftTreeNode[];
  }>;
  provider: string;
  model: string;
};

export type InterpretInput = {
  checkTitle: string;
  checkDetail: string;
  itemTitle: string;
  mode: "decision" | "rcca";
};

export interface AIProvider {
  draftTree(input: DraftTreeInput): Promise<DraftTreeResult | null>;
  interpret(input: InterpretInput): Promise<string | null>;
}

export class NoopAIProvider implements AIProvider {
  async draftTree(): Promise<DraftTreeResult | null> {
    return null;
  }
  async interpret(): Promise<string | null> {
    return null;
  }
}

export function isAIFeaturesEnabled() {
  return process.env.AI_FEATURES_ENABLED === "true";
}

/** True when a provider name and key are present (live adapter still optional). */
export function isAIProviderConfigured() {
  return Boolean(
    process.env.AI_PROVIDER?.trim() && process.env.AI_API_KEY?.trim(),
  );
}

export function getAIProvider(): AIProvider {
  // Provider/model/key are env-configured; never hard-coded.
  // A live provider is wired later behind this adapter.
  void process.env.AI_PROVIDER;
  void process.env.AI_MODEL;
  void process.env.AI_API_KEY;
  return new NoopAIProvider();
}
