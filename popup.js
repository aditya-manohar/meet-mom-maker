document.addEventListener('DOMContentLoaded', () => {
    const statusEl = document.getElementById('status');
    const fetchBtn = document.getElementById('fetchCaptions');
    const generateBtn = document.getElementById('generateMoM');
    const participantsOutput = document.getElementById('participantsOutput');
    const captionOutput = document.getElementById('captionOutput');
    const momOutput = document.getElementById('momOutput');

    if (!statusEl || !fetchBtn || !generateBtn || !participantsOutput || !captionOutput || !momOutput) {
        console.error('Popup elements missing.');
        return;
    }

    // Your provided Gemini API key
    const GEMINI_API_KEY = 'AIzaSyAiCrUjMeQ71Nr01FlBHOhK1DH_XilnPpQ';

    fetchBtn.addEventListener('click', () => {
        statusEl.textContent = 'Fetching captions...';
        chrome.runtime.sendMessage({ action: 'getCaptions' }, response => {
            if (chrome.runtime.lastError || !response) {
                statusEl.textContent = 'Cannot communicate with Meet page.';
                participantsOutput.innerHTML = '';
                captionOutput.textContent = '';
                momOutput.textContent = '';
                return;
            }
            if (response.error) {
                statusEl.textContent = response.error;
                participantsOutput.innerHTML = '';
                captionOutput.textContent = '';
                momOutput.textContent = '';
            } else {
                statusEl.textContent = 'Captions fetched.';
                participantsOutput.innerHTML = '';
                const participants = response.participants.split(' and ');
                participants.forEach(participant => {
                    const bubble = document.createElement('span');
                    bubble.className = `participant-bubble ${participant.trim() === 'You' ? 'you' : ''}`;
                    bubble.textContent = participant.trim();
                    participantsOutput.appendChild(bubble);
                });
                captionOutput.textContent = response.results;
                generateBtn.disabled = false;
            }
        });
    });

    async function generateMoMWithRetry(prompt, maxRetries = 3, initialDelay = 30000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 1000
                        }
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    if (response.status === 429) {
                        const retryDelay = errorData.error?.details?.find(d => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo')?.retryDelay || initialDelay;
                        console.log(`429 error, retrying after ${retryDelay}ms (attempt ${attempt}/${maxRetries})`);
                        if (attempt < maxRetries) {
                            statusEl.textContent = `Quota exceeded, retrying in ${retryDelay / 1000} seconds...`;
                            await new Promise(resolve => setTimeout(resolve, retryDelay));
                            continue;
                        } else {
                            throw new Error('Quota exceeded after max retries. Please check your plan at https://ai.google.dev/gemini-api/docs/rate-limits or wait a minute.');
                        }
                    }
                    throw new Error(`API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
                }

                const data = await response.json();
                return data.candidates[0].content.parts[0].text;
            } catch (err) {
                console.error(`Attempt ${attempt} failed:`, err.message);
                if (attempt === maxRetries) throw err;
            }
        }
    }

    generateBtn.addEventListener('click', async () => {
        statusEl.textContent = 'Generating MoM...';
        momOutput.textContent = '';
        const captions = captionOutput.textContent;
        const participants = Array.from(participantsOutput.querySelectorAll('.participant-bubble'))
            .map(bubble => bubble.textContent.trim())
            .join(', ');

        if (!captions || !participants) {
            statusEl.textContent = 'No captions or participants to generate MoM.';
            return;
        }

        const prompt = `Generate a professional Minutes of Meeting (MoM) in markdown format based on the following Google Meet captions and participants. Include sections for Date, Participants, and Discussion Points. Use the exact date "August 14, 2025" (do not use any other date). Ensure the tone is formal and concise. List participants as provided, separated by commas.

Participants: ${participants}
Captions:
${captions}`;

        try {
            const momText = await generateMoMWithRetry(prompt);
            momOutput.textContent = momText;
            await navigator.clipboard.writeText(momText);
            statusEl.textContent = 'MoM generated and copied to clipboard!';
        } catch (err) {
            console.error('MoM generation error:', err.message);
            statusEl.textContent = `Failed to generate MoM: ${err.message}`;
        }
    });
});