console.log('Content script loaded on:', window.location.href);
chrome.runtime.sendMessage({ action: 'contentScriptLoaded', url: window.location.href });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received:', request);
    if (request.action === 'getCaptions') {
        try {
            const speakerDivs = document.querySelectorAll('.KcIKyf.jxFHg');
            const captionDivs = document.querySelectorAll('.ygicle.VbkSUe');
            const results = [];
            const participants = new Set();

            for (let i = 0; i < speakerDivs.length; i++) {
                const speaker = speakerDivs[i].textContent.trim() || 'Unknown';
                const caption = captionDivs[i]?.textContent.trim() || 'No caption';
                results.push(`${speaker}: ${caption}`);
                participants.add(speaker);
            }

            console.log('Extracted results:', results);
            console.log('Participants:', Array.from(participants));
            sendResponse({ results: results.join('\n'), participants: Array.from(participants).join(' and ') });
        } catch (err) {
            console.error('Error accessing DOM:', err.message);
            sendResponse({ error: 'Failed to access caption elements: ' + err.message });
        }
    }
    return true;
});