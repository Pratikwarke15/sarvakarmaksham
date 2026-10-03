// @ts-nocheck
// PWA Notification Click Handler for OS Notification Bar
// This file is compiled separately as a service worker.

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var urlToOpen = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ("focus" in client) {
          if (client.url && (client.url.includes(urlToOpen) || urlToOpen === "/")) {
            return client.focus();
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener("notificationclose", function () {
  // Notification dismissed by user
});
