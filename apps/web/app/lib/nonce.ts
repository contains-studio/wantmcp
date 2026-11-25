import { createContext, useContext } from "react";

/** This response's CSP nonce, for the few inline scripts the document needs (entry.server provides it). */
export const NonceContext = createContext<string | undefined>(undefined);
export const useNonce = () => useContext(NonceContext);

/**
 * Reload once when one of our own stylesheets fails to load. During a deploy a fresh request can get the previous
 * build's HTML whose hashed stylesheet is already gone: an unstyled page, and its scripts are gone too, so nothing
 * else can recover it. Runs in <head>, before the stylesheets, as a capture-phase error listener (load errors on
 * <link> don't bubble). Never loops: at most one reload per tab in 30 seconds, and none when sessionStorage can't
 * record it (a reload that itself fails to style leaves the page as it is).
 */
export const STYLESHEET_GUARD = `(function(){var K="wm_css_reload";addEventListener("error",function(e){var t=e.target;if(!t||t.tagName!=="LINK"||!/stylesheet/i.test(t.rel||""))return;try{if(new URL(t.href,location.href).origin!==location.origin)return;var last=Number(sessionStorage.getItem(K)||0);if(Date.now()-last<30000)return;sessionStorage.setItem(K,String(Date.now()))}catch(_){return}location.reload()},true)})();`;
