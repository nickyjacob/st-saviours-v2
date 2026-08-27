self.addEventListener('push', function (event) {
  if (!event.data) return

  const data = event.data.json()

  const title = data.title || 'St. Saviours GAA & LGFA'
  const options = {
    body: data.body || '',
    icon: '/crest.png',
    badge: '/crest.png',
    data: {
      url: data.url || '/',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(clients.openWindow(url))
})