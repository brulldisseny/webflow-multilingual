// --- Webflow Multilingual Refactored ---
// Based on original code from sygnaltech/webflow-multilingual
// Refactored to remove eval(), improve DOM modification, and enhance efficiency/safety.

(function() {
    'use strict'; // Enable strict mode

    const DEFAULT_LANG = "ca"; // **CANVIA AIXÒ** al teu idioma per defecte (ex: "ca", "es", "en")
    const LANG_STORAGE_KEY = 'lang'; // Key for localStorage

    // Regular expression to find language tags: [[xx]]Text...
    const LANG_REG_EXP = /\[\[([a-z]{2})\]\]([^\[]+)/g; 
    
    // Check if localStorage is available
    const isStorageEnabled = (function() {
        try {
            const testKey = '__test__';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    })();

    // --- Language Detection ---

    // Get language from URL parameter (?lang=xx)
    const getLangParam = function() {
        const match = location.search.match(/[?&]lang=([a-z]{2})/);
        return match ? match[1] : null;
    };

    // Get language from localStorage
    const getLangFromStorage = function() {
        return isStorageEnabled ? localStorage.getItem(LANG_STORAGE_KEY) : null;
    };

    // Get browser's preferred language
    const getBrowserLang = function() {
        return (navigator.language || navigator.userLanguage || DEFAULT_LANG).substr(0, 2);
    };

    // Determine initial language (Param > Storage > Browser > Default)
    let currentLang = getLangParam() || getLangFromStorage() || getBrowserLang();

    // Ensure the determined language is supported or fallback to default (optional but good practice)
    // You might want to add a list of supported languages if needed.
    // For now, we assume any 2-letter code found is potentially valid.

    // --- Core Functions ---

    // Store processed text nodes and their language dictionaries
    const globalDict = [];

    // Function to find all text nodes within an element
    const getTextNodes = function(el) {
        const nodes = [];
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            // Only consider nodes with the language tag pattern
            if (LANG_REG_EXP.test(node.nodeValue)) {
               nodes.push(node);
            }
            LANG_REG_EXP.lastIndex = 0; // Reset regex index after test
        }
        return nodes;
    };

    // Apply the selected language to the page
    const applyLang = function() {
        // Update text nodes
        globalDict.forEach(function(item) {
            // Get the text for the current language, or fallback to default, or empty string
            const newText = item.dict[currentLang] || item.dict[DEFAULT_LANG] || '';
            // Update the text node's content directly (safer than .html())
            if (item.node.nodeValue !== newText) {
               item.node.nodeValue = newText;
            }
        });

        // Show/hide elements with the 'autolang' attribute
        document.querySelectorAll('*[autolang]').forEach(function(el) {
            el.style.display = 'none'; // Hide all first
        });
        document.querySelectorAll('*[autolang="' + currentLang + '"]').forEach(function(el) {
            el.style.display = ''; // Show elements matching the current language
        });
    };

    // Set a new language and apply it
    const setLang = function(lang) {
        if (!lang || lang.length !== 2) {
           console.warn('Invalid language code provided to setLang:', lang);
           return; 
        }
        currentLang = lang;
        if (isStorageEnabled) {
            localStorage.setItem(LANG_STORAGE_KEY, currentLang);
        }
        applyLang();
        // Optional: Dispatch a custom event if other scripts need to know the language changed
        // document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: currentLang } }));
    };


    // --- Initialization ---

    // Wait for the DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', function() {

        // Find all relevant text nodes and build the dictionary
        const textNodes = getTextNodes(document.body);
        
        textNodes.forEach(function(node) {
            const nodeValue = node.nodeValue;
            const dict = {};
            let match;
            let hasDefault = false;
            LANG_REG_EXP.lastIndex = 0; // Reset regex index before exec loop

            while ((match = LANG_REG_EXP.exec(nodeValue)) !== null) {
                const langCode = match[1];
                const text = match[2];
                dict[langCode] = text;
                if (langCode === DEFAULT_LANG) {
                    hasDefault = true;
                }
            }

            // Only add if a dictionary was successfully created
            if (Object.keys(dict).length > 0) {
                 // If default language text is missing, try to find *any* text as a last resort fallback
                 if (!hasDefault) {
                    const firstKey = Object.keys(dict)[0];
                    if (firstKey) {
                        dict[DEFAULT_LANG] = dict[firstKey]; 
                        console.warn('Missing default language (' + DEFAULT_LANG + ') text. Using first available (' + firstKey + ') as fallback for:', nodeValue.substring(0, 50) + '...');
                    }
                 }
                 globalDict.push({ node: node, dict: dict });
            }
        });

        // Apply the initial language
        applyLang();

        // --- Event Handling for Language Switching (Replaces eval) ---
        // Use event delegation on the body for efficiency
        document.body.addEventListener('click', function(event) {
            // Find the nearest ancestor (or the element itself) with the 'whenClick' attribute
            const target = event.target.closest('[whenClick]'); 
            
            if (target) {
                const action = target.getAttribute('whenClick');
                
                // Parse specifically for "setLang('xx')"
                const langMatch = action.match(/setLang\(['"]([a-z]{2})['"]\)/); // Allows single or double quotes
                
                if (langMatch && langMatch[1]) {
                    event.preventDefault(); // Prevent default link behavior if it's a link
                    setLang(langMatch[1]);
                } else {
                    console.warn('Unrecognized action in whenClick attribute:', action);
                }
            }
        });

        // Make setLang globally accessible IF NEEDED by other scripts or inline calls
        // (Though using the whenClick attribute is preferred)
        window.setLang = setLang; 

    }); // End DOMContentLoaded

})(); // End IIFE wrapper
