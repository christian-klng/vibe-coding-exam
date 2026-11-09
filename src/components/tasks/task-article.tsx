import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** The explanatory text of a task, rendered the same way on the task page and in the admin preview. */
export function TaskArticle({ markdown }: { markdown: string }) {
  return (
    <article className="prose prose-neutral max-w-none dark:prose-invert prose-headings:font-semibold prose-h2:text-lg prose-pre:overflow-x-auto prose-code:before:content-none prose-code:after:content-none [&_blockquote_p]:before:content-none [&_blockquote_p]:after:content-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </article>
  );
}
