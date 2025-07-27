// Get references to the UI elements
const downloadBtn = document.getElementById('downloadBtn');
const statusEl = document.getElementById('status');

// Add a click listener to the download button
downloadBtn.addEventListener('click', async () => {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Check if the tab is a valid Civitai post page
    if (tab && tab.url && tab.url.includes('civitai.com/posts/')) {
        // Update status and disable the button to prevent multiple clicks
        statusEl.textContent = 'Finding images on the page...';
        downloadBtn.disabled = true;
        downloadBtn.classList.add('opacity-50', 'cursor-not-allowed');

        try {
            // Send a message to the content script to start the process
            // The content script will find the images and send them to the background script
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: findAndSendImages,
            });
        } catch (error) {
            console.error('Error executing script:', error);
            statusEl.textContent = 'Error: Could not access page.';
            // Re-enable the button on error
            downloadBtn.disabled = false;
            downloadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    } else {
        // If not on a valid page, inform the user
        statusEl.textContent = 'Please navigate to a civitai.com/posts/ page first.';
    }
});

// This function will be injected and executed on the Civitai page
function findAndSendImages() {
    // Find all image elements within the main content area of the post.
    // This selector targets the images in the carousel.
    const imageElements = document.querySelectorAll('main img[src*="image.civitai.com"]');
    
    if (imageElements.length === 0) {
        chrome.runtime.sendMessage({ type: 'NO_IMAGES_FOUND' });
        return;
    }

    const imageUrls = new Set(); // Use a Set to avoid duplicate URLs

    imageElements.forEach(img => {
        if (img.src) {
            // Modify the URL to get the high-quality version
            // 1. Remove any 'width=...' parameter
            // 2. Replace 'original=false' with 'original=true,quality=90'
            const highQualityUrl = img.src
                .replace(/width=\d+,?/g, '')
                .replace('original=false', 'original=true,quality=90');
            
            imageUrls.add(highQualityUrl);
        }
    });

    // Send the unique, high-quality URLs to the background script for downloading
    chrome.runtime.sendMessage({ type: 'DOWNLOAD_IMAGES', urls: Array.from(imageUrls) });
}

// Listen for messages from the background script to update the UI
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'DOWNLOAD_STARTED') {
        statusEl.textContent = `Downloading ${message.count} images...`;
    } else if (message.type === 'DOWNLOAD_COMPLETE') {
        statusEl.textContent = 'All downloads complete!';
        // Re-enable the button after a short delay
        setTimeout(() => {
            downloadBtn.disabled = false;
            downloadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            statusEl.textContent = 'Ready for another post.';
        }, 2000);
    } else if (message.type === 'NO_IMAGES_FOUND_BG') {
        statusEl.textContent = 'No downloadable images found on this page.';
        downloadBtn.disabled = false;
        downloadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
});
