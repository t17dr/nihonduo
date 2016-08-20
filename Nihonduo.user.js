// ==UserScript==
// @name         Nihonduo
// @namespace    none
// @version      0.1
// @description  Duolingo reverse japanese tree helper
// @author       t17dr
// @homepage     http://www.t17dr.com
// @include      https://www.duolingo.com/*
// @require      http://code.jquery.com/jquery-latest.js
// @require      https://rawgit.com/jeresig/jquery.hotkeys/master/jquery.hotkeys.js
// @downloadURL  https://github.com/t17dr/nihonduo/raw/master/Nihonduo.user.js
// @updateURL    https://github.com/t17dr/nihonduo/raw/master/Nihonduo.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // An array to memoize API requests for furigana
    var furiganaCache = [];

    // Text to speech backlog
    var waitingSentence = "";

    // Are the text to speech voices ready?
    var voicesLoaded = false;

    // Can we play text to speech?
    var canRead = true;

    // Is the API key prompt visible?
    var apiDialogVisible = false;

    // The hiragana API key
    var key = "";

    // Show a prompt to enter API key, call callback when the user clicks OK and pass the key as argument
    function showAPIkeyDialog(callback)
    {
        key = localStorage.getItem("nihonduo-api-key");
        var containerExists = $("#session-element-container").length > 0;
        var canDisplay = !apiDialogVisible && containerExists;

        if ( (key === null || key === "null") && canDisplay)
        {

            // Big HTML blob to show the prompt
            $("#session-element-container").append(`<div id=\"api-prompt\" title=\"Nihonduo\" style=\"position: absolute; z-index: 1000; background-color: white;
            width: 500px; left: 0; right: 0; margin-left: auto; margin-right: auto; padding: 10px; border: 1px solid #aaa; border-radius: 10px;\">
            <p>Please paste your API key here, you will get the key at 
            <a href=\"https://labs.goo.ne.jp/en/apiregister/\">https://labs.goo.ne.jp/en/apiregister/</a>, you'll need a
            <a href=\"http://www.github.com\">github</a> account.</p>
            <input type=\"text\" value=\"\" name=\"key\" id=\"nihonduo-key\" class=\"text ui-widget-content ui-corner-all\" style=\"width: 100%;\" placeholder=\"Please enter your API key here\">
            </div>`);

            apiDialogVisible = true;

            $("#api-prompt").append("<div style=\"margin-top: 5px;\"><button type=\"button\" id=\"nihonduo-api-ok\">OK</button><button type=\"button\" id=\"nihonduo-api-cancel\">Cancel</button></div>");
            $("#api-prompt").prepend("<h3>Nihonduo userscript</h3>");
        }

        $("#nihonduo-api-cancel").unbind();
        $("#nihonduo-api-cancel").bind("click", function(){
            $("#api-prompt").hide(400);
        });

        $("#nihonduo-api-ok").unbind();
        $("#nihonduo-api-ok").bind("click", function(){
            var k = $("#nihonduo-key").val();

            // Use HTML5 local storage, GM_setValue just causes a lot of trouble with the sandbox
            localStorage.setItem('nihonduo-api-key', k);
            $("#api-prompt").hide(400);
            callback(k);
        });

    }

    // Is the current page in the japanese reverse tree?
    function isJapaneseReverseTree()
    {
        if (window.duo === undefined)
        {
            return false;
        }
        var langFrom = window.duo.user.attributes.ui_language.indexOf("ja") !== -1;
        var langTo = window.duo.user.attributes.learning_language.indexOf("en") !== -1;

        return langFrom && langTo;
    }

    // Debug helper, prints duo user attributes to console 
    function printDuoAttr()
    {
        var k = Object.keys(window.duo.user.attributes);
        for (var key of k)
        {
            console.log(key);
        }
    }

    
    // When new voices are loaded, look if there is a sentence in backlog to read
    var isFF = navigator.userAgent.search("Firefox") > -1;
    if (!isFF)                                                      // This is not supported on Firefox
    {
        window.speechSynthesis.onvoiceschanged = function() {
            voicesLoaded = true;
            if (waitingSentence !== "")
            {
                readJapanese(waitingSentence);
                waitingSentence = "";
            }
        };
    }

    $(document).bind('keydown', 'ctrl+space', readChallenge);

    // Use text to speech to read a japanese sentence
    function readJapanese(sentence)
    {
        if (!voicesLoaded)      // voices not yet loaded, add to backlog
        {
            waitingSentence = sentence;
        } else if (canRead) {
            var synth = window.speechSynthesis;

            var msg = new SpeechSynthesisUtterance();
            msg.voice = getJapaneseVoice(); 
            msg.voiceURI = 'native';
            msg.volume = 1; // 0 to 1
            msg.rate = 1; // 0.1 to 10
            msg.pitch = 1; //0 to 2
            msg.text = sentence;
            msg.lang = 'ja-JP';

            window.speechSynthesis.speak(msg);
            
            canRead = false;
            setTimeout(function(){ canRead=true; }, 2000);
        }
    }

    // Find a japanese language text to speech voice
    function getJapaneseVoice()
    {
        var synth = window.speechSynthesis;
        var voices = synth.getVoices();

        var voiceID = 0;
        for (var i = 0; i < voices.length; i++)
        {
             if (voices[i].lang === "ja-JP")
             {
                 voiceID = i;
                 break;
             }
        }

        return voices[voiceID];
    }

    // Get a list of the hint elements
    function getHints(sentence)
    {
        var hints;

        if (!isJapanese(sentence))
        {
            hints = $(".hint-table .inner .content table tbody tr td");
        } else {
            hints = $(".hint-table .inner .content table thead tr");
        }

        return hints;
    }
    
    // Append hiragana pronounciation to hint tables
    function furigana()
    {
        var sentence = getCurrentSentence();
        var headerString = "";

        var hints = getHints(sentence);
        
        hints.each(function(){
            var current = $(this);
            var hint = "";

            if (!isJapanese(sentence))
            {
                hint = (current.text().split("|"))[0];
            } else {
                
                var parentTr = $(this);
                headerString = parentTr.text();
                hint = (headerString.split("|"))[0];
                var th = parentTr.find("> th");
                th.remove();
                var elm = $("<th>" + headerString + "</th>"); 
                parentTr.html(elm);
                current = parentTr.find("> th");

            }

            if (hint in furiganaCache)
            {
                //console.log("cache");
                applyFurigana(furiganaCache[hint], current, hint);
            }
            else
            {
                //console.log("non-cache");
                furiganaAPIrequest(current, hint);
            }

        });
            
    }

    // Add a link to jisho dictionary for each hint
    function jisho()
    {
        var sentence = getCurrentSentence();
        var headerString = "";

        var hints = getHints(sentence);

        hints.each(function(){
            var current = $(this);
            var hint = "";
            var canAppend = true;

            if (!isJapanese(sentence))
            {
                hint = (current.text().split("|"))[0];
                current = $(this);
            } else {
                var parentTr = $(this);
                headerString = parentTr.text();
                hint = (headerString.split("|"))[0];
                current = parentTr.find("> th");

                if (headerString.indexOf("|") == -1)
                {
                    canAppend = false;
                }

            }

            if (current.find("#nihonduo-jisho").length > 0)
            {
                canAppend = false;
            }

            if (canAppend)
            {
                current.append(" <span id=\"nihonduo-jisho\" class=\"btn btn-primary explain btn-small\">Jisho</span>");

                var jisho = current.find("#nihonduo-jisho");
                jisho.unbind();
                jisho.bind("click", function() {
                    window.open("http://jisho.org/search/" + hint.trim(), "_blank");
                });
            }
        });
    }

    // Make a request to the labs.goo.ne.jp API to get hiragana pronounciation, append result to cache
    function furiganaAPIrequest(current, hint)
    {
        if (hint === "" || hint === undefined)
        {
            return;
        }

        // Try to get the API key
        showAPIkeyDialog(function(k){
            key = k;
        });

        if (key != "" && key != null && key != "null")
        {
            $.ajax({
                method: "POST",
                url: "https://labs.goo.ne.jp/api/hiragana",
                dataType: "json",
                data: { app_id: key,
                        sentence: hint,
                        output_type: "hiragana" }
            })
                .done(function( data ) {
                    observer.disconnect();
                    furiganaCache[hint] = data;
                    applyFurigana(data, current, hint);
                    observer.observe(target, config);
            })
                .fail(function(){
                    $(".hint-table .inner .content table tbody tr").append("<td>(Nihonduo hiragana failed to load)</td>");
                });
        }
    }
    
    // Append furigana to hints table element
    // data: API request result
    // parentElement: DOM element to append to (td for EN->JP, th for JP->EN challenges)
    // originalText: element content before appending
    function applyFurigana(data, parentElement, originalText)
    {
        var original = originalText.split("|");

        parentElement.html(original[0] + "| <span style=\"color: #999;\">" + data.converted + "</span>");

        // Apply jisho links AFTER furigana
        jisho();
    }
    
    // Does text include any japanese characters?
    function isJapanese(text)
    {
        return /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(text);
    }
    
    // Get current challenge sentence from the DOM
    function getCurrentSentence()
    {
        var sentence = "";

        $(".text-to-translate").find(".non-space.token").each(function(){
            sentence += $(this).text();
        });

        return sentence;
    }

    // Text to speech read the current challenge, if the original is in japanese
    function readChallenge()
    {
        var sentence = getCurrentSentence();
        if (isJapanese(sentence))
        {
            sentence = sentence.replace(/[a-zA-Zé\?\!\.\,\'\;\:]*/, "");
            readJapanese(sentence);
        }
    }

    function appendSpeakIcon()
    {
        var sentence = getCurrentSentence();
        var alreadyExists = $("#speak-japanese").length > 0;

        if (isJapanese(sentence) && !alreadyExists)
        {
            $(".text-to-translate").prepend("<span id=\"speak-japanese\" class=\"speaker-small\" style=\"margin-right: 20px\"><span class=\"icon icon-speaker-small \"></span></span>");
            $("#speak-japanese").off("click");
            $("#speak-japanese").on("click", readChallenge);
        }
    }

    // Should TTS play on this change?
    function shouldSpeakOnChange(mutations)
    {

        for (var mutation of mutations) 
        {

            if (mutation.target.nodeType == 1) // ELEMENT_NODE
            {
                if (mutation.target.id.indexOf("submitted-text") !== -1 ||
                    mutation.target.id.indexOf("big-speaker") !== -1 ||
                    mutation.target.id.indexOf("prev-session-element-container") !== -1 )
                {
                    return false;
                }
            }
        }

        if (!isJapanese(getCurrentSentence()))
        {
            return false;
        }

        return true;
    }
    
    var observer = new MutationObserver(function(mutations) {
        observer.disconnect();

            // rebind hotkeys for textarea if it already exists
            $(".textarea-translate").unbind("keydown", readChallenge);
            $(".textarea-translate").bind('keydown', 'ctrl+space', readChallenge);

            furigana();

            if (shouldSpeakOnChange(mutations))
            {
                readChallenge();
            }
            appendSpeakIcon();

        observer.observe(target, config);
    });
    
    var config = { 
        childList: true, 
        characterData: true,
        subtree: true
    };

    var target;

    // the main mutation observer watches only main player div, do so only if the element actually exists
    var body = $("body")[0];
    var bodyObserver = new MutationObserver(function(mutations) {
        bodyObserver.disconnect();
            if ( $(".player-main").length )     // does player exist yet?
            {
                if (isJapaneseReverseTree())
                {
                    // MutationObserver target
                    target = $(".player-main")[0];
                    observer.observe(target, config);
                }
            } else {
                observer.disconnect();
            }
        bodyObserver.observe(body, config);
    });

    bodyObserver.observe(body, config);

    
})();