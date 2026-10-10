# IP Observatory

A buildless, browser-only network observation page for **https://shachen-midas.github.io/**.

## Automatic coverage

Version `20261010-6` runs **53 jobs** on every visit or full refresh. These are endpoint/configuration combinations, including several request contexts and connectivity-only checks.

| Group | Jobs | What is observed |
| --- | ---: | --- |
| HTTPS Fetch | 19 | ipify, icanhazip, Cloudflare hostname/literal IPv4/literal IPv6, Amazon, HTTPBingo/HTTPBin, ZXINC, IP.SB, NetOkay, and Cloudflare ports 8443/2087. |
| WebRTC / ICE | 20 | Host interfaces; Google, Cloudflare, Bilibili, HiTV and MiWiFi STUN; an IPPure comparison; explicit IPv4/IPv6 targets; receive-only media; Open Relay TURN over UDP, TCP and TLS. |
| DNS / ECS | 2 | A fresh IP-API random hostname and a bash.ws session with four names, triggered through Fetch, an image and a DNS-prefetch hint. |
| XMLHttpRequest | 2 | ipify dual stack and ZXINC, separately from Fetch. |
| Script / iframe | 3 | ipify IPv4, IPv6 and dual stack using JSONP inside an opaque-origin sandbox. |
| Dedicated Worker | 2 | ipify and Cloudflare requests from a worker. |
| Service Worker | 1 | Two fixed endpoints from a temporary worker scoped to `/workers/`. |
| WebSocket | 2 | Small challenge echoes over WSS at WebSocket.org and NetOkay. These services do not return the client IP. |
| WebTransport | 2 | Small QUIC datagram echoes at Semantic Echo on ports 443 and 4438. These services do not return the client IP. |

The user selected existing public services only: no paid resources, new hosting accounts, backend deployment, or private API credentials.

Every observed connection address stays visible with its country flag and all sources. DNS resolvers, ECS hints, TURN relays and IPv6-derived IPv4 hints appear in a separate visible section. Copy includes every distinct address; export retains its role and evidence. Unsupported APIs, unavailable paths, partial ICE results, and successful echoes without an IP have different states.

### HTTP protocol evidence

Cloudflare trace `http=`, NetOkay `http_protocol`, and available Resource Timing `nextHopProtocol` fields are retained. Only an actual `h3` observation is labeled HTTP/3. Ordinary Fetch does not force HTTP/3 and a missing protocol field does not imply that it was unused. The WebTransport probes require unreliable transport and verify one small datagram echo; they never perform a bandwidth test.

### DNS evidence

IP-API's DNS API receives a fresh 32-character random hostname. `dns.ip` is a recursive resolver address. `edns.ip` is retained as an ECS network hint with an unknown prefix length: this API does not supply a mask, so the page does not invent `/24`, `/56`, or a complete client IP.

bash.ws supplies a fresh ID through `/id`; four new subdomains trigger resolution and the corresponding JSON endpoint returns observations. Only records explicitly typed `dns` or `ip` are consumed. A resolver is never compared against HTTP as an extra client exit. DNS-prefetch is a browser hint and may be ignored. TLS failure on a trigger can still follow a successful DNS lookup; the result comes from the DNS observer, not from image load success.

The IP-API documentation describes HTTP and offers SSL in its paid product. Its publicly accessible DNS HTTPS endpoint returned JSON with CORS during integration research; this is not a contracted availability guarantee. This page uses HTTPS only and does not fall back to insecure requests.

### ICE and TURN evidence

ICE candidate events, relatedAddress/raddr, final local SDP, ICE transport local candidates and getStats local-candidate records are collected independently. Remote candidates and STUN service DNS answers are never visitor observations. Receive-only audio/video transceivers do not request or capture a microphone or camera.

The IPPure comparison preserves its public Bilibili, HiTV, MiWiFi, Cloudflare and Google server ordering. Its three-second gathering timer starts final candidate/statistics readout, which may take up to one more second. New ICE events stop being accepted at that point. Other configurations use ten-second gathering timers. The three domestic STUN hosts also have independent probes, including explicit family targets where supported.

Open Relay's `staticauth.openrelay.metered.ca` uses the provider's intentionally published demonstration shared secret, `openrelayprojectsecret`. Web Crypto generates ten-minute HMAC credentials in memory. This is public service configuration, not the GitHub owner's credential or a private account key. The generated username and credential are excluded from exports. Allocations are closed after gathering; no peer media or relay traffic is sent. A TURN probe requires a relay candidate to claim allocation; other candidates alone are marked partial. Relay server addresses are kept separate from client/related addresses. Availability can vary; the public static-auth endpoint was not reachable over TLS from the implementation environment during endpoint research.

IPv4-mapped IPv6, 6to4 and Teredo encodings are also examined locally. A 6to4 gateway IPv4 or Teredo client mapped IPv4 is shown as a derived hint with its parent IPv6, never as a separately observed connection. The Teredo server field is not extracted as a client address. No prefixes are guessed for arbitrary IPv6 addresses.

### Request contexts and lifecycle

Third-party JSONP executes only inside a sandbox with `allow-scripts` and no same-origin permission. Its CSP permits the fixed IP providers; it cannot read the parent page. The parent checks the exact frame window, opaque origin, per-probe nonce and asset version before accepting a result. The script request is anonymous.

Dedicated workers are terminated after their result or deadline. The Service Worker has a separate `/workers/` scope, no fetch handler, no caches, and no control over the main page. Its existing scope is checked before registration to avoid replacing an unrelated worker. The registration is removed on completion or cancellation; pagehide aborts active work. Registration cleanup is best effort if a browser terminates a page before a pending registration resolves. No visitor observations are persisted by the worker.

HTTP and ICE queues each allow at most four active jobs, and other probes at most two. Country lookups have a separate three-request limit. HTTP deadlines are nine seconds; explicit STUN DNS resolution is bounded to five seconds, ICE gathering to ten seconds (three for the comparison), and final stats to one second. Extended jobs have a fifteen-second deadline; worker network requests use seven seconds. Stopping a run cancels queued/active work and keeps the results already obtained. Every job has a terminal state.

## Address interpretation and privacy

Country flags are approximate IP database assignments, not a person's location. Countries come from country.is, not from the name of a STUN provider. Unknown countries use a globe, local/shared/documentation addresses a house, and unspecified placeholders a neutral marker. Public observed and derived addresses are sent to country.is; local/shared/documentation addresses are not. Country lookup failure never removes an address.

The application has no visitor database, analytics, cookies, localStorage, IndexedDB, or CacheStorage. Observations and temporary session identifiers stay in page memory; an export is created only on the visitor's request. Public services see their own connections or DNS queries and may retain records. GitHub and provider platform logs are outside this application's storage. No request sends one provider the other providers' observations, except that public addresses are sent to country.is for flags.

Origin/forwarding chains remain explicitly unverified: upstream services or proxies can populate headers. IP-literal requests still follow the browser's effective routing configuration. Extra-exit comparison uses the same address family and excludes resolvers, ECS networks, relay servers and derived hints.

### Remaining coverage boundaries

- WSS and WebTransport currently provide genuine protocol reachability, with **no IP returned**. A public service that deliberately reflects the transport peer is required to add those IP observations; an ordinary echo cannot supply them.
- Generic LAN/router enumeration is not implemented. Reading a device's WAN address requires that device's supported interface and browser local-network/CORS permissions.
- Direct Sockets belongs to installed Isolated Web Apps, not this ordinary page. There are no browser extensions, native helpers, device capture requests, geolocation prompts or browser-exploit paths.
- This app cannot inspect GitHub's own request logs. It uses public reflection services instead.

## Files and maintenance

Publish only these files:

- `index.html`, `app.js`, `probes.js`, `style.css`, `favicon.svg`
- `resource-probe.html`, `resource-probe.js`, `workers/network.js`
- `.nojekyll`, `.gitignore`, `README.md`

No build or package installation is required. The canonical syntax check is:

```sh
node --check app.js
node --check probes.js
node --check resource-probe.js
node --check workers/network.js
```

Keep asset versions in the HTML, main script, probe module, sandbox response and worker response consistent. Query strings version all scripts/styles/worker registrations. A main HTML/module/script mismatch presents a reload action instead of starting incompatible code. The iframe CSP explicitly includes this site's public script URL because sandboxed origins may not match `self`; update it when forking to another origin.

JSON export is schema version 2. Existing `addresses` and `results` arrays remain; address `group`, evidence roles, protocol, source ID and asset version make the additional observations distinguishable. Consumers must not treat every address as a visitor exit.

## Deployment and recovery

Target: `shachen-midas/shachen-midas.github.io`; user site `https://shachen-midas.github.io/`; Pages serves `master` at `/`. The pre-expansion recovery source is commit `8558e90b9b870d902989b7264f46b6656eb03ed9`. To undo this expansion, revert its commit and push to the same branch. Do not reset or force-push unrelated changes.

Never commit credentials, machine settings, visitor reports, actual IP captures or account secrets. Public provider configuration facts and the documented Open Relay demo value are the only authentication-related material in source.

## Primary references

- [IP-API DNS API](https://ip-api.com/docs/dns), [bash.ws official client](https://github.com/macvk/dnsleaktest), [EDNS Client Subnet](https://www.rfc-editor.org/rfc/rfc7871.html)
- [Public WebSocket echo source](https://github.com/ably/echo.websocket.org), [NetOkay browser checks](https://netokay.net/connection-checks.js), [Semantic Echo service/source](https://github.com/jlukic/semantic-echo)
- [Open Relay public configuration](https://www.metered.ca/tools/openrelay/), [Cloudflare supported HTTPS ports](https://developers.cloudflare.com/fundamentals/reference/network-ports/)
- [IPPure WebRTC configuration](https://ippure.com/assets/chunks/webrtc.B2iVidua.js), [IPPure geolocation module](https://ippure.com/assets/chunks/useFastIPInfo.BWfKblf_.js)
- [WebRTC IP handling](https://www.rfc-editor.org/rfc/rfc8828.html), [local-candidate statistics](https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidateStats)
- [Teredo address encoding](https://www.rfc-editor.org/rfc/rfc4380.html#section-4), [6to4 encoding](https://www.rfc-editor.org/rfc/rfc3056.html#section-2)
- [HTTP protocol timing](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/nextHopProtocol), [WebTransport](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport)
- [Country.is](https://country.is/), [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
