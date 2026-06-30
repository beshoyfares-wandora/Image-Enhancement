import type { ProductContent } from "../types/enhancement";

interface ProductContentPanelProps {
  content: ProductContent;
}

const SECTION_LABEL =
  "mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400";

/** Renders the AI-generated marketing content in the app's dark design. */
export function ProductContentPanel({ content }: ProductContentPanelProps) {
  const specs = Object.entries(content.keySpecifications);

  return (
    <section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex items-center gap-2">
        <span className="text-lg">📝</span>
        <h2 className="font-semibold text-slate-100">Generated Product Content</h2>
      </div>

      <div>
        <h3 className="text-2xl font-bold text-white">{content.title}</h3>
        {content.shortDescription ? (
          <p className="mt-2 text-slate-300">{content.shortDescription}</p>
        ) : null}
      </div>

      {content.description ? (
        <div>
          <h4 className={SECTION_LABEL}>Description</h4>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
            {content.description}
          </p>
        </div>
      ) : null}

      {content.bulletFeatures.length > 0 ? (
        <div>
          <h4 className={SECTION_LABEL}>Features</h4>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
            {content.bulletFeatures.map((feature, index) => (
              <li key={`${index}-${feature}`}>{feature}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {content.materials.length > 0 ? (
        <div>
          <h4 className={SECTION_LABEL}>Materials</h4>
          <div className="flex flex-wrap gap-2">
            {content.materials.map((material, index) => (
              <span
                key={`${index}-${material}`}
                className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-200"
              >
                {material}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {specs.length > 0 ? (
        <div>
          <h4 className={SECTION_LABEL}>Key specifications</h4>
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <tbody>
                {specs.map(([label, value], index) => (
                  <tr
                    key={label}
                    className={index % 2 === 0 ? "bg-slate-900/20" : "bg-slate-900/40"}
                  >
                    <td className="w-1/3 border-b border-slate-800 px-4 py-2 align-top font-medium text-slate-300">
                      {label}
                    </td>
                    <td className="border-b border-slate-800 px-4 py-2 text-slate-400">
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h4 className={SECTION_LABEL}>SEO title</h4>
          <p className="text-sm text-slate-300">{content.seoTitle}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h4 className={SECTION_LABEL}>SEO description</h4>
          <p className="text-sm text-slate-300">{content.seoDescription}</p>
        </div>
      </div>
    </section>
  );
}
