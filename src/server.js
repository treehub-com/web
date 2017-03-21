self.importScripts('store.js');
self.importScripts('jszip.js');
self.importScripts('level.js');

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
      console.log(error);
      self.postMessage(JSON.stringify({
        id: request.id,
        status: error.status || 500,
        body: JSON.stringify({message: error.message}),
      }));
    })
}

self.store.getPackages()
  .then(packages => {
    const promises = [];
    for (const pkg of Object.keys(packages)) {
      if (packages[pkg].route !== undefined) {
        promises.push(loadRoute(pkg, packages[pkg].route));
      }
    }
    return Promise.all(promises);
  })
  .then(() => {
    self.postMessage(JSON.stringify({id: 'STARTED'}));
  })
  .catch((error) => {
    console.error(error);
  });

async function loadRoute(pkg, file) {
  // Normalize filepath to remove ./
  // TODO
  const code = await self.store.getFile(`/${pkg}/${file}`);
  const exported = {};
  try {
    eval(`((module) => {${code}})(exported)`);
  } catch (error) {
    console.error(`Error loading route for ${pkg}`);
    console.error(error);
    return;
  }
  if (typeof exported.exports !== 'function') {
    console.error(`Could not load route for ${pkg}`);
    return;
  }
  routes[pkg] = await exported.exports({
    LevelUpBackend: LevelJS,
    pathPrefix: pkg + '/',
  });
}

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
  // Get the package
  const response = await fetch(`https://packages.treehub.com/${name}/${version}.zip`);
  if (response.status !== 200) {
    const error = new Error('Package Not Found');
    error.status = 500;
    throw error;
  }
  const body = await response.arrayBuffer();

  // Load the zip file
  const contents = await JSZip.loadAsync(body);

  // Get treehub.json
  const json = await contents.file('treehub.json').async('string');
  const pkg = JSON.parse(json);
  if (name !== pkg.name) {
    const error = new Error(`name mismatch: ${name} vs ${pkg.name}`);
    error.status = 500;
    throw error;
  }

  // Save package files
  const promises = [];
  contents.forEach((fileName, file) => {
    promises.push(writePackageFile(name, fileName, file));
  });
  await Promise.all(promises);

  // Add package version
  await store.addPackage(name, pkg.version);

  return true;
};

async function uninstallPackage({name}) {
  console.log(`uninstalling package ${name}`);
  return true;
};

async function writePackageFile(pkg, fileName, file) {
  const contents = await file.async("string");
  await store.addFile(`/${pkg}/${fileName}`, contents);
}
