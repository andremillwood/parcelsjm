import Link from "next/link";
import {
  PAGE_SIZE,
  type Pagination as PageData,
} from "../../lib/workspace/pagination";
export function Pagination({ data }: { data?: PageData }) {
  if (!data) return null;
  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const href = (page: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(data.params))
      if (typeof v === "string" && v) q.set(k, v);
    q.set("page", String(page));
    return `?${q}`;
  };
  return (
    <nav className="w-pagination" aria-label="Results pages">
      <p>
        {data.total} matching records · Page {data.page} of {pages}
      </p>
      <div>
        {data.page > 1 && (
          <Link
            className="w-button w-button-secondary"
            href={href(data.page - 1)}
          >
            Previous
          </Link>
        )}
        {data.page < pages && (
          <Link
            className="w-button w-button-secondary"
            href={href(data.page + 1)}
          >
            Next
          </Link>
        )}
        {data.page > pages && <Link href={href(1)}>Return to first page</Link>}
      </div>
    </nav>
  );
}

export function RecordSearch({ data }: { data?: PageData }) {
  if (!data) return null;
  return (
    <form method="get" className="w-toolbar w-panel w-pad">
      <label>
        Search all records
        <input
          name="q"
          type="search"
          defaultValue={typeof data.params.q === "string" ? data.params.q : ""}
          maxLength={120}
        />
      </label>
      <button className="w-button">Search</button>
      <Link href="?">Clear search</Link>
    </form>
  );
}
