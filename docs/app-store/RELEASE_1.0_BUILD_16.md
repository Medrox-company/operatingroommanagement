# iOS 1.0 (16) — 2026-10-19

## Upload

- App Store Connect app: `6768817906` (OPERATINGROOM).
- Bundle identifier: `operatingroom.eu`; team: `2J4JJ3SYPV`.
- Version: `1.0`; build: `16` (archive-time override; project defaults unchanged).
- Uploaded successfully through Xcode at approximately 00:35 CEST on 2026-10-19.
- Xcode reported `Upload succeeded` and `EXPORT SUCCEEDED`.
- Apple processing completed; build 16 is `Ready to Submit` (verified in App Store Connect).
- App Store Connect build ID: `fe957736-63e4-4519-8249-c4fee991d150`.
- Build 16 selected and saved for iOS version 1.0, replacing the build 5 association. Build 5 itself was not deleted.
- Not submitted for App Review and not publicly released by this upload.

## Local verification

- Dependencies restored from `package-lock.json` using `npm ci --ignore-scripts --include=optional`.
- `npm run ios:sync` succeeded with the production mobile entry point.
- `npx tsc --noEmit` passed.
- Login UI/style and mobile phase-breakdown tests passed.
- Release archive for generic iOS succeeded; deep/strict code-sign verification passed.
- Production bundle matched the copied iOS assets; no source maps, preview entry, hosted development server, or private-key files were found.
- Existing unrelated working-tree changes were preserved and included in the build.

Archive (temporary local output):
`/tmp/operatingroom-appstore-16.Lv0EYF/Operatingroom-1.0-16.xcarchive`

## Remaining before submission

- User entered App Review credentials directly in App Store Connect. Add the exact synthetic facility/role and sign-in instructions; credentials were not copied or functionally tested in this release pass.
- Actual-app screenshots from the authenticated synthetic review environment are prepared in `docs/app-store/screenshots-build-16/`: iPhone 17 Pro overview/detail (1206 × 2622) and iPad Pro 13-inch timeline (2752 × 2064). They still need to be uploaded to the required iPhone/iPad slots in App Store Connect; preview QA images are not approved release screenshots.
- Complete and owner-verify App Privacy: the current form contains unfinished data-type sections and declarations that require verification.
- Confirm current legal/regulatory, distribution, copyright and release settings with the owner before submitting.

Do not infer completion of these items from the historical draft metadata file.
