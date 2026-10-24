# Three.js runtime for Operativity Planning

This directory vendors the **classic** Three.js 0.128.0 (revision 128) runtime and
the matching postprocessing helpers expected by the upstream planner's original
3D operating-room view. No new npm package dependency is introduced.

Source: the official [`three@0.128.0` npm archive](https://registry.npmjs.org/three/-/three-0.128.0.tgz),
corresponding to [the upstream r128 tree](https://github.com/mrdoob/three.js/tree/r128).
`three-r128-manifest.json` records the archive checksum, selected source paths and
their checksums, concatenation order, runtime size, and resulting checksum.
`three-r128-LICENSE.txt` preserves the unmodified upstream MIT license.

`three-r128-runtime.txt` is a mechanical concatenation of those exact source files,
with file-boundary comments and semicolons only. `Pass.js` precedes derived passes;
`CopyShader` and `ShaderPass` precede `EffectComposer`; `LuminosityHighPassShader`
precedes `UnrealBloomPass`.

The `.txt` file is intentionally served as inert data. The authenticated host
fetches and verifies its pinned SHA-256 before embedding the text into the
opaque-origin planning frame. The frame itself does not gain network access or
same-origin access. The runtime must not be loaded from a CDN or fetched by the
iframe.

The package's version is intentionally pinned for compatibility with the original
planner, not a recommendation for the host application's 3D library version.
When updating it, update the manifest, validation constant, and tests together;
verify the original 3D controls and the WebGL fallback in the browser.
