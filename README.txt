STUDIO RAGE — PORTABLE STATIC WEBSITE
=====================================

This package is a normal static website made only with HTML, CSS, vanilla JavaScript and local media. It has no WordPress, PHP, database, framework, runtime package dependency or post-delivery build step. Extract it and open it through any local static server, standard web host or Portable Visual CMS.

QUICK START
-----------
1. Extract the ZIP. index.html must remain at the root.
2. In Portable Visual CMS, choose its normal static-site / ZIP import flow and select Studio-Rage-Portable.zip.
3. For ordinary hosting, upload every extracted file and folder without changing the structure.
4. Replace all example.com URLs, placeholder contact details and bracketed legal fields before launch.
5. Test the final deployed site, forms, iframe permissions and legal wording.

EDITING CONTENT
---------------
- Edit visible titles, paragraphs, buttons and links directly in index.html.
- Main blocks are wrapped in comments such as “CMS SECTION: HERO START/END”.
- data-cms-section, data-cms-field, data-cms-type and data-cms-repeatable attributes identify editable content.
- Visible homepage text remains in semantic HTML. Project carousel titles, metadata and galleries are stored in js/projects-data.js so every See more button can reuse one overlay without separate project pages.

REPLACING IMAGES, VIDEO AND LOGO
--------------------------------
- Replace images/1.png, images/2.png and so on with files using exactly the same names. Keeping the same aspect ratio gives the cleanest result.
- Replace videos/1.mp4, videos/2.mp4 and videos/3.mp4 with web-optimized MP4/H.264 files using the same names.
- Replace images/logo.png to update the raster logo. The visible header and loader wordmarks are editable HTML text for sharp display.
- Keep relative paths and lowercase extensions. Do not add a leading slash.

COMPLETE MEDIA REFERENCE LIST
-----------------------------
images/logo.png = Supplied/replacement Studio Rage raster wordmark; included as an editable local asset. Header and loader use HTML text for clarity.
images/1.png = Homepage hero background.
images/2.png = Vanta Objects project cover on homepage and full-width modal cover.
images/3.png = Vanta Objects portrait/editorial secondary media in project modal.
images/4.png = Redline Atelier project cover on homepage and full-width modal cover.
images/5.png = Redline Atelier product-study secondary media in project modal.
images/6.png = Signal No. 3 project cover on homepage and full-width modal cover.
images/7.png = Signal No. 3 portrait/motion-frame secondary media in project modal.
images/8.png = Aperture website-project screenshot.
images/9.png = Form / Function website-project screenshot.
images/10.png = Rare Matter website-project screenshot.
images/11.png = 3D/CGI material-study image.
images/12.png = 3D/CGI light-study image.
images/13.png = About Julie portrait placeholder.
images/14.png = Systems-in-motion secondary project media, used in Vanta Objects and Signal No. 3 modals.
videos/1.mp4 = Homepage showreel. It is browser-optimized for progressive loading and expands to full screen through the scroll-driven reel section.
videos/2.mp4 = Redline Atelier project motion placeholder in project 2 detail.
videos/3.mp4 = Signal No. 3 project motion placeholder in project 3 detail.
svg/1.svg = Abstract Studio Rage signal-field illustration; reusable optional local graphic.
svg/2.svg = Abstract wireframe illustration for 3D/CGI uses; reusable optional local graphic.
svg/3.svg = Human-approval loop illustration; reusable optional local graphic.

ADDING A VISUAL PROJECT
-----------------------
1. Duplicate one .featured-project article in index.html, or duplicate one .website-project article for a website case.
2. Give each new See more control the same data-project value, such as project-4.
3. Add a matching project-4 entry in js/projects-data.js with title, eyebrow, cover and media values.
4. Add the next sequential image/video files and document every file in this README.
The reusable overlay automatically provides scroll locking, focus return, Escape close, responsive previous/next controls, a fixed title, progression and vertical-to-horizontal scrolling.

ADDING PROJECT MEDIA
--------------------
Add media inside the matching entry in js/projects-data.js:
{ "type": "image", "src": "images/21.png", "caption": "Useful description" }
{ "type": "video", "src": "videos/4.mp4", "poster": "images/21.png", "caption": "Motion study" }
Images and videos are rendered automatically in the horizontal overlay. Keep video files in browser-compatible MP4/H.264 format.

WEBSITE PREVIEWS AND IFRAMES
----------------------------
1. Duplicate a .website-project article.
2. Replace the visible text, screenshot and external link.
3. Set data-live-url to the final HTTPS address.
4. Set data-live-enabled="true" to allow activation.
5. Set data-embed-allowed="true" only when the website permits iframe embedding.
6. If CSP or X-Frame-Options blocks embedding, set data-embed-allowed="false". The screenshot and Visit Live link remain available. Do not bypass remote protections.
Only one iframe is loaded at a time, and only after deliberate interaction.

SERVICES AND AI DIAGRAM
-----------------------
- Edit service names and list items directly in the Services HTML.
- Edit every diagram label directly in the .ai-node HTML elements.
- Workflow activation maps and explanation text are in js/ai-diagram.js. If labels/nodes are renamed, update those small maps to match.

LOADER
------
At the top of js/loader.js, set:
const loaderMode = "session";
Supported values: "always", "session", "disabled". Session mode plays once per browser session. The v2 loader transforms amouzegaR into Studio Rage through individually clipped, measured character tracks. Set loaderDebug = true during development to show source/target boxes, coordinates and movement lanes; return it to false for production. Adjust sourceReveal, readableHold, sharedMove, sharedStagger, missingEnter, finalHold and heroTransition inside loaderTimings. Add ?loader=always to the local preview URL to replay the loader while testing. Reduced-motion users receive a short masked replacement.

CONTACT FORM
------------
The site never shows a fake success state. Set contactEndpoint near the top of js/contact.js to the HTTPS endpoint supplied by Formspree, Basin, Getform or a comparable provider. Review that provider’s privacy, spam-protection, redirect and consent settings. The form includes accessible validation and a honeypot.

COLORS, MOTION AND LAYOUT
-------------------------
- Change the entire palette and core spacing in css/variables.css.
- General styles are in css/style.css, motion in css/animations.css and breakpoints in css/responsive.css.
- Scroll-chapter calculations, parallax and clip progression are in js/motion.js. Change --parallax-strength in css/variables.css to adjust global parallax strength.
- The primary font stack is "Helvetica Neue", Helvetica, Arial, sans-serif. See fonts/README.txt before bundling licensed font files.
- Do not remove the prefers-reduced-motion rules.

METADATA, SEO, AEO AND GEO
--------------------------
- Replace the title, description, canonical URL, Open Graph URLs and JSON-LD values in index.html.
- Replace every https://example.com URL in index.html, robots.txt and sitemap.xml with the final domain.
- Project descriptions and FAQ answers are crawlable HTML.
- Add final social profile URLs and real contact details. Do not publish fake reviews, ratings, awards or clients.

LEGAL PLACEHOLDERS
------------------
legal.html, privacy.html and cookies.html contain clearly marked placeholders, not legal advice. Complete and review them for the actual business, services, form provider, analytics, hosting and applicable jurisdictions before publication.

PORTABLE VISUAL CMS IMPORT
--------------------------
The ZIP root contains index.html and all folders directly. Do not wrap the package in another folder. Import the ZIP through Portable Visual CMS’s static-site ZIP importer. After import, verify that edits preserve data-cms-* attributes, relative paths and the numbered filename system.

PRE-LAUNCH CHECKLIST
--------------------
- Replace placeholder media, clients, URLs, email, legal fields and domain.
- Configure and test the form endpoint.
- Confirm which live sites permit iframe embedding.
- Test keyboard navigation, Escape close, focus return, vertical/touch scrolling and reduced motion.
- Review at 320, 375, 430, 768, 1024, 1280, 1440 and 1920 px.
- Test current Chrome, Safari, Firefox and Edge, then run accessibility and performance audits on the deployed URL.


V3 VISUAL REFINEMENT
--------------------
- Homepage typography reduced and set to regular/medium weights with safer line-height.
- Primary buttons use a single solid red color; no button gradients.
- Added pointer-following red heat/fire canvas effect, client marquee and full-width studio reel.
- Added padding and title overlays to every featured project image.
- Every visual and website portfolio item includes a See more button.
- See more now opens a responsive full-screen overlay. Vertical scrolling moves the project media horizontally; the title remains bottom-left and progression remains bottom-right.
- Replaced the previous loader with the supplied amouzegar → Studio Rage animation. Add ?loader=always to replay it during testing.
- Added large Studio Rage ending wordmark and updated the contact/footer layout.

Project data is stored in js/projects-data.js. Edit that file to change titles, descriptions, metadata and galleries without creating additional HTML pages.


V4 CLIENT LOGO PLACEHOLDERS
---------------------------
Replace these files with transparent PNG logo files while keeping the same names:
- images/15.png = client logo 1
- images/16.png = client logo 2
- images/17.png = client logo 3
- images/18.png = client logo 4
- images/19.png = client logo 5
- images/20.png = client logo 6

Logos are displayed as monochrome white in the marquee through CSS. Remove the filter on .client-marquee__item img if original logo colors must be preserved.

EDITORIAL FONT
---------------
Primary titles use PP Editorial New. The CSS first checks whether the font is installed locally. For hosting, add legally licensed files as:
- fonts/PPEditorialNew-Regular.woff2
- fonts/PPEditorialNew-Italic.woff2

LOADER
------
The homepage loader now uses the exact supplied amouzegar -> Rage -> Studio Rage sequence and runs on every homepage load.

V5 UPDATE
- Loader now waits for fonts and guarantees the complete “Studio Rage” reveal.
- Removed the Studio positioning section.
- Removed the 3D and CGI workflow section.
- Removed the obsolete Studio navigation target.

V6 LOADER NOTE
The homepage loader uses the exact supplied standalone file `studio-rage-loader.html`
inside an isolated full-screen iframe. Do not merge its CSS into the main website,
as isolation prevents global typography and layout rules from changing the animation.


V7 COLOR / INTERACTION UPDATE
- Primary accent: #0066ff.
- Interface: predominantly black and white; blue is restrained to interactive feedback and the pointer flow.
- Pointer background: local WebGL fluid ribbon with an animated Canvas 2D fallback.
- No external JavaScript, font or runtime dependency was added.
