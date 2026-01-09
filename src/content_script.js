const { DateTime } = require('luxon');

// --- Configuration ---
const DEBOUNCE_DELAY = 300;

// List of Regex patterns to try. Order matters (most specific to least specific).
const TIME_PATTERNS = [
  // 0. YYYY-MM-DD H:mm:ss AM/PM (e.g. 2026-01-09 2:58:42 AM)
  // Needs to be before generic ISO to capture AM/PM correctly.
  // Expanded to support optional offset (e.g. 2026-01-09 10:58:42 AM +0800)
  /(\d{4}-\d{2}-\d{2}\s\d{1,2}:\d{2}:\d{2}\s?[AP]M(?:\s?[+-]\d{4})?)/g,

  // 0a. MonthName DD, YYYY at H:mm AM/PM (e.g. November 6, 2025 at 4:59 PM)
  /([A-Z][a-z]+\s\d{1,2},\s\d{4}\sat\s\d{1,2}:\d{2}\s?[AP]M)/g,

  // 1. User's specific format: YYYY-MM-DD HH:mm:ss ZZZ (e.g. 2026-01-08 00:49:28 PST)
  // Expanded to optionally allow numeric offsets or just Z
  /(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}(?:\s?[A-Z]{3,4}|[+-]\d{4}|Z)?)/g,

  // 2. ISO-8601: YYYY-MM-DDTHH:mm:ss.sssZ (e.g. 2026-01-08T00:49:28Z)
  // Matches T separator, optional millis, optional Z or offset
  /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)/g,

  // 3. RFC 2822 / Common Email: Thu, 08 Jan 2026 00:49:28 +0000
  /([A-Z][a-z]{2},\s\d{1,2}\s[A-Z][a-z]{2}\s\d{4}\s\d{2}:\d{2}:\d{2}\s[+-]\d{4})/g,
  
  // 4. US Slash format with time: MM/DD/YYYY HH:mm:ss (e.g. 01/08/2026 14:30)
  /(\d{1,2}\/\d{1,2}\/\d{4}\s\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)/g,
  
  // 5. Short ISO (no seconds): YYYY-MM-DD HH:mm
  /(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2})/g
];

// Defaults
let TARGET_ZONES = ['local', 'UTC', 'America/New_York'];

// --- State ---
let debounceTimer = null;
let currentTooltip = null;

// --- Storage Sync ---
// Load initial settings
if (chrome && chrome.storage) {
    chrome.storage.sync.get({ targetTimezones: TARGET_ZONES }, (items) => {
        TARGET_ZONES = items.targetTimezones;
    });

    // Listen for changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes.targetTimezones) {
            TARGET_ZONES = changes.targetTimezones.newValue;
        }
    });
}

// --- Helpers ---

/**
 * Gets the text node and offset at the given coordinates
 */
function getCaretFromPoint(x, y) {
  if (document.caretPositionFromPoint) {
    return document.caretPositionFromPoint(x, y);
  } else if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(x, y);
    return {
      offsetNode: range.startContainer,
      offset: range.startOffset
    };
  }
  return null;
}

/**
 * Expands the selection around the cursor to find a potential date string.
 * Iterates through all defined TIME_PATTERNS.
 */
function extractTimeContext(node, offset) {
  if (node.nodeType !== Node.TEXT_NODE) return null;
  
  const text = node.textContent;

  for (const regex of TIME_PATTERNS) {
    // Reset regex lastIndex to ensure we start from 0 for global regexes
    regex.lastIndex = 0;
    
    let match;
    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      
      // Check if cursor (offset) is within or very close to this match
      // We give a 1-char buffer so hovering right at the edge works
      if (offset >= start - 1 && offset <= end + 1) {
        // Validation: Try to parse it immediately to ensure it's valid
        // This prevents "2026-99-99" from triggering
        const isValid = validateDate(match[0]);
        if (isValid) {
            return match[0];
        }
      }
    }
  }
  return null;
}

function validateDate(dateString) {
    // Pre-process similar to convertTime to ensure validation passes for formats like "at"
    let parseableString = dateString;
    if (/\sat\s/.test(dateString)) {
        parseableString = dateString.replace(/\sat\s/, ' ');
    }
    const d = new Date(parseableString);
    return !isNaN(d.getTime());
}

/**
 * Parses the string and converts it to target zones.
 * Relies on Browser's native Date parsing for abbreviations like PST/PDT which V8 handles well,
 * then uses Luxon for formatting.
 */
function convertTime(timeString) {
  // Pre-process: "at" is not handled by JS Date constructor for "Month DD, YYYY at HH:MM"
  // We simply remove "at " to make it "Month DD, YYYY HH:MM" which is valid.
  let parseableString = timeString;
  if (/\sat\s/.test(timeString)) {
      parseableString = timeString.replace(/\sat\s/, ' ');
  }

  // 1. Parse using native Date (Chrome V8 handles "2026-01-08 00:49:28 PST" well)
  const dateObj = new Date(parseableString);
  
  // Validate
  if (isNaN(dateObj.getTime())) {
    return null;
  }

  // 2. Wrap in Luxon
  const dt = DateTime.fromJSDate(dateObj);

  // 3. Convert to targets
  const results = TARGET_ZONES.map(zone => {
    let converted;
    if (zone === 'local') {
      converted = dt.toLocal();
    } else {
      converted = dt.setZone(zone);
    }
    
    return {
      zone: zone === 'local' ? 'Local' : zone,
      time: converted.toFormat('yyyy-MM-dd HH:mm:ss ZZZZ')
    };
  });

  return results;
}

// --- Core Logic ---

function handleMouseMove(e) {
  // Clear existing timer
  if (debounceTimer) clearTimeout(debounceTimer);
  
  // We don't immediately hide the tooltip to prevent flickering if moving strictly within the same text
  // But for simplicity, let's debounce the check.
  
  debounceTimer = setTimeout(() => {
    // If hovering over the tooltip itself, do nothing
    if (e.target && currentTooltip && currentTooltip.contains(e.target)) return;

    const result = getCaretFromPoint(e.clientX, e.clientY);
    if (!result || !result.offsetNode) {
        removeTooltip();
        return;
    }

    const timeString = extractTimeContext(result.offsetNode, result.offset);
    
    if (timeString) {
      const conversions = convertTime(timeString);
      if (conversions) {
        showTooltip(timeString, conversions, e.clientX, e.clientY);
        return; // Success, don't remove tooltip
      }
    }
    
    // If we reached here, no valid time was found
    removeTooltip();
  }, DEBOUNCE_DELAY);
}

// --- UI ---

function showTooltip(originalText, conversions, x, y) {
  if (currentTooltip) removeTooltip();
  
  const div = document.createElement('div');
  
  // Inline styles for isolation
  div.style.cssText = `
    position: fixed;
    top: ${y + 20}px;
    left: ${x}px;
    background: #222;
    color: #fff;
    padding: 12px;
    border-radius: 6px;
    z-index: 2147483647; /* Max Z-Index */
    pointer-events: none;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 13px;
    line-height: 1.4;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border: 1px solid #444;
    min-width: 250px;
  `;

  // Header
  const header = document.createElement('div');
  header.style.marginBottom = '8px';
  header.style.color = '#aaa';
  header.style.fontSize = '11px';
  header.style.borderBottom = '1px solid #444';
  header.style.paddingBottom = '4px';
  header.innerText = `Detected: ${originalText}`;
  div.appendChild(header);

  // List
  conversions.forEach(item => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.marginBottom = '4px';
    
    const zoneSpan = document.createElement('span');
    zoneSpan.style.fontWeight = 'bold';
    zoneSpan.style.color = '#4da6ff'; // Light blue
    zoneSpan.style.marginRight = '12px';
    zoneSpan.innerText = item.zone;

    const timeSpan = document.createElement('span');
    timeSpan.innerText = item.time;

    row.appendChild(zoneSpan);
    row.appendChild(timeSpan);
    div.appendChild(row);
  });
  
  document.body.appendChild(div);
  currentTooltip = div;
  
  // Basic boundary check to keep it on screen
  const rect = div.getBoundingClientRect();
  if (rect.right > window.innerWidth) {
      div.style.left = `${window.innerWidth - rect.width - 20}px`;
  }
  if (rect.bottom > window.innerHeight) {
      div.style.top = `${y - rect.height - 10}px`;
  }
}

function removeTooltip() {
  if (currentTooltip) {
    currentTooltip.remove();
    currentTooltip = null;
  }
}

// --- Initialization ---
document.addEventListener('mousemove', handleMouseMove);
