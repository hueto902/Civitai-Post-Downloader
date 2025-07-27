// Listen for messages from content scripts or popup scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Check if the message is for downloading images
    if (message.type === 'DOWNLOAD_IMAGES' && message.urls) {
        
        // Let the popup know the download process has started
        chrome.runtime.sendMessage({ type: 'DOWNLOAD_STARTED', count: message.urls.length });

        // Extract post ID from the tab's URL for naming files
        const tabUrl = sender.tab.url;
        const postIdMatch = tabUrl.match(/civitai\.com\/posts\/(\d+)/);
        const postId = postIdMatch ? postIdMatch[1] : 'unknown-post';

        // Download each image
        message.urls.forEach((url, index) => {
            const fileExtensionMatch = url.match(/\.(jpeg|jpg|png|webp)/i);
            const fileExtension = fileExtensionMatch ? fileExtensionMatch[0] : '.jpeg';
            
            chrome.downloads.download({
                url: url,
                // Create a unique filename for each image
                filename: `civitai_${postId}_${index + 1}${fileExtension}`,
                saveAs: false // Directly download without a "Save As" dialog
            });
        });

        // A simple way to signal completion.
        // A more robust solution would track each download's completion.
        setTimeout(() => {
             chrome.runtime.sendMessage({ type: 'DOWNLOAD_COMPLETE' });
        }, 2000); // Give downloads a moment to initiate

    } else if (message.type === 'NO_IMAGES_FOUND') {
        // Forward the message to the popup
        chrome.runtime.sendMessage({ type: 'NO_IMAGES_FOUND_BG' });
    }
});
