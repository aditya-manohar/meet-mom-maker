document.addEventListener('DOMContentLoaded', () => {
    const statusEl = document.getElementById('status');
    const fetchBtn = document.getElementById('fetchCaptions');
    const participantsOutput = document.getElementById('participantsOutput');
    const captionOutput = document.getElementById('captionOutput');

    if (!statusEl || !fetchBtn || !participantsOutput || !captionOutput) {
        console.error('Popup elements missing.');
        return;
    }

    fetchBtn.addEventListener('click', () => {
        statusEl.textContent = 'Fetching captions...';
        chrome.runtime.sendMessage({ action: 'getCaptions' }, response => {
            if (chrome.runtime.lastError || !response) {
                statusEl.textContent = 'Cannot communicate with Meet page.';
                participantsOutput.innerHTML = '';
                captionOutput.textContent = '';
                return;
            }
            if (response.error) {
                statusEl.textContent = response.error;
                participantsOutput.innerHTML = '';
                captionOutput.textContent = '';
            } else {
                statusEl.textContent = 'Captions fetched.';
                // Clear previous bubbles
                participantsOutput.innerHTML = '';
                // Split participants and create bubbles
                const participants = response.participants.split(' and ');
                participants.forEach(participant => {
                    const bubble = document.createElement('span');
                    bubble.className = `participant-bubble ${participant.trim() === 'You' ? 'you' : ''}`;
                    bubble.textContent = participant.trim();
                    participantsOutput.appendChild(bubble);
                });
                captionOutput.textContent = response.results;
            }
        });
    });
});