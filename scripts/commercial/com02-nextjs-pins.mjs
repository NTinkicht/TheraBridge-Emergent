// COM-02: single exact-version pin set for the signed Next.js evidence chain.
// Changing any value here is a deliberate evidence re-baseline that must be
// reviewed with the dependency change that caused it. These are identity pins
// only; they never grant license, commercial, SaaS or clinical approval.
export const NEXTJS_VERSION='16.4.6';
export const NEXTJS_SOURCE_REF='refs/tags/v16.4.6';
// Exact unresolved exception versions in the frozen upstream candidate register.
export const COM02_UNRESOLVED_VERSIONS=44;
// Exact DefinitelyTyped (@types/*) versions inside that population. Schema ids
// such as 'therabridge-com02-definitelytyped-26-pinned-triage-v1' are stable
// identifiers, not counts (26 before React 19 types; 25 with them; 21 since
// Node 24 / NestJS 12 / Jest 30).
export const DEFINITELYTYPED_VERSIONS=21;
// Signed Next.js packages handled by the Next.js corroboration/inventory chain.
export const NEXTJS_TARGETS=Object.freeze({
 ['@next/env@'+NEXTJS_VERSION]:Object.freeze({path:'packages/next-env/package.json',sourceName:'@next/env'}),
 ['@next/swc-linux-x64-gnu@'+NEXTJS_VERSION]:Object.freeze({path:'packages/next-swc/package.json',sourceName:'@next/swc'}),
 ['@next/swc-linux-x64-musl@'+NEXTJS_VERSION]:Object.freeze({path:'packages/next-swc/package.json',sourceName:'@next/swc'})
});
// Other exact packages that advertise npm Sigstore attestations but are NOT
// Next.js sources. They must be present and verified exactly, then stay
// UNRESOLVED outside this chain: LGPL-3.0-or-later libvips binaries pulled by
// Next.js's optional `sharp` (stripped from release images), and Jest 30's
// resolver tooling (@pkgr/core, unrs-resolver native bindings; dev/CI only).
export const OUT_OF_SCOPE_SIGNED=Object.freeze([
 '@img/sharp-libvips-linux-x64@1.3.4',
 '@img/sharp-libvips-linuxmusl-x64@1.3.4',
 '@pkgr/core@0.3.6',
 '@unrs/resolver-binding-linux-x64-gnu@1.13.0',
 '@unrs/resolver-binding-linux-x64-musl@1.13.0'
]);
export const NEXTJS_SIGNED_COUNT=Object.keys(NEXTJS_TARGETS).length;
export const ALL_SIGNED_COUNT=NEXTJS_SIGNED_COUNT+OUT_OF_SCOPE_SIGNED.length;
export const REMAINING_WITHOUT_SIGSTORE=COM02_UNRESOLVED_VERSIONS-ALL_SIGNED_COUNT;
