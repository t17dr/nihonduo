# Nihonduo
Helper userscript for duolingo's reverse japanese tree

![Furigana pronounciation, jisho dictionary](https://raw.githubusercontent.com/t17dr/nihonduo/master/furigana.png)
![Text to speech](https://raw.githubusercontent.com/t17dr/nihonduo/master/tts.png)

## Features
* **"Furigana"** - hiragana pronounciation in the hints table
* **Text-to-speech** - hear the pronounciation of japanese sentences, just like duolingo's audio
* **Dictionary link for hints** - open jisho.org entry for each row in the hints table

## How to install
1. You will need the [tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
browser extension on chrome or [greasemonkey](https://addons.mozilla.org/cs/firefox/addon/greasemonkey/) on firefox,
2. Download the script from https://github.com/t17dr/nihonduo/raw/master/Nihonduo.user.js, the extension should ask you to install,
3. After installing when you first practice on in the japanese reverse tree, you'll be asked to enter an API key for the
hiragana pronounciation. Follow the instructions in that popup.

## Known issues
* Text-to-speech does not currently work on firefox
* Text-to-speech plays again when going to the next question
