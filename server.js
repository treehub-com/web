self.importScripts('store.js');

self.onmessage = function(e) {
  const request = JSON.parse(e.data);
  console.log('request', request.id);

  postMessage(JSON.stringify({
    id: request.id,
    data: {
      status: 200,
      body: JSON.stringify({working: true}),
    }
  }));
}

console.log('server started');
