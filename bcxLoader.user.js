// ==UserScript==
// @name         BCX - Bondage Club Extended RU (Loader)
// @namespace    BCX
// @version      1.0.5
// @description  Loader of Jomshir's "Bondage Club Extended" mod RU
// @author       Original Jomshir98 (fork shiroptr95)
// @include      /^https:\/\/(www\.)?bondageprojects\.elementfx\.com\/R\d+\/(BondageClub|\d+)(\/((index|\d+)\.html)?)?$/
// @include      /^https:\/\/(www\.)?bondage-europe\.com\/R\d+\/(BondageClub|\d+)(\/((index|\d+)\.html)?)?$/
// @homepage     https://github.com/shiroptr95/bondage-club-extended#readme
// @source       https://github.com/shiroptr95/bondage-club-extended
// @downloadURL  https://shiroptr95.github.io/bondage-club-extended/bcxLoader.user.js
// @run-at       document-end
// @grant        none
// ==/UserScript==

// eslint-disable-next-line no-restricted-globals
setTimeout(
	function () {
		if (window.BCX_Loaded === undefined) {
			const n = document.createElement("script");
			n.setAttribute("language", "JavaScript");
			n.setAttribute("crossorigin", "anonymous");
			n.setAttribute("src", "https://shiroptr95.github.io/bondage-club-extended/bcx.js?_=" + Date.now());
			n.onload = () => n.remove();
			document.head.appendChild(n);
		}
	},
	2000
);
