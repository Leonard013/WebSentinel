# WebSentinel Privacy Policy

Effective date: August 31, 2026

WebSentinel has one purpose: monitor web pages selected by the user for content changes and show those changes in the browser.

## Information handled by the extension

WebSentinel handles only the information needed for that purpose:

- The titles, URLs, scan intervals, sensitivity settings, and status of pages the user explicitly adds.
- Page content fetched from those URLs so the extension can compare the current and previous versions.
- Extension preferences and backup files that the user explicitly exports or imports.

WebSentinel does not collect names, email addresses, payment information, authentication credentials, form data, or browsing history outside the pages the user explicitly adds. Page requests are made without browser cookies or HTTP authentication credentials.

## Storage and transmission

Page metadata is stored with the browser extension storage API. The browser may synchronize that metadata between the user's signed-in browser profiles according to the browser vendor's sync settings. Page snapshots are stored locally in IndexedDB on the user's device.

WebSentinel does not operate a developer server. It does not transmit page data to the developer, analytics providers, advertising networks, or other third parties. The only network requests initiated by WebSentinel are direct requests to the page URLs the user chooses to monitor. Displaying a saved page snapshot does not load the page's remote images, scripts, frames, stylesheets, or other subresources.

## Use and sharing

The information is used only to provide and improve WebSentinel's user-facing page-monitoring feature. It is not sold, used for advertising or credit decisions, or shared with third parties by the developer. Human access by the developer is not possible because the developer does not receive the information.

WebSentinel's use of information complies with the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Retention and user control

Information remains in browser storage until the user deletes a monitored page, restores or clears browser data, or uninstalls the extension. Users can export their page list as a JSON backup. Deleting a monitored page removes its metadata and locally stored page snapshots.

## Changes

Material changes to this policy will be reflected in this document and identified by a new effective date.

## Contact

Questions or privacy requests can be opened in the project's public issue tracker: <https://github.com/Leonard013/WebSentinel/issues>.
