# IP Observatory

A buildless, browser-only network observation page for **https://shachen-midas.github.io/**.

## Features

- Parallel HTTPS checks through ipify IPv4, IPv6 and dual-stack endpoints, Cloudflare trace, and icanhazip.
- Automatic WebRTC checks through Google and Cloudflare STUN servers. No camera or microphone permissions.
- All observed addresses shown equally at the top, deduplicated with every source preserved. ICE candidate addresses, relatedAddress/raddr, and final local SDP candidates are included.
- Per-address country flags via country.is, with explicit unknown and local/shared address labels.
- Source-level results, elapsed time, independent error states, copy all addresses, and local JSON export including country and provenance.
- Chinese interface, responsive layout, keyboard controls, and reduced-motion support.

## Accuracy and privacy

The page displays addresses observed on particular network paths. It cannot guarantee discovery of an original address behind a VPN, proxy, NAT, or browser privacy protections. Different addresses do not prove a VPN leak. Failed IPv6 checks do not prove the device lacks IPv6 support. Local/shared ICE addresses are labeled separately from public candidates; mDNS names are not presented as IPs.

Every page load and refresh automatically runs HTTPS and STUN checks in parallel. Country flags represent approximate IP database country/region assignments, not the visitor’s nationality or actual location. Unknown countries use 🌐; local/shared/reserved addresses use 🏠 and unspecified placeholder addresses use ⚪.

The application has no backend, analytics, cookies, or persistent visitor storage. Public observed IPs are sent to `https://api.country.is/{ip}` for country lookup; local/shared addresses are not sent. Country results are cached only in page memory, with at most three concurrent requests and a six-second timeout. Country lookup failure does not remove an observed IP. Failed lookups retry on a new full scan. External IP and STUN services necessarily see connection metadata; these services and GitHub may maintain their own logs. Reports are generated only on visitor request and downloaded to that visitor's device. Browser JavaScript and page assets are public even when the source repository is private.

## Maintain

Edit `index.html`, `style.css`, or `app.js`, then push to `master`. GitHub Pages publishes from `master` at `/`; `.nojekyll` disables Jekyll processing. No build, package installation, API key, or paid external service is required by this application. Private repository Pages availability depends on the GitHub account plan.

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
