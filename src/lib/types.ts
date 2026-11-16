export type WorkspaceRole = "admin" | "member";
export type ItemMode = "decision" | "rcca";
export type EvidenceKind =
  | "opinion"
  | "anecdote"
  | "advisory"
  | "data"
  | "process";

export type Profile = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

export type Workspace = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
};

export type Membership = {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
};

export type Item = {
  id: string;
  workspace_id: string;
  mode: ItemMode;
  title: string;
  group_tag: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  locked_at: string | null;
  lock_stamp: string | null;
  expected_areas: string[] | null;
};

export type NodeRow = {
  id: string;
  item_id: string;
  parent_id: string | null;
  label: string;
  kind: EvidenceKind;
  local_weight: number;
  owner_id: string | null;
  delegated_from: string | null;
  confirmed: boolean;
  confirmed_at: string | null;
  sort_order: number;
  created_at: string;
};
