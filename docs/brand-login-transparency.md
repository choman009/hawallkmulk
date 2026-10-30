# Login logo transparency

Only the large `.auth-office-logo` image uses the transparent version. Shared brand marks, browser icons, Apple icons and Android icons retain their existing assets/backgrounds.

Tool: built-in `image_gen` edit mode, `transparent_background: true`.

Input: `public/brand/logo-lockup.png`.
Saved output: `public/brand/logo-login-transparent.png`.

Prompt:

> Use case: background-extraction. Edit target: the supplied existing flat gold HAWALL MULK office logo. Remove ONLY the white background, including every white negative-space area inside and between the gold building shapes and around the lettering. Output a PNG with genuine alpha transparency. Preserve the exact existing gold symbol geometry, arrangement, proportions, color, and the exact lettering 'HAWALL MULK'. Do not redraw, reinterpret, add shadows, gradients, borders, mockups or any new elements. Keep the original full lockup composition and aspect ratio; preserve all gold pixels and clean antialiased edges. The result will overlay a pale green or dark website background. All white must become fully transparent, not a painted checkerboard.

Verification: PNG alpha present; production build passed; browser inspected in light/dark themes. Hero source is the new transparent PNG; shared brand mark remains `/brand/logo-mark.png`.
