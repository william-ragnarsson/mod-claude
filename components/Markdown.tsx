import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { blobUrl, rawUrl, type RepoRef } from "@/lib/hosts";

type Source = RepoRef & { branch: string; path: string | null };

const ABSOLUTE = /^([a-z][a-z0-9+.-]*:|\/\/)/i;
const GITHUB_BLOB = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/;
const GITLAB_BLOB = /^(https:\/\/gitlab\.com\/.+?)\/-\/blob\/(.+)$/;

/** Resolves `target` against the directory `base`, handling "." and "..". */
function resolvePath(base: string, target: string): string {
  const segments = target.startsWith("/") ? [] : base.split("/").filter(Boolean);
  for (const segment of target.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") segments.pop();
    else segments.push(segment);
  }
  return segments.join("/");
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** README links are written relative to the README's folder in the repo. Point them back at the repo's host. */
function transformUrl(url: string, key: string, source: Source): string | null | undefined {
  if (ABSOLUTE.test(url) || url.startsWith("#") || url === "") {
    // Images linked to a file page on either host only render through the /raw/ route.
    const blob = key === "src" ? url.match(GITHUB_BLOB) : null;
    if (blob) return `https://github.com/${blob[1]}/${blob[2]}/raw/${blob[3]}`;
    const gitlabBlob = key === "src" ? url.match(GITLAB_BLOB) : null;
    if (gitlabBlob) return `${gitlabBlob[1]}/-/raw/${gitlabBlob[2]}`;
    return defaultUrlTransform(url);
  }

  const split = url.search(/[?#]/);
  const pathPart = split === -1 ? url : url.slice(0, split);
  const suffix = split === -1 ? "" : url.slice(split);
  const readmeDir = source.path?.includes("/") ? source.path.slice(0, source.path.lastIndexOf("/")) : "";
  const filePath = resolvePath(readmeDir, safeDecode(pathPart));

  if (key === "src") return rawUrl(source, source.branch, filePath);
  return `${blobUrl(source, source.branch, filePath)}${suffix}`;
}

/** `srcset` is a list of "url descriptor" pairs, which react-markdown leaves alone. Resolve each url like a `src`. */
function transformSrcSet(srcSet: string | undefined, source: Source): string | undefined {
  if (!srcSet) return srcSet;
  return srcSet
    .split(",")
    .map((candidate) => {
      const [url, ...descriptor] = candidate.trim().split(/\s+/);
      return [transformUrl(url, "src", source) ?? "", ...descriptor].join(" ");
    })
    .join(", ");
}

export function Markdown({ markdown, source }: { markdown: string; source: Source }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, rehypeSanitize]}
      urlTransform={(url, key) => transformUrl(url, key, source)}
      components={{
        // `node` is react-markdown's syntax tree node. Keep it off the DOM element.
        a: ({ node, href, ...props }) => {
          void node;
          return href?.startsWith("#") ? (
            <a href={href} {...props} />
          ) : (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow" {...props} />
          );
        },
        img: ({ node, srcSet, ...props }) => {
          void node;
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          return <img loading="lazy" decoding="async" srcSet={transformSrcSet(srcSet, source)} {...props} />;
        },
        // Light/dark variants in <picture>, as GitHub READMEs often use.
        source: ({ node, srcSet, ...props }) => {
          void node;
          return <source srcSet={transformSrcSet(srcSet, source)} {...props} />;
        },
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
