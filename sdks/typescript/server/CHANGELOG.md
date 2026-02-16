# [6.1.0](https://github.com/MCP-UI-Org/mcp-ui/compare/server/v6.0.1...server/v6.1.0) (2026-02-13)


### Features

* support experimental messages ([#176](https://github.com/MCP-UI-Org/mcp-ui/issues/176)) ([327e4d9](https://github.com/MCP-UI-Org/mcp-ui/commit/327e4d9e6771eceb42f8823ae864e6758f371970))

## [6.0.1](https://github.com/MCP-UI-Org/mcp-ui/compare/server/v6.0.0...server/v6.0.1) (2026-02-06)


### Bug Fixes

* trigger MCP Apps client release ([#173](https://github.com/MCP-UI-Org/mcp-ui/issues/173)) ([b0c0659](https://github.com/MCP-UI-Org/mcp-ui/commit/b0c0659700b493a0083d0de12958f276e4c37715))

# [6.0.0](https://github.com/MCP-UI-Org/mcp-ui/compare/server/v5.17.0...server/v6.0.0) (2026-01-26)


### Features

* mcp-ui -> mcp apps! ([#172](https://github.com/MCP-UI-Org/mcp-ui/issues/172)) ([93a6e22](https://github.com/MCP-UI-Org/mcp-ui/commit/93a6e225808894cac3206504cf15c481f88ed540))


### BREAKING CHANGES

* removed discarded content types, changed mimetype, updated docs, etc.

# [5.17.0](https://github.com/MCP-UI-Org/mcp-ui/compare/server/v5.16.3...server/v5.17.0) (2026-01-25)


### Bug Fixes

* add connectedMoveCallback to the WC implementation ([#170](https://github.com/MCP-UI-Org/mcp-ui/issues/170)) ([5ac4734](https://github.com/MCP-UI-Org/mcp-ui/commit/5ac4734078ff56e213e7a57029fd612638abb0b4))


### Features

* React renderer for MCP Apps ([#147](https://github.com/MCP-UI-Org/mcp-ui/issues/147)) ([fbc918d](https://github.com/MCP-UI-Org/mcp-ui/commit/fbc918d713861396703ede124c5676cf3d1164dd))

## [5.16.3](https://github.com/MCP-UI-Org/mcp-ui/compare/server/v5.16.2...server/v5.16.3) (2025-12-18)


### Bug Fixes

* **client:** use type-only imports for @modelcontextprotocol/sdk types ([#157](https://github.com/MCP-UI-Org/mcp-ui/issues/157)) ([d84cb3e](https://github.com/MCP-UI-Org/mcp-ui/commit/d84cb3e217dfa90f038a8fbe64b4ffd0e0a1bc3f))
* trigger TS release ([e28d1f6](https://github.com/MCP-UI-Org/mcp-ui/commit/e28d1f65cd5f26e46801480995e178ee50c31e51))
* update adapter to latest MCP Apps spec ([#163](https://github.com/MCP-UI-Org/mcp-ui/issues/163)) ([e342034](https://github.com/MCP-UI-Org/mcp-ui/commit/e3420348098fe716f45b2182bc8c8d3358714035))
* update MCP Apps adapter mimetype ([#162](https://github.com/MCP-UI-Org/mcp-ui/issues/162)) ([c91e533](https://github.com/MCP-UI-Org/mcp-ui/commit/c91e5331b68c65de2347b16766a5711e05985e68))
* update ui/message to pass an array ([#167](https://github.com/MCP-UI-Org/mcp-ui/issues/167)) ([80cf222](https://github.com/MCP-UI-Org/mcp-ui/commit/80cf22290ff5e2f981be839f74705454483c21b5))

## [5.16.2](https://github.com/MCP-UI-Org/mcp-ui/compare/server/v5.16.1...server/v5.16.2) (2025-12-08)


### Bug Fixes

* revert externalUrl adapter for compatibility ([#159](https://github.com/MCP-UI-Org/mcp-ui/issues/159)) ([3c5289a](https://github.com/MCP-UI-Org/mcp-ui/commit/3c5289a5e59812f556bc2bb9e67c3ce2e3ce764e))

## [5.16.1](https://github.com/MCP-UI-Org/mcp-ui/compare/server/v5.16.0...server/v5.16.1) (2025-12-01)


### Bug Fixes

* use document.write in proxy sandbox ([#156](https://github.com/MCP-UI-Org/mcp-ui/issues/156)) ([447f582](https://github.com/MCP-UI-Org/mcp-ui/commit/447f582105a0889ee47d912925d7f02034fc39a9))

# [5.16.0](https://github.com/MCP-UI-Org/mcp-ui/compare/server/v5.15.0...server/v5.16.0) (2025-11-30)


### Features

* externalUrl adapter ([5a1e4de](https://github.com/MCP-UI-Org/mcp-ui/commit/5a1e4deeeda9ae0120d17b5abdf9096edf52054f))

# [5.15.0](https://github.com/MCP-UI-Org/mcp-ui/compare/server/v5.14.0...server/v5.15.0) (2025-11-29)


### Features

* add MCP Apps adapter ([#154](https://github.com/MCP-UI-Org/mcp-ui/issues/154)) ([986fd63](https://github.com/MCP-UI-Org/mcp-ui/commit/986fd634448637aa6488a18ad80ee9cd6b8de318))

# [5.14.0](https://github.com/MCP-UI-Org/mcp-ui/compare/server/v5.13.1...server/v5.14.0) (2025-11-29)


### Features

* support metadata in Python SDK ([#134](https://github.com/MCP-UI-Org/mcp-ui/issues/134)) ([9bc3c64](https://github.com/MCP-UI-Org/mcp-ui/commit/9bc3c646c2638e16ac62edf9faca2dbee2b8cb7e))

## [5.13.1](https://github.com/idosal/mcp-ui/compare/server/v5.13.0...server/v5.13.1) (2025-10-25)


### Bug Fixes

* Enable bidirectional message relay in rawhtml proxy mode ([#138](https://github.com/idosal/mcp-ui/issues/138)) ([f0bdefb](https://github.com/idosal/mcp-ui/commit/f0bdefb818aca5a3bfbdfe28fc4fe057b1818cb5))
* ensure Apps SDK adapter is bundled properly and initialized wth config ([#137](https://github.com/idosal/mcp-ui/issues/137)) ([4f7c25c](https://github.com/idosal/mcp-ui/commit/4f7c25ce7e6f25e36cfc188016b012d31d722204))

# [5.13.0](https://github.com/idosal/mcp-ui/compare/server/v5.12.0...server/v5.13.0) (2025-10-22)


### Bug Fixes

* fix file extension reference in package.json ([927989c](https://github.com/idosal/mcp-ui/commit/927989c4f81742106b6f5e2f68343fb7ea7d016a))


### Features

* support proxy for rawHtml ([#132](https://github.com/idosal/mcp-ui/issues/132)) ([1bbeb09](https://github.com/idosal/mcp-ui/commit/1bbeb093bc9c389f4ccfd9e8df06dc7f1eaadde0))

# [5.12.0](https://github.com/idosal/mcp-ui/compare/server/v5.11.0...server/v5.12.0) (2025-10-13)


### Bug Fixes

* update isUIResource to use EmbeddedResource type ([#122](https://github.com/idosal/mcp-ui/issues/122)) ([5a65a0b](https://github.com/idosal/mcp-ui/commit/5a65a0b1ba63e6cfda26b8da41239a532f00d60a)), closes [#117](https://github.com/idosal/mcp-ui/issues/117)


### Features

* add ui-request-render-data message type ([#111](https://github.com/idosal/mcp-ui/issues/111)) ([26135ce](https://github.com/idosal/mcp-ui/commit/26135ce2c7f7d586b0b81a03623cd77dc1bc7f90))
* support adapters ([#127](https://github.com/idosal/mcp-ui/issues/127)) ([d4bd152](https://github.com/idosal/mcp-ui/commit/d4bd152db0a1bd27081502098f3cd9aa54ca359e))

# [5.12.0-alpha.6](https://github.com/idosal/mcp-ui/compare/server/v5.12.0-alpha.5...server/v5.12.0-alpha.6) (2025-10-13)


### Bug Fixes

* separate adapter wrappers for flexibility ([#128](https://github.com/idosal/mcp-ui/issues/128)) ([a636844](https://github.com/idosal/mcp-ui/commit/a6368448c44b15da87c883cb3a65ebfe6119e85d))

# [5.12.0-alpha.5](https://github.com/idosal/mcp-ui/compare/server/v5.12.0-alpha.4...server/v5.12.0-alpha.5) (2025-10-12)


### Bug Fixes

* exports vite ([4de2b0c](https://github.com/idosal/mcp-ui/commit/4de2b0cfae91813ad68fb1ce68b1cf7c2a161baf))

# [5.12.0-alpha.4](https://github.com/idosal/mcp-ui/compare/server/v5.12.0-alpha.3...server/v5.12.0-alpha.4) (2025-10-11)


### Bug Fixes

* exports ([0018c17](https://github.com/idosal/mcp-ui/commit/0018c17dd8b184ee549327f1742d9da71edfd576))

# [5.12.0-alpha.3](https://github.com/idosal/mcp-ui/compare/server/v5.12.0-alpha.2...server/v5.12.0-alpha.3) (2025-10-11)


### Bug Fixes

* version ([767a245](https://github.com/idosal/mcp-ui/commit/767a245d2374f05e27ece090dc5af8613a9a6b96))

# [5.12.0-alpha.2](https://github.com/idosal/mcp-ui/compare/server/v5.12.0-alpha.1...server/v5.12.0-alpha.2) (2025-10-10)


### Bug Fixes

* set the mime type as text/html+skybridge for apps SDK ([bc47423](https://github.com/idosal/mcp-ui/commit/bc474232a249e5cc40f348e3a26f93c806fcc602))

# [5.12.0-alpha.1](https://github.com/idosal/mcp-ui/compare/server/v5.11.0...server/v5.12.0-alpha.1) (2025-10-10)


### Bug Fixes

* adapter version ([259c842](https://github.com/idosal/mcp-ui/commit/259c84247a00933575e1fff08674cce52be59973))
* release ([420efc0](https://github.com/idosal/mcp-ui/commit/420efc0a82bf8de2731514648268cad1209320e2))
* server alpha versioning ([7f35d3b](https://github.com/idosal/mcp-ui/commit/7f35d3be2cfa6a535d3fbd5f86fbec1b20432dca))
* server versioning ([2324371](https://github.com/idosal/mcp-ui/commit/2324371ed636381bb44a1feae1b59a87c84c6666))
* update isUIResource to use EmbeddedResource type ([#122](https://github.com/idosal/mcp-ui/issues/122)) ([5a65a0b](https://github.com/idosal/mcp-ui/commit/5a65a0b1ba63e6cfda26b8da41239a532f00d60a)), closes [#117](https://github.com/idosal/mcp-ui/issues/117)


### Features

* add adapters infra (appssdk) ([#125](https://github.com/idosal/mcp-ui/issues/125)) ([2e016cd](https://github.com/idosal/mcp-ui/commit/2e016cdc05d08c2f7c2e4a40efbec2b0704e7ef6))
* add ui-request-render-data message type ([#111](https://github.com/idosal/mcp-ui/issues/111)) ([26135ce](https://github.com/idosal/mcp-ui/commit/26135ce2c7f7d586b0b81a03623cd77dc1bc7f90))

# 1.0.0-alpha.1 (2025-10-10)


### Bug Fixes

* adapter version ([259c842](https://github.com/idosal/mcp-ui/commit/259c84247a00933575e1fff08674cce52be59973))
* add a bridge to pass messages in and out of the proxy ([#38](https://github.com/idosal/mcp-ui/issues/38)) ([30ccac0](https://github.com/idosal/mcp-ui/commit/30ccac0706ad8e02ebcd8960924ed1d58ddedf85))
* bump client version ([75c9236](https://github.com/idosal/mcp-ui/commit/75c923689654b4443ad1093fafc0bad16902e4cc))
* **client:** specify iframe ([fd0b70a](https://github.com/idosal/mcp-ui/commit/fd0b70a84948d3aa5d7a79269ff7c3bcd0946689))
* **client:** styling ([6ff9b68](https://github.com/idosal/mcp-ui/commit/6ff9b685fd1be770fd103943e45275e9ec86905c))
* dependencies ([887f61f](https://github.com/idosal/mcp-ui/commit/887f61f827b4585c17493d4fa2dfb251ea598587))
* export RemoteDomResource ([2b86f2d](https://github.com/idosal/mcp-ui/commit/2b86f2dd4506de49c69908e23d84a2a323170446))
* export ResourceRenderer and HtmlResource ([2b841a5](https://github.com/idosal/mcp-ui/commit/2b841a556c1111ed70ccb3d3987afd21fe7df897))
* exports ([3a93a16](https://github.com/idosal/mcp-ui/commit/3a93a16e1b7438ba7b2ef49ca854479f755abcc6))
* iframe handle ([#15](https://github.com/idosal/mcp-ui/issues/15)) ([66bd4fd](https://github.com/idosal/mcp-ui/commit/66bd4fd3d04f82e3e4557f064e701b68e1d8af11))
* lint ([4487820](https://github.com/idosal/mcp-ui/commit/44878203a71c3c9173d463b809be36769e996ba9))
* lint ([d0a91f9](https://github.com/idosal/mcp-ui/commit/d0a91f9a07ec0042690240c3d8d0bad620f8c765))
* minor typo ([a0bee9c](https://github.com/idosal/mcp-ui/commit/a0bee9c85e5ee02e021ba687940ced38220445fe))
* move react dependencies to be peer dependencies ([#91](https://github.com/idosal/mcp-ui/issues/91)) ([f672f3e](https://github.com/idosal/mcp-ui/commit/f672f3efc1c2ba2fbae16f9dcdc2142c2b4bd920)), closes [#90](https://github.com/idosal/mcp-ui/issues/90)
* package config ([8dc1e53](https://github.com/idosal/mcp-ui/commit/8dc1e5358c3c8e641206a5e6851427d360cc1955))
* packaging ([9e6babd](https://github.com/idosal/mcp-ui/commit/9e6babd3a587213452ea7aec4cc9ae3a50fa1965))
* pass ref explicitly using iframeProps ([#33](https://github.com/idosal/mcp-ui/issues/33)) ([d01b5d1](https://github.com/idosal/mcp-ui/commit/d01b5d1e4cdaedc436ba2fa8984d866d93d59087))
* publish ([0943e7a](https://github.com/idosal/mcp-ui/commit/0943e7acaf17f32aae085c2313bfbec47bc59f1f))
* ref passing to UIResourceRenderer ([#32](https://github.com/idosal/mcp-ui/issues/32)) ([d28c23f](https://github.com/idosal/mcp-ui/commit/d28c23f9b8ee320f4e361200ae02a23f0d2a1c0c))
* release ([420efc0](https://github.com/idosal/mcp-ui/commit/420efc0a82bf8de2731514648268cad1209320e2))
* remove shared dependency ([e66e8f4](https://github.com/idosal/mcp-ui/commit/e66e8f49b1ba46090db6e4682060488566f4fe41))
* rename components and methods to fit new scope ([#22](https://github.com/idosal/mcp-ui/issues/22)) ([6bab1fe](https://github.com/idosal/mcp-ui/commit/6bab1fe3a168a18e7ba4762e23478abf4e0cc84c))
* rename delivery -> encoding and flavor -> framework ([#36](https://github.com/idosal/mcp-ui/issues/36)) ([9a509ed](https://github.com/idosal/mcp-ui/commit/9a509ed80d051b0a8042b36958b401a0a7c1e138))
* Ruby comment ([b22dc2e](https://github.com/idosal/mcp-ui/commit/b22dc2e0a0db20d98ada884649ad408ebaf72d22))
* server versioning ([2324371](https://github.com/idosal/mcp-ui/commit/2324371ed636381bb44a1feae1b59a87c84c6666))
* support react-router ([21ffb95](https://github.com/idosal/mcp-ui/commit/21ffb95fe6d77a348b95b38dbf3741ba6442894e))
* text and blob support in RemoteDOM resources ([ec68eb9](https://github.com/idosal/mcp-ui/commit/ec68eb90df984da8b492cc25eafdafdeda79f299))
* trigger release ([aaca831](https://github.com/idosal/mcp-ui/commit/aaca83125c3f7825ccdebf0f04f8553e953c5249))
* typescript ci publish ([e7c0ebf](https://github.com/idosal/mcp-ui/commit/e7c0ebfa7f7b552f9763743fda659d1441f21692))
* typescript types to be compatible with MCP SDK ([#10](https://github.com/idosal/mcp-ui/issues/10)) ([74365d7](https://github.com/idosal/mcp-ui/commit/74365d7ed6422beef6cd9ee0f5a97c847bd9827b))
* update deps ([4091ef4](https://github.com/idosal/mcp-ui/commit/4091ef47da048fab3c4feb002f5287b2ff295744))
* update isUIResource to use EmbeddedResource type ([#122](https://github.com/idosal/mcp-ui/issues/122)) ([5a65a0b](https://github.com/idosal/mcp-ui/commit/5a65a0b1ba63e6cfda26b8da41239a532f00d60a)), closes [#117](https://github.com/idosal/mcp-ui/issues/117)
* use targetOrigin in the proxy message relay ([#40](https://github.com/idosal/mcp-ui/issues/40)) ([b3fb54e](https://github.com/idosal/mcp-ui/commit/b3fb54e28ca7b8eeda896b5bcf478b6343dbba47))
* validate URL ([b7c994d](https://github.com/idosal/mcp-ui/commit/b7c994dfdd947b3dfbb903fc8cb896d61004c8d8))
* wc dist overwrite ([#63](https://github.com/idosal/mcp-ui/issues/63)) ([9e46c56](https://github.com/idosal/mcp-ui/commit/9e46c56c7a8908410fad6d08a5d845139e93f80f))


### Documentation

* bump ([#4](https://github.com/idosal/mcp-ui/issues/4)) ([ad4d163](https://github.com/idosal/mcp-ui/commit/ad4d1632cc1f9c99072349a8f0cdaac343236132))


### Features

* add adapters infra (appssdk) ([#125](https://github.com/idosal/mcp-ui/issues/125)) ([2e016cd](https://github.com/idosal/mcp-ui/commit/2e016cdc05d08c2f7c2e4a40efbec2b0704e7ef6))
* add convenience function isUIResource to client SDK ([#86](https://github.com/idosal/mcp-ui/issues/86)) ([607c6ad](https://github.com/idosal/mcp-ui/commit/607c6add3567bb60c45accf3e1b25a38ed284a6f))
* add embeddedResourceProps for annotations ([#99](https://github.com/idosal/mcp-ui/issues/99)) ([b96ec44](https://github.com/idosal/mcp-ui/commit/b96ec442ec319a1944393ada0bdcccb93b7ffc62))
* add proxy option to externalUrl ([#37](https://github.com/idosal/mcp-ui/issues/37)) ([7b95cd0](https://github.com/idosal/mcp-ui/commit/7b95cd0b3873fc1cde28748ec463e81c6ff1c494))
* add remote-dom content type ([#18](https://github.com/idosal/mcp-ui/issues/18)) ([5dacf37](https://github.com/idosal/mcp-ui/commit/5dacf37c22b5ee6ae795049a8d573fc073b8a1f5))
* add Ruby server SDK ([#31](https://github.com/idosal/mcp-ui/issues/31)) ([5ffcde4](https://github.com/idosal/mcp-ui/commit/5ffcde4a373accdd063fa6c3b1b3d4df13c91b53))
* add sandbox permissions instead of an override ([#83](https://github.com/idosal/mcp-ui/issues/83)) ([b1068e9](https://github.com/idosal/mcp-ui/commit/b1068e9e87caa2b4302bf145a33efdfd1af05c1d))
* add ui-request-render-data message type ([#111](https://github.com/idosal/mcp-ui/issues/111)) ([26135ce](https://github.com/idosal/mcp-ui/commit/26135ce2c7f7d586b0b81a03623cd77dc1bc7f90))
* add UIResourceRenderer Web Component ([#58](https://github.com/idosal/mcp-ui/issues/58)) ([ec8f299](https://github.com/idosal/mcp-ui/commit/ec8f2994ecf36774e6ad5191654ba22946d0ee49))
* auto resize with the autoResizeIframe prop ([#56](https://github.com/idosal/mcp-ui/issues/56)) ([76c867a](https://github.com/idosal/mcp-ui/commit/76c867a569b72aed892290aa84e1194ab8eb79ce))
* change onGenericMcpAction to optional onUiAction ([1913b59](https://github.com/idosal/mcp-ui/commit/1913b5977c30811f9e67659949e2d961f2eda983))
* **client:** allow setting supportedContentTypes for HtmlResource ([#17](https://github.com/idosal/mcp-ui/issues/17)) ([e009ef1](https://github.com/idosal/mcp-ui/commit/e009ef10010134ba3d9893314cc4d8e1274f1f07))
* consolidate ui:// and ui-app:// ([#8](https://github.com/idosal/mcp-ui/issues/8)) ([2e08035](https://github.com/idosal/mcp-ui/commit/2e08035676bb6a46ef3c94dba916bc895f1fa3cc))
* pass iframe props down ([#14](https://github.com/idosal/mcp-ui/issues/14)) ([112539d](https://github.com/idosal/mcp-ui/commit/112539d28640a96e8375a6b416f2ba559370b312))
* refactor UTFtoB64 (bump server version) ([#95](https://github.com/idosal/mcp-ui/issues/95)) ([2d5e16b](https://github.com/idosal/mcp-ui/commit/2d5e16bf39073ee890586f458412f0c3b474c2b8))
* send render data to the iframe ([#51](https://github.com/idosal/mcp-ui/issues/51)) ([d38cfc7](https://github.com/idosal/mcp-ui/commit/d38cfc7925061c1ae1911bdee408033c8e9f283d))
* separate html and remote-dom props ([#24](https://github.com/idosal/mcp-ui/issues/24)) ([a7f0529](https://github.com/idosal/mcp-ui/commit/a7f05299dc9cc40184f9ab25c5b648ee7077be64))
* support generic messages response ([#35](https://github.com/idosal/mcp-ui/issues/35)) ([10b407b](https://github.com/idosal/mcp-ui/commit/10b407b279b3ee9608ef077445f4d714f88343c5))
* support passing resource metadata ([#87](https://github.com/idosal/mcp-ui/issues/87)) ([f1c1c9b](https://github.com/idosal/mcp-ui/commit/f1c1c9b62dd74c63045b295eb388181843ac772a))
* support ui action result types ([#6](https://github.com/idosal/mcp-ui/issues/6)) ([899d152](https://github.com/idosal/mcp-ui/commit/899d1527286a281a23fbb8f3a207d435dfc3fe96))
* switch to ResourceRenderer ([#21](https://github.com/idosal/mcp-ui/issues/21)) ([6fe3166](https://github.com/idosal/mcp-ui/commit/6fe316682675e27db914d60696754677e3783448))


### BREAKING CHANGES

* The existing naming is ambiguous. Renaming delivery to encoding and flavor to framework should clarify the intent.
* exported names have changed
* removed deprecated client API
* (previous one didn't take due to semantic-release misalignment)

# [5.11.0](https://github.com/idosal/mcp-ui/compare/v5.10.0...v5.11.0) (2025-09-16)


### Features

* add embeddedResourceProps for annotations ([#99](https://github.com/idosal/mcp-ui/issues/99)) ([b96ec44](https://github.com/idosal/mcp-ui/commit/b96ec442ec319a1944393ada0bdcccb93b7ffc62))

# [5.10.0](https://github.com/idosal/mcp-ui/compare/v5.9.0...v5.10.0) (2025-08-22)


### Features

* refactor UTFtoB64 (bump server version) ([#95](https://github.com/idosal/mcp-ui/issues/95)) ([2d5e16b](https://github.com/idosal/mcp-ui/commit/2d5e16bf39073ee890586f458412f0c3b474c2b8))
