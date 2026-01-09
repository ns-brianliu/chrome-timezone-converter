// src/background.js

// Store the latest conversions to handle clicks
let currentConversions = [];

chrome.runtime.onInstalled.addListener(() => {
  // Initialize the context menu
  chrome.contextMenus.create({
    id: "time-converter-root",
    title: "Copy Timestamp",
    contexts: ["all"],
    enabled: false 
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'UPDATE_CONTEXT_MENU') {
    currentConversions = request.conversions || [];
    const hasConversions = currentConversions.length > 0;

    // Update root item
    chrome.contextMenus.update("time-converter-root", {
      title: hasConversions ? "Copy Timestamp" : "No timestamp detected",
      enabled: hasConversions
    });

    // We need to clear old children and add new ones.
    // Since we can't easily "remove children", we'll track IDs or just blindly remove known indices.
    // To be safe, let's remove the root and recreate it with children? 
    // Or, remove all items and recreate.
    
    chrome.contextMenus.removeAll(() => {
        // Recreate root
        chrome.contextMenus.create({
            id: "time-converter-root",
            title: hasConversions ? "Copy Timestamp" : "No timestamp detected",
            contexts: ["all"],
            enabled: hasConversions
        });

        if (hasConversions) {
            currentConversions.forEach((item, index) => {
                chrome.contextMenus.create({
                    id: `time-convert-${index}`,
                    parentId: "time-converter-root",
                    title: `${item.zone}: ${item.time}`,
                    contexts: ["all"]
                });
            });
        }
    });
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId.startsWith('time-convert-')) {
    const index = parseInt(info.menuItemId.replace('time-convert-', ''), 10);
    const item = currentConversions[index];
    
    if (item && tab && tab.id) {
        // Send message back to content script to copy to clipboard
        // This ensures it works with the document focus
        chrome.tabs.sendMessage(tab.id, {
            type: 'COPY_TEXT',
            text: item.time
        });
    }
  }
});
