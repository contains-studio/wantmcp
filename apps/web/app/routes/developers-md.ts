/** /developers.md (SPEC 24.3): the developer guide as it is, for a coding agent. The same copy /developers lays out. */
import source from "~/content/developers.md?raw";

export function loader() {
  return new Response(source, {
    headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=300, s-maxage=3600", "access-control-allow-origin": "*" },
  });
}
