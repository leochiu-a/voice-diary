// Opened from the home screen, iOS fades the page in as soon as it has drawn
// something. That fade starts from the web view's white, not the page's
// background, when the first thing drawn is the page's content, which it is
// for a streamed page. So the root layout runs this script before the first
// paint: it keeps the body hidden until one frame with just the background has
// been drawn, and the CSS in globals.css reads the flag.
//
// This relies on the app having no launch image (see the root layout): iOS
// cross-fades a launch image into the page, and that fade is the flash again.
export const firstPaintScript = `if(matchMedia("(display-mode: standalone)").matches){var h=document.documentElement;h.dataset.booting="";requestAnimationFrame(function(){requestAnimationFrame(function(){delete h.dataset.booting})})}`;
