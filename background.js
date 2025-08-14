let contentScriptLoaded = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received:', request);
    if (request.action === 'contentScriptLoaded') {
        contentScriptLoaded = true;
        console.log('Content script confirmed on:', request.url);
        sendResponse({ status: 'Content script acknowledged' });
    } else if (request.action === 'getCaptions') {
        chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
            if (!tabs[0] || !tabs[0].url.startsWith('https://meet.google.com/')) {
                sendResponse({ error: 'Not on a Google Meet page. Open meet.google.com and join a meeting.' });
                return;
            }
            if (!contentScriptLoaded) {
                console.log('Content script not loaded, injecting...');
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id, allFrames: true },
                        files: ['content.js']
                    });
                    contentScriptLoaded = true;
                } catch (err) {
                    sendResponse({ error: `Failed to inject content script: ${err.message}` });
                    return;
                }
            }
            chrome.tabs.sendMessage(tabs[0].id, { action: 'getCaptions' }, response => {
                if (chrome.runtime.lastError || !response) {
                    sendResponse({ error: 'Cannot communicate with Meet page. Ensure you are in a meeting with captions enabled.' });
                    return;
                }
                sendResponse(response);
            });
        });
        return true;
    }
});