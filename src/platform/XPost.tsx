import { useState } from "react";
import { CivicEvent } from "./types";

// Let X render the current post, its entities, media, edit history and attribution.
// Do not substitute cached text if X has removed a post or the embed is blocked.
export default function XPost({ event }: { event: CivicEvent }) {
  const [loaded, setLoaded] = useState(false);
  const url = event.source_url;
  if (!url || !/^https:\/\/x\.com\/\w{1,15}\/status\/\d{1,30}$/.test(url)) return null;
  return <div className="x-post">
    {!loaded ? <button className="secondary" onClick={() => setLoaded(true)}>Show original X post</button> :
      <iframe title={`X post by @${event.author_username}`} loading="lazy" referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        srcDoc={`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font:14px system-ui}a{color:#6550bd}</style></head><body><blockquote class="twitter-tweet" data-dnt="true" data-conversation="none"><a href="${url}" target="_blank" rel="noopener noreferrer">View original post on X</a></blockquote><script async src="https://platform.x.com/widgets.js" charset="utf-8"></script></body></html>`} />}
    <small>{loaded ? "If this post is unavailable here, open its original link on X." : "Loads X’s embedded post when selected. Analytics use the text captured at ingestion."}</small>
  </div>;
}
