/**
 * Notifications module - Show browser notifications for updates
 */

const NOTIFICATION_ID = 'pagewatch-update';

/**
 * Show a notification about page updates
 * @param {number} count - Number of updated pages
 */
export async function showUpdateNotification(count) {
  if (count === 0) return;

  const message = count === 1
    ? 'A webpage has been updated.'
    : `${count} webpages have been updated.`;

  await chrome.notifications.create(NOTIFICATION_ID, {
    type: 'basic',
    iconUrl: '/icons/icon-128.png',
    title: 'Page Watch',
    message: message,
    priority: 1
  });
}

/**
 * Set up notification click handler
 * @param {Function} onClick - Callback when notification is clicked
 */
export function onNotificationClick(onClick) {
  chrome.notifications.onClicked.addListener((id) => {
    if (id === NOTIFICATION_ID) {
      onClick();
      chrome.notifications.clear(id);
    }
  });
}
