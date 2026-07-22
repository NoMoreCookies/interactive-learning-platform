import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

type LatexContentProps = {
  content: string;
};

export default function LatexContent({
  content,
}: LatexContentProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
    >
      {content}
    </ReactMarkdown>
  );
}