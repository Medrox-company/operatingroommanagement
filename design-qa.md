**Design QA — dashboard room cards**

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-03 v 20.20.13.png`
- Source pixels: 688 × 680; desktop dashboard-card reference crop; density unknown.
- Implementation: `http://localhost:3000/`, `components/RoomCard.tsx`.
- Intended viewport: responsive desktop, `md` and wider.
- State: dashboard room grid with live room data.
- Implementation screenshot: unavailable — the in-app preview opens at the authenticated application login and the dashboard state cannot be reached without the user's role password.

**Full-view comparison evidence**

- The source reference is available and shows a continuous upper-right S-curve: the top edge descends beneath the overlapping controls, forms a short shoulder, and curves again into the right wall. It is not a circular subtraction.
- A same-state browser capture of the implementation is not available, so a truthful visual comparison cannot be completed.

**Focused region comparison evidence**

- Blocked for the same reason: the operating-room card grid is behind authentication.

**Findings**

- [P2] Rendered fidelity cannot yet be verified.
  Location: Dashboard → operating-room cards.
  Evidence: source image is available; browser-rendered target state is not.
  Impact: typography, spacing, clipping, and responsive density cannot be judged from source code alone.
  Fix: open an authenticated dashboard state and capture desktop plus narrow-tablet views.

**Implementation checks completed**

- The earlier freehand Bézier and coarse polygon were removed. The card now follows the supplied 980 × 750 construction: an r=76 convex arc joins an r=78 concave arc tangentially at (682, 76), the lower shoulder starts at (760, 154), and the detail control is centered at (760, 76).
- The curve uses container-width units, so its circular arcs do not deform into ellipses when the responsive dashboard card is taller than the source aspect ratio. The browser reports support for both `cqw` and `clip-path: polygon(...cqw...)`.
- Production Next.js build and TypeScript passed.
- `21st review` reported 0 errors and 0 warnings.
- Existing room selection, emergency, lock, personnel, schedule, and completed-cycle behavior remains connected.
- Keyboard activation and visible focus were added to the desktop card shell.

**Comparison history**

- Pass 1: blocked before visual comparison because the local browser state is unauthenticated. No visual mismatch claims were made.
- Pass 2: mathematical geometry and browser feature support verified; same-state rendered comparison remains blocked by authentication.
- Pass 3: the user-provided implementation capture exposed missing border segments along the clipped perimeter. The native rectangular border was replaced by a full-shape outline layer plus an identically clipped one-pixel inset fill; production build passed. A post-fix authenticated capture is still required for final visual sign-off.
- Pass 4: the opaque inset-fill approach was rejected because it removed the dashboard's original transparency. The transparent surface is restored and its full alpha silhouette now receives the outline; the room number moved from the title row into a second upper-right circle and room names no longer truncate.
- Pass 5: the reference requires a nearly transparent one-pixel perimeter, a slightly brighter hover surface, and a larger centered completed-cycle indicator. The idle stroke was reduced to 10% opacity, hover uses a 2.4% white surface tint, and the central ring, arc, number, and caption spacing were resized to match the supplied crop. Production build and TypeScript passed; authenticated post-fix capture remains blocked.

**Implementation checklist**

- Capture authenticated desktop dashboard at the same interaction state.
- Check card title truncation at four-, five-, and six-column layouts.
- Verify hover, keyboard focus, emergency, locked, paused, and notification states.
- Capture a narrow desktop/tablet breakpoint and confirm no control overlap.

**Follow-up polish**

- Tune the corner-circle scale and schedule capsule height only after same-state visual evidence is available.

final result: blocked
