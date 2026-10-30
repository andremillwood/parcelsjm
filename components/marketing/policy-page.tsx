import { PageIntro, ButtonLink } from "./ui";
import {
  policies,
  POLICY_EFFECTIVE_DATE,
  POLICY_VERSION,
} from "../../lib/policies/current";
export function PolicyPage({ kind }: { kind: string }) {
  const p = policies[kind];
  return (
    <div className="m-container m-content-bottom">
      <PageIntro eyebrow="Customer policies" title={p.title}>
        <p>
          Mckellar Group of Companies · Effective {POLICY_EFFECTIVE_DATE} ·
          Version {POLICY_VERSION}
        </p>
      </PageIntro>
      <article className="m-policy-draft">
        {p.sections.map((s) => (
          <section key={s.title}>
            <h2>{s.title}</h2>
            {s.paragraphs.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </section>
        ))}
      </article>
      <ButtonLink href="/help" secondary>
        Return to help
      </ButtonLink>
    </div>
  );
}
