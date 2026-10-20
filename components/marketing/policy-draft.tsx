import { PageIntro, Notice, ButtonLink } from "./ui";
import { policies } from "../../lib/policies/drafts";
export function PolicyDraft({ kind }: { kind: string }) {
  const p = policies[kind];
  return (
    <div className="m-container m-content-bottom">
      <PageIntro eyebrow="For review" title={p.title}>
        <p>Mckellar Group of Companies · Prepared 20 October 2026</p>
      </PageIntro>
      <Notice>
        <strong>Draft — approval pending.</strong> This is review text, not an
        operative policy. Items in brackets require confirmation. Public signup
        remains disabled.
      </Notice>
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
