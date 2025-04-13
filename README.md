# ChatGPT-Bookmarker

## Inspiration
When using ChatGPT, I would sometimes get confused and ask ChatGPT to elaborate on a subsection of its output. However, it was annoying to have to scroll and find the original thread after I finished asking the clarification question.

## What it does
Therefore, our team decided to create a web extension-- named ChatGPT Bookmarker-- to prevent the user from needing to scroll up and down the message history when trying to ask follow-up questions about a topic.

## Features:

- Collapsible bookmark list
- Draggable and resizable panel for ease of use
- Ability to bookmark sub-parts of messages
- Renaming and removing bookmarks

## How we built it
We created a manifest.json file to make it a Chrome extension. Then, we created a bookmark by using a popup, that asked for our permission to activate the bookmark. We could add to the bookmark by clicking an add button. To do this, we created Javascript files. We used MutationObservers to tell when ChatGPT generated new messages by recognizing DOM changes, which let us hover over the text to get the bookmark icon. We stored the bookmarks in chrome.storage.local from the Chrome Storage API that lets the user go back to saved messages. We created icons on Canva to match which the aesthetics of ChatGPT.

## Challenges we ran into
One challenge we overcame was making sure the scrolling feature automatically scrolled down each time a new bookmark is added to the list. One challenge we ran into was preserving the bookmark tab across conversations, which we hope to include in future versions of our extension.

## Accomplishments that we're proud of
We created a functional Chrome Extension!

## What we learned
We gained more experience with JavaScript and created our first Chrome extension!

## What's next for ChatGPT Bookmarker
We hope to publish this on the Chrome Web Store soon to gain more users (The webstore was closed for the weekend so we could not set our extension up during the hackathon)!
