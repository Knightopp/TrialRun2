# Custom Fonts Directory

Drop your downloaded font files here (.woff2, .woff, .ttf, .otf).

Then update `src/config/fonts.ts` to use them.

## Example

If you download "Clash Display" from fontshare.com:

1. Put files here:
   - `ClashDisplay-Regular.woff2`
   - `ClashDisplay-Medium.woff2`
   - `ClashDisplay-Bold.woff2`

2. Update `src/config/fonts.ts`:
   ```ts
   import localFont from "next/font/local";

   export const displayFont = localFont({
     src: [
       { path: "../../../public/fonts/ClashDisplay-Regular.woff2", weight: "400" },
       { path: "../../../public/fonts/ClashDisplay-Medium.woff2", weight: "500" },
       { path: "../../../public/fonts/ClashDisplay-Bold.woff2", weight: "700" },
     ],
     variable: "--font-display",
     display: "swap",
   });
   ```

3. Done! The entire site updates.
