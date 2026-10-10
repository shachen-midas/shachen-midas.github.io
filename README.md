# IP Observatory

A buildless, browser-only network observation page for **https://shachen-midas.github.io/**.

## Automatic coverage

Version `20261010-9` starts with **58 jobs** on every visit or full refresh. It then enables bounded automatic resampling. All detection runs without user input, permission requests or popup windows. Jobs are endpoint/configuration combinations, including request contexts and connectivity-only checks.

| Group | Jobs | What is observed |
| --- | ---: | --- |
| HTTPS Fetch | 19 | ipify, icanhazip, Cloudflare hostname/literal IPv4/literal IPv6, Amazon, HTTPBingo/HTTPBin, ZXINC, IP.SB, NetOkay, and Cloudflare ports 8443/2087. |
| WebRTC / ICE | 20 | Host interfaces; Google, Cloudflare, Bilibili, HiTV and MiWiFi STUN; an IPPure comparison; explicit IPv4/IPv6 targets; receive-only media; Open Relay TURN over UDP, TCP and TLS. |
| DNS / ECS | 2 | A fresh IP-API random hostname and a bash.ws session with four names, triggered through Fetch, an image and a DNS-prefetch hint. |
| XMLHttpRequest | 2 | ipify dual stack and ZXINC, separately from Fetch. |
| Script / iframe | 3 | ipify IPv4, IPv6 and dual stack using JSONP inside an opaque-origin sandbox. |
| Dedicated Worker | 2 | ipify and Cloudflare requests from a worker. |
| Service Worker | 1 | Two fixed endpoints from a temporary worker scoped to `/workers/`. |
| WebSocket | 3 | OnSIP's SIP `Via.received` source reflection, plus small challenge echoes at WebSocket.org and NetOkay. The two echo services do not return the client IP. |
| WebTransport | 3 | WTCheck's source address stream over QUIC on port 4433, plus small Semantic Echo datagram echoes on ports 443 and 4438. The two echo services do not return the client IP. |
| Connected WebRTC peer | 1 | A data-only connection to the public Janus EchoTest demo, collecting local candidates and the selected local path after a verified echo. |
| Embedded page context | 1 | An HTTPBin iframe runs a same-origin `/ip` request, for comparison with this page's cross-origin Fetch. |
| Resource receipts | 1 | YiteAI's temporary observer correlates Fetch, image and iframe requests. Its public collector currently has a TLS availability issue; failure is shown explicitly. |

The user selected existing public services only: no paid resources, new hosting accounts, backend deployment, or private API credentials.

Every observed connection address stays visible with its country flag and all sources. DNS resolvers, ECS hints, TURN relays and IPv6-derived IPv4 hints appear in a separate visible section. Copy includes every distinct address; export retains its role and evidence. Unsupported APIs, unavailable paths, partial ICE results, and successful echoes without an IP have different states.

### Repeated observations

After a full automatic pass, the page observes for five minutes. Two follow-up passes become due after 30 and 90 seconds; network recovery and available Network Information API change events can trigger up to three additional passes. Overlapping triggers are combined, starts are at least 15 seconds apart, and a new pass waits for active work to finish. Automatic passes start only while the page is visible and online. Browser network events are hints: a VPN change does not necessarily generate an event.

Each follow-up selects 14 existing paths: six HTTP endpoints (IPv4, IPv6, ZXINC, literal IPv4/IPv6 and NetOkay), four ICE configurations (Bilibili, HiTV, Cloudflare and explicit Cloudflare IPv6), and DNS/ECS, WSS source reflection, WebTransport source reflection and Janus. It creates fresh peer connections and candidates. The initial pass plus resampling therefore dispatch at most 128 automatic jobs per monitoring window, excluding country lookups.

All rounds stay in page memory until the page is closed or reloaded. New rounds preserve prior observations. Address cards show first/last observation times and round numbers; the route comparison uses only the current round so an old exit is not mistaken for a simultaneous extra route. The round list summarizes past passes, and export includes their complete source records. The refresh button starts a new monitoring window while retaining history. Stop cancels both active work and future sampling; pagehide does the same. Country lookup cancellation also prevents late callbacks from restarting requests.

### HTTP protocol evidence

Cloudflare trace `http=`, NetOkay `http_protocol`, and available Resource Timing `nextHopProtocol` fields are retained. Only an actual `h3` observation is labeled HTTP/3. Ordinary Fetch does not force HTTP/3 and a missing protocol field does not imply that it was unused. WebTransport requires unreliable transport: WTCheck supplies a source address on an incoming unidirectional stream, while the two Semantic Echo jobs verify one small datagram echo. No bandwidth test runs.

### Transport source reflection and resource receipts

OnSIP uses its public SIP.js demo WSS endpoint with the `sip` subprotocol. One `OPTIONS` request has `Max-Forwards: 0`, so it addresses only that endpoint and is not forwarded. No call, registration, account or authentication is involved. Only the first Via's `received` parameter in a response matching the random Call-ID, branch and CSeq is accepted. The server's intentional `483` response can still carry this source address. The sent-by hostname and ordinary echo text are not source addresses.

WTCheck's published browser client identifies `https://webt.wtcheck.top:4433/webtransport` as its source-IP service. This page reads its incoming stream with a 512-byte limit and the normal browser certificate checks. It does not substitute a Fetch IP when WebTransport fails.

YiteAI's public client documents a random-token collector at `https://dev.yiteai.com`. The collector must respond over HTTPS before this page dispatches any correlated resource requests. Only known channel receipts are consumed; a resource load event by itself is never an IP observation. During integration research on 2026-10-10, the collector's TLS certificate was expired. The job therefore reports unavailability until the public service is repaired; no certificate bypass or insecure fallback is used. The provider's client demonstrates Fetch and image channels; acceptance of the additional iframe channel remains unconfirmed.

### DNS evidence

IP-API's DNS API receives a fresh 32-character random hostname. `dns.ip` is a recursive resolver address. `edns.ip` is retained as an ECS network hint with an unknown prefix length: this API does not supply a mask, so the page does not invent `/24`, `/56`, or a complete client IP.

bash.ws supplies a fresh ID through `/id`; four new subdomains trigger resolution and the corresponding JSON endpoint returns observations. Only records explicitly typed `dns` or `ip` are consumed. A resolver is never compared against HTTP as an extra client exit. DNS-prefetch is a browser hint and may be ignored. TLS failure on a trigger can still follow a successful DNS lookup; the result comes from the DNS observer, not from image load success.

The IP-API documentation describes HTTP and offers SSL in its paid product. Its publicly accessible DNS HTTPS endpoint returned JSON with CORS during integration research; this is not a contracted availability guarantee. This page uses HTTPS only and does not fall back to insecure requests.

### ICE and TURN evidence

ICE candidate events, relatedAddress/raddr, final local SDP, ICE transport local candidates and getStats local-candidate records are collected independently. Remote candidates and STUN service DNS answers are never visitor observations. Receive-only audio/video transceivers do not request or capture a microphone or camera.

The IPPure comparison preserves its public Bilibili, HiTV, MiWiFi, Cloudflare and Google server ordering. Its three-second gathering timer starts final candidate/statistics readout, which may take up to one more second. New ICE events stop being accepted at that point. Other configurations use ten-second gathering timers. The three domestic STUN hosts also have independent probes, including explicit family targets where supported.

Open Relay's `staticauth.openrelay.metered.ca` uses the provider's intentionally published demonstration shared secret, `openrelayprojectsecret`. Web Crypto generates ten-minute HMAC credentials in memory. This is public service configuration, not the GitHub owner's credential or a private account key. The generated username and credential are excluded from exports. Allocations are closed after gathering; no peer media or relay traffic is sent. A TURN probe requires a relay candidate to claim allocation; other candidates alone are marked partial. Relay server addresses are kept separate from client/related addresses. Availability can vary; the public static-auth endpoint was not reachable over TLS from the implementation environment during endpoint research.

IPv4-mapped IPv6, 6to4 and Teredo encodings are also examined locally. A 6to4 gateway IPv4 or Teredo client mapped IPv4 is shown as a derived hint with its parent IPv6, never as a separately observed connection. The Teredo server field is not extracted as a client address. No prefixes are guessed for arbitrary IPv6 addresses.

The additional Janus job creates an ephemeral session and a data channel, exchanges SDP with the public EchoTest plugin, and verifies one random challenge response. No microphone, camera or media stream is used. Local candidate events and local-candidate statistics are retained, including the selected local path when available; remote peer addresses are excluded. Candidates already obtained survive a connection failure as partial evidence. This exchange sends Janus the local SDP, including ICE addresses discovered through STUN. Cleanup closes the peer connection and requests session destruction; the public demo also advertises a 60-second idle session timeout. Session identifiers and SDP are not exported.

### Request contexts and lifecycle

Third-party JSONP executes only inside a sandbox with `allow-scripts` and no same-origin permission. Its CSP permits the fixed IP providers; it cannot read the parent page. The parent checks the exact frame window, opaque origin, per-probe nonce and asset version before accepting a result. The script request is anonymous.

HTTPBin's documented `/base64/` HTML response renders a small diagnostic page that requests `/ip` from its own origin. An embedded HTTPS context runs automatically inside a hidden frame. Its result appears in the source table with the other automatic jobs. HTTPBin's `origin` chain remains an unverified reported address, consistent with its existing Fetch result.

The diagnostic page returns a bounded result in a URL fragment to this site's `context-probe.html`. Fragments are not sent in HTTP requests, and the callback clears it immediately. The hidden frame returns results using source-, origin-, version- and nonce-checked `postMessage`; it is removed on success, failure, stop or timeout. No return tokens or results are written to application storage.

Dedicated workers are terminated after their result or deadline. The Service Worker has a separate `/workers/` scope, no fetch handler, no caches, and no control over the main page. Its existing scope is checked before registration to avoid replacing an unrelated worker. The registration is removed on completion or cancellation; pagehide aborts active work. Registration cleanup is best effort if a browser terminates a page before a pending registration resolves. No visitor observations are persisted by the worker.

HTTP and ICE queues each allow at most four active jobs, and the other automatic probes at most two. Country lookups have a separate three-request limit. HTTP deadlines are nine seconds; explicit STUN DNS resolution is bounded to five seconds, ICE gathering to ten seconds (three for the IPPure configuration comparison), and final stats to one second. Other automatic jobs have a fifteen-second deadline except the connected Janus job, which has 22 seconds. The embedded diagnostic page has an eight-second `/ip` request. Worker network requests use seven seconds. Stopping a run cancels queued/active work and keeps the results already obtained. Every job has a terminal state.

## Address interpretation and privacy

Country flags are approximate IP database assignments, not a person's location. Countries come from country.is, not from the name of a STUN provider. Unknown countries use a globe and local/shared/documentation addresses a house. Unspecified placeholders (`0.0.0.0`, `::`, and the IPv4-mapped zero address) are discarded during normalization, including IPv4 values derived from IPv6 encodings. They do not appear in cards, source rows, counts, copied addresses or exported reports. Public observed and derived addresses are sent to country.is; local/shared/documentation addresses are not. Country lookup failure never removes an address.

The application has no visitor database, analytics, cookies, localStorage, IndexedDB, or CacheStorage. Observations, round history and temporary session identifiers stay in page memory, except for the short-lived context return fragment described above; an export is created only on the visitor's request. Public services see their own connections or DNS queries and may retain records. Janus receives local ICE addresses through SDP; country.is receives public addresses for flags; YiteAI's collector, when available, records its resource requests under a random token. Provider retention and GitHub's access logs are outside this application's storage.

Origin/forwarding chains remain explicitly unverified: upstream services or proxies can populate headers. IP-literal requests still follow the browser's effective routing configuration. Extra-exit comparison uses the same address family and excludes resolvers, ECS networks, relay servers and derived hints.

### Remaining coverage boundaries

- OnSIP supplies a WSS source field; WTCheck supplies a WebTransport source stream. The separate generic echo jobs still report connectivity only. YiteAI resource receipts currently depend on repair of the public collector's TLS configuration.
- Janus EchoTest does not provide the server's observed peer address in its normal response. Its documented detailed connection information belongs to an Admin/Monitor API, so this page continues to report local candidates and the selected local path. No admin credentials or privileged endpoints are probed.

- Direct Sockets belongs to installed Isolated Web Apps, not this ordinary page. There are no browser extensions, native helpers, microphone/camera/geolocation prompts, local-device interfaces or browser-exploit paths.
- This app cannot inspect GitHub's own request logs. It uses public reflection services instead.

## Files and maintenance

Publish only these files:

- `index.html`, `app.js`, `probes.js`, `peer-probe.js`, `sampling.js`, `style.css`, `favicon.svg`
- `context-probe.html`, `context-probe.js`
- `resource-probe.html`, `resource-probe.js`, `workers/network.js`
- `.nojekyll`, `.gitignore`, `README.md`

No build or package installation is required. The canonical syntax check is:

```sh
node --check app.js
node --check probes.js
node --check peer-probe.js
node --check sampling.js
node --check context-probe.js
node --check resource-probe.js
node --check workers/network.js
```

Keep internal asset versions in the HTML, main script, probe module, sandbox response and worker response consistent. Pages, scripts, styles and worker registrations use stable URLs without cache-busting version parameters. Opening an old page link removes its obsolete `v` and `reload` parameters from the address bar without another navigation. A main HTML/module/script mismatch presents an ordinary reload action instead of starting incompatible code. Diagnostic request parameters and temporary message-correlation nonces remain part of their existing protocols. The iframe CSP explicitly includes this site's public script URL because sandboxed origins may not match `self`; update it when forking to another origin.

JSON export uses **schema version 3**. `addresses` aggregates all rounds in the current page visit, while `results` describes the latest round. The `rounds` array contains each round's source results, with observation timestamps, first/last-seen times and round numbers. The legacy `manual` field remains false; permission metadata and the device-reported `wan` role are no longer produced because their detection paths have been removed. Consumers expecting schema 2's single-round interpretation must account for the rounds array. No endpoint URL, SDP or transient session credential is exported.

Earlier endpoint research confirmed a matching OnSIP WSS `Via.received` field, HTTPBin's URL-safe Base64 HTML response, Janus's advertised data-channel/CORS support, and YiteAI's TLS failure. WTCheck's stream contract and Janus's echo format were inspected in their public client/source. This revision has not executed the browser detection sequence, live Janus exchange or WebTransport session. Recovery of the resource collector has not been verified.

## Deployment and recovery

Target: `shachen-midas/shachen-midas.github.io`; user site `https://shachen-midas.github.io/`; Pages serves `master` at `/`. The pre-revision recovery source is commit `e5fc5e975dd1b291d734226bdc808e0cd8c734ac`. To undo this revision, revert its commit and push to the same branch. Do not reset or force-push unrelated changes.

Never commit credentials, machine settings, visitor reports, actual IP captures or account secrets. Public provider configuration facts and the documented Open Relay demo value are the only authentication-related material in source.

## Primary references

- [IP-API DNS API](https://ip-api.com/docs/dns), [bash.ws official client](https://github.com/macvk/dnsleaktest), [EDNS Client Subnet](https://www.rfc-editor.org/rfc/rfc7871.html)
- [Public WebSocket echo source](https://github.com/ably/echo.websocket.org), [NetOkay browser checks](https://netokay.net/connection-checks.js), [Semantic Echo service/source](https://github.com/jlukic/semantic-echo)
- [SIP.js public demo](https://github.com/onsip/SIP.js/blob/main/demo/demo-1.ts), [SIP over WebSocket](https://www.rfc-editor.org/rfc/rfc7118.html), [WTCheck public client](https://wtcheck.top/)
- [Janus REST API](https://janus.conf.meetecho.com/docs/rest), [Janus EchoTest](https://janus.conf.meetecho.com/docs/echotest.html), [EchoTest source](https://github.com/meetecho/janus-gateway/blob/master/src/plugins/janus_echotest.c)
- [Janus Admin/Monitor API](https://janus.conf.meetecho.com/docs/admin)
- [HTTPBin response API](https://httpbin.org/), [YiteAI public IP leak client](https://tools.yiteai.com/en/tools/ip-leak-test)
- [Open Relay public configuration](https://www.metered.ca/tools/openrelay/), [Cloudflare supported HTTPS ports](https://developers.cloudflare.com/fundamentals/reference/network-ports/)
- [IPPure WebRTC configuration](https://ippure.com/assets/chunks/webrtc.B2iVidua.js), [IPPure geolocation module](https://ippure.com/assets/chunks/useFastIPInfo.BWfKblf_.js)
- [WebRTC IP handling](https://www.rfc-editor.org/rfc/rfc8828.html), [local-candidate statistics](https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidateStats)
- [Teredo address encoding](https://www.rfc-editor.org/rfc/rfc4380.html#section-4), [6to4 encoding](https://www.rfc-editor.org/rfc/rfc3056.html#section-2)
- [HTTP protocol timing](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/nextHopProtocol), [WebTransport](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport)
- [Country.is](https://country.is/), [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
