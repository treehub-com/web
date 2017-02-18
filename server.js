self.importScripts('store.js');
self.importScripts('jszip.js');

const routes = {
  _: coreRoute,
};

self.onmessage = function(e) {
  const request = JSON.parse(e.data);

  const path = request.url.split('/').filter((s)=>s !== '');
  if (path.length === 0) {
    return self.postMessage(JSON.stringify({
      id: request.id,
      status: 404,
      body: JSON.stringify({message: 'No Route Specified'}),
    }));
  }

  const pkg = path.shift().toLowerCase();
  if (routes[pkg] === undefined) {
    return self.postMessage(JSON.stringify({
      id: request.id,
      status: 404,
      body: JSON.stringify({message: 'No Route for Package'}),
    }));
  }

  routes[pkg]({
    route: `/${path.join('/')}`,
    body: (request.body) ? JSON.parse(request.body) : {},
  })
    .then((body) => {
      self.postMessage(JSON.stringify({
        id: request.id,
        status: 200,
        body: JSON.stringify(body),
      }));
    })
    .catch((error) => {
      self.postMessage(JSON.stringify({
        id: request.id,
        status: error.status || 500,
        body: JSON.stringify({message: error.message}),
      }));
    })
}

self.postMessage(JSON.stringify({id: 'STARTED'}));

async function coreRoute({route, body}) {
  switch(route) {
    case '/package/install':
      return installPackage(body);
    case '/package/uninstall':
      return uninstallPackage(body);
    default:
      const error = new Error('Unknown Route');
      error.status = 404;
      throw error;
  }
}

async function installPackage({name, version = 'latest'}) {
  console.log(`installing package ${name}:${version}`);
  return true;
};

async function uninstallPackage({name}) {
  console.log(`uninstalling package ${name}`);
  return true;
};
