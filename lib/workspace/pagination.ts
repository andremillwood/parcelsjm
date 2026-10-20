export type QueryParams = Record<string, string | string[] | undefined>;
export const PAGE_SIZE = 25;
export function listOptions(params: QueryParams = {}) {
  const value = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : "";
  const page = /^\d{1,6}$/.test(value("page"))
    ? Math.max(1, Math.min(10000, Number(value("page"))))
    : 1;
  return {
    page,
    from: (page - 1) * PAGE_SIZE,
    to: page * PAGE_SIZE - 1,
    search: value("q")
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .slice(0, 120),
    status: value("status"),
    kind: value("kind"),
    assignee: value("assignee"),
    priority: value("priority"),
    overdue: value("overdue") === "true",
  };
}
export type Pagination = { page: number; total: number; params: QueryParams };
