# IP Observatory

A buildless, browser-only network observation page for **https://shachen-midas.github.io/**.

## Features

- 14 HTTPS channels: ipify and icanhazip address-family endpoints, Cloudflare hostname/literal IPv4/literal IPv6 trace, Amazon CheckIP, and HTTPBingo/HTTPBin origin and forwarded-header observations.
- 9 automatic WebRTC configurations: host-only, Google and Cloudflare hostname STUN, Cloudflare UDP 53, explicit IPv4/IPv6 targets for both providers, and a receive-only audio/video offer. No camera or microphone permissions or capture.
- All observed addresses shown equally at the top, deduplicated with every source preserved. ICE events, relatedAddress/raddr, final local SDP, ICE transport local candidates, and getStats local-candidate records are included. Remote candidates and STUN server DNS answers are never counted as visitor addresses.
- Per-address country flags via country.is, with explicit unknown and local/shared address labels.
- Source-level results, elapsed time, independent error states, copy all addresses, and local JSON export including country and provenance.
- Chinese interface, responsive layout, keyboard controls, and reduced-motion support.

## Accuracy and privacy

The page displays addresses observed on particular network paths. It cannot guarantee discovery of an original address behind a VPN, proxy, NAT, or browser privacy protections. Different addresses do not prove a VPN leak. Failed IPv6 checks do not prove the device lacks IPv6 support. Local/shared ICE addresses are labeled separately from public candidates; mDNS names are not presented as IPs.

Every page load and refresh automatically runs HTTPS and STUN checks in parallel. Country flags represent approximate IP database country/region assignments, not the visitor’s nationality or actual location. Unknown countries use 🌐; local/shared/reserved addresses use 🏠 and unspecified placeholder addresses use ⚪.

The application has no backend, analytics, cookies, or persistent visitor storage. Public observed IPs are sent to `https://api.country.is/{ip}` for country lookup; local/shared addresses are not sent. Country results are cached only in page memory, with at most three concurrent requests and a six-second timeout. Each HTTP and WebRTC queue runs at most four probes at once. Country lookup failure does not remove an observed IP. Failed lookups retry on a new full scan. External IP and STUN services necessarily see connection metadata; these services and GitHub may maintain their own logs. Reports are generated only on visitor request and downloaded to that visitor's device. Browser JavaScript and page assets are public even when the source repository is private.

## Maintain

Edit `index.html`, `style.css`, or `app.js`, then push to `master`. GitHub Pages publishes from `master` at `/`; `.nojekyll` disables Jekyll processing. No build, package installation, API key, or paid external service is required by this application. Private repository Pages availability depends on the GitHub account plan.

For each deployment that changes JavaScript, CSS, or their HTML contract, update `ASSET_VERSION` in `app.js` and the matching `data-asset-version`, script query, and stylesheet query in `index.html` together. Pages caches assets for up to ten minutes; versioned resource URLs prevent a fresh page from reusing an older script. A mismatched HTML/script version stops with a reload action instead of leaving an endless loading state. The reload action bypasses the cached HTML URL as well.

Check JavaScript syntax with `node --check app.js`. Preview using `python3 -m http.server 8000` from this directory. Open `http://localhost:8000` in a modern browser. Verify ordinary success, source failure, unavailable IPv6, repeated detection, automatic WebRTC, related addresses, country success/failure, copy all, export, and a narrow viewport. HTTP timeouts are 9 seconds; ICE gathering is limited to 10 seconds. External services may be blocked or unavailable and are not guaranteed.

Only website source and this documentation belong in the repository. Do not commit credentials, machine configuration, visitor reports, real diagnostic captures, or deployment account secrets.

## Deployment and recovery

Target: `shachen-midas/shachen-midas.github.io`, user site `https://shachen-midas.github.io/`. The target repository did not exist before this project. GitHub Pages uses the root of the `master` branch. To roll back a later edit, revert its commit and push; to stop serving the site, disable Pages in repository settings. Repository visibility does not make the published website private.

## References

- [GitHub Pages and supported account plans](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [ipify endpoint documentation](https://www.ipify.org/)
- [WebRTC ICE candidate addresses](https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidate/address)
- [Cloudflare STUN service](https://developers.cloudflare.com/realtime/turn/)

- [Country.is API and IPv4/IPv6 country lookup](https://country.is/)
- [WebRTC relatedAddress](https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidate/relatedAddress)

## Detection coverage

| Path | Implemented behavior | Evidence interpretation |
| --- | --- | --- |
| HTTPS hostnames, IPv4, IPv6 | 8 normal/family-specific channels | The service observes the connection reaching it. |
| HTTPS literal IPv4/IPv6 | 4 Cloudflare trace destinations | May follow different PAC or split-routing rules; labeled IP-direct, not asserted to bypass a proxy. |
| Origin and forwarding chains | 2 public echo services | Header-derived addresses remain explicitly unverified; proxies and upstream services can add them. |
| WebRTC UDP | Google 19302; Cloudflare 3478 and 53 | Separately captures host, server-reflexive and related addresses. |
| Explicit STUN address families | Live A/AAAA lookups for Google and Cloudflare through Google DNS | DNS answers configure only the service destination, not visitor results. |
| Browser address surfaces | ICE events, SDP, ICE transports, getStats, receive-only offer | Only local-candidate stats are collected. One-second stats deadline and ten-second gathering deadline. |
| DNS resolver / ECS observation | Requires an authoritative DNS collector and correlation endpoint | Resolver IPs and ECS prefixes are different evidence from the client's exact IP. Not supplied by ordinary DoH queries. |
| TURN TCP/TLS | Requires an authenticated TURN endpoint and short-lived credentials | Relay addresses identify the relay; related or server-observed client addresses must be classified separately. |
| HTTP/WebSocket/WebTransport collector | Requires a public backend | Observes the transport peer and any forwarded headers; headers need a defined trust boundary. |
| Permission-gated browser interfaces | No device capture requested | Browser consent can affect available interfaces; the page does not acquire camera, microphone, or location data. |

The page highlights additional direct-IP/STUN addresses only when they differ from ordinary HTTPS observations **within the same address family**. It retains all raw observed IP records and provenance rather than declaring one to be the original address. A TLS-valid literal destination still uses the browser's effective proxy/routing configuration.

The CSP allows HTTPS connections because IPv6 literal hosts are not uniformly supported in CSP host-source syntax. Application request destinations remain fixed in the source; STUN target lookups accept only public IP records for the two configured service names. No arbitrary visitor-provided URLs are fetched.

Public service availability varies. UDP 53 binding support was checked during implementation but is not listed as a guaranteed endpoint in the current provider port table. No TURN credentials or paid service account are embedded.

- [WebRTC IP handling modes](https://www.rfc-editor.org/rfc/rfc8828.html)
- [WebRTC local-candidate stats](https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidateStats)
- [Cloudflare service ports](https://developers.cloudflare.com/realtime/turn/)
