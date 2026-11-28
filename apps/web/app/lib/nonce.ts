import { createContext, useContext } from "react";

/** This response's CSP nonce, for the few inline scripts the document needs (entry.server provides it). */
export const NonceContext = createContext<string | undefined>(undefined);
export const useNonce = () => useContext(NonceContext);

/**
 * Reload once when one of our own stylesheets fails to load. During a deploy a fresh request can get the previous
 * build's HTML whose hashed stylesheet is already gone: an unstyled page, and its scripts are gone too, so nothing
 * else can recover it. Runs in <head>, before the stylesheets, as a capture-phase error listener (load errors on
 * <link> don't bubble). A list's look stylesheets are hoisted ahead of this script, and one of them can fail before
 * the listener exists (the other still loading holds scripts back), so it also checks the stylesheets already in the
 * document: by the time a script runs, every stylesheet before it has finished, and one with no sheet, or with a sheet
 * holding no rules (what a failed load leaves; ours are never empty), has failed. Never loops: at most one reload per tab in 30 seconds, and none when sessionStorage can't
 * record it (a reload that itself fails to style leaves the page as it is).
 */
export const STYLESHEET_GUARD = `(function(){var K="wm_css_reload";function go(t){if(!t||t.tagName!=="LINK"||!/stylesheet/i.test(t.rel||""))return;try{if(new URL(t.href,location.href).origin!==location.origin)return;var last=Number(sessionStorage.getItem(K)||0);if(Date.now()-last<30000)return;sessionStorage.setItem(K,String(Date.now()))}catch(_){return}location.reload()}addEventListener("error",function(e){go(e.target)},true);var l=document.querySelectorAll("link[rel~=stylesheet]");for(var i=0;i<l.length;i++){var s=l[i].sheet,bad=!s;if(s){try{bad=s.cssRules.length===0}catch(_){bad=false}}if(bad){go(l[i]);break}}})();`;
