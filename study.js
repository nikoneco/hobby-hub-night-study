const lighting = document.querySelector("#lighting");
const openCatalog = document.querySelector("#open-catalog");
const catalog = document.querySelector("#catalog");
const room = document.querySelector(".room");
const roomLinks = document.querySelector(".room-links");
const bookshelfCamera = room.querySelector(".bookshelf-camera");
const bookshelfArrival = room.querySelector(".bookshelf-arrival");
const bookshelfArt = [...room.querySelectorAll(".bookshelf-camera img, .bookshelf-lamp img")];
const stopCamera = room.querySelector(".stop-camera");
const destination = document.querySelector("#destination");
const destinationContent = destination.querySelector(".destination-content");
const destinationTitle = document.querySelector("#destination-title");
const destinationDescription = document.querySelector("#destination-description");
const destinationApps = document.querySelector("#destination-apps");
const launch = document.querySelector("#destination-launch");
const returnRoom = document.querySelector("#return-room");
const motion = matchMedia("(prefers-reduced-motion: no-preference)");
const parallax = matchMedia("(hover: hover) and (pointer: fine)");
const smallScreen = matchMedia("(max-width: 780px)");

const stops = {
  bookshelf: {
    description: "蔵書や資料を、棚を眺めるように探せる自分だけの図書館。",
    apps: ["app-bookshelf"]
  },
  games: {
    description: "矢印のパズルや数独で、ひと休み。",
    apps: ["app-arrow-journey", "app-sudoku"]
  },
  aviation: {
    description: "737-800の問題や学習ノートを探して、理解を深める。",
    apps: ["app-aviation"]
  },
  terminal: {
    description: "交通と天気の確認、家計の記録、今夜のお店探し。",
    apps: ["app-terminal", "app-budget", "app-izakaya"]
  },
  window: {
    description: "地図で月や星の位置を調べて、撮影場所と時間を決める。",
    apps: ["app-window"]
  }
};

const stopArt = new Map();
let previousPin;
let activeScene;

lighting.addEventListener("click", () => {
  const isDimmed = document.body.classList.toggle("dimmed");
  lighting.setAttribute("aria-pressed", String(!isDimmed));
});

openCatalog.addEventListener("click", () => catalog.showModal());

catalog.addEventListener("click", (event) => {
  if (event.target !== catalog) return;

  const bounds = catalog.getBoundingClientRect();
  const inside = event.clientX >= bounds.left && event.clientX <= bounds.right
    && event.clientY >= bounds.top && event.clientY <= bounds.bottom;

  if (!inside) catalog.close();
});

function resetParallax() {
  room.style.removeProperty("--room-x");
  room.style.removeProperty("--room-y");
}

room.addEventListener("pointermove", (event) => {
  if (roomLinks.inert || !parallax.matches || !motion.matches) return;

  const bounds = room.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width - 0.5;
  const y = (event.clientY - bounds.top) / bounds.height - 0.5;
  room.style.setProperty("--room-x", `${(x * 12).toFixed(2)}px`);
  room.style.setProperty("--room-y", `${(y * 10).toFixed(2)}px`);
});

room.addEventListener("pointerleave", resetParallax);

function isLoaded(image) {
  return image.complete && image.naturalWidth > 0;
}

function hasFailed(image) {
  return image.complete && image.naturalWidth === 0;
}

function showDestinationContent() {
  destinationContent.inert = false;

  if (document.activeElement === returnRoom) destinationTitle.focus({ preventScroll: true });
}

function finishTravel(scene) {
  scene.travel = undefined;
  room.dataset[scene.state] = "arrived";
  showDestinationContent();
}

function openScene(scene, allowTravel) {
  room.dataset.view = scene.stop;
  if (!isLoaded(scene.arrival)) return false;

  if (scene.camera === stopCamera) stopCamera.replaceChildren(scene.arrival);
  room.dataset[scene.state] = "arrived";
  if (!allowTravel) return false;

  room.dataset[scene.state] = "moving";
  const travel = scene.camera.getAnimations().find(({ animationName }) => animationName === scene.animation);
  if (!travel) {
    room.dataset[scene.state] = "arrived";
    return false;
  }

  scene.travel = travel;
  travel.finished.then(() => {
    if (activeScene === scene && scene.travel === travel) finishTravel(scene);
  }, () => {
    // Returning to the room cancels the animation.
  });
  return true;
}

function shouldWaitForArt(scene, ready) {
  return !ready && (motion.matches || scene.stop !== "bookshelf") && !scene.art.some(hasFailed);
}

function continueSceneWait(scene, timedOut = false) {
  if (!scene || activeScene !== scene || scene.wait === undefined) return;

  const ready = scene.art.every(isLoaded);
  if (!timedOut && shouldWaitForArt(scene, ready)) return;

  clearTimeout(scene.wait);
  scene.wait = undefined;
  if (!openScene(scene, !timedOut && motion.matches && ready)) showDestinationContent();
}

function watchArt(image) {
  const onArtSettled = () => continueSceneWait(activeScene);
  image.addEventListener("load", onArtSettled);
  image.addEventListener("error", onArtSettled);
}

function loadStopArt(stop) {
  const cached = stopArt.get(stop);
  if (cached && !hasFailed(cached)) return cached;

  const arrival = new Image(1448, 1086);
  arrival.alt = "";
  watchArt(arrival);
  arrival.src = `${stop}-arrival.webp`;
  stopArt.set(stop, arrival);
  return arrival;
}

function selectScene(stop) {
  const isBookshelf = stop === "bookshelf";
  const arrival = isBookshelf ? bookshelfArrival : loadStopArt(stop);
  const scene = {
    stop,
    arrival,
    art: isBookshelf ? bookshelfArt : [arrival],
    camera: isBookshelf ? bookshelfCamera : stopCamera,
    state: isBookshelf ? "bookshelfScene" : "arrivalScene",
    animation: isBookshelf ? "bookshelf-arrival" : "stop-arrival"
  };
  activeScene = scene;

  const ready = scene.art.every(isLoaded);
  if (!shouldWaitForArt(scene, ready)) return openScene(scene, motion.matches && ready);

  scene.wait = setTimeout(() => continueSceneWait(scene, true), 2500);
  return true;
}

bookshelfArt.forEach(watchArt);

motion.addEventListener("change", () => {
  if (motion.matches) return;
  if (activeScene?.travel) finishTravel(activeScene);
  continueSceneWait(activeScene);
});

function updateDestination(pin, stop) {
  const { description, apps } = stops[stop];
  const appLinks = apps.map((id) => document.getElementById(id));
  const isGroup = appLinks.length > 1;
  destinationTitle.textContent = pin.textContent.trim();
  destinationDescription.textContent = description;
  launch.hidden = isGroup;
  destinationApps.hidden = !isGroup;

  if (isGroup) {
    const items = appLinks.map((app) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = app.href;
      link.textContent = app.querySelector("strong").textContent;
      item.append(link);
      return item;
    });
    destinationApps.replaceChildren(...items);
  } else {
    launch.href = appLinks[0].href;
  }
}

roomLinks.addEventListener("click", (event) => {
  const pin = event.target.closest("button[data-stop]");
  if (!pin || roomLinks.inert) return;

  previousPin = pin;
  const stop = pin.dataset.stop;

  resetParallax();
  room.classList.remove("returns-to-wide");
  roomLinks.inert = true;
  updateDestination(pin, stop);

  const waitingForScene = selectScene(stop);
  destinationContent.inert = waitingForScene;
  destination.hidden = false;
  (waitingForScene ? returnRoom : destinationTitle).focus({ preventScroll: true });

  if (smallScreen.matches) {
    room.scrollIntoView({ behavior: motion.matches ? "smooth" : "instant", block: "start" });
  }
});

function resetRoom() {
  clearTimeout(activeScene?.wait);
  activeScene?.travel?.cancel();
  activeScene = undefined;
  room.classList.add("returns-to-wide");
  delete room.dataset.bookshelfScene;
  delete room.dataset.arrivalScene;
  delete room.dataset.view;
  roomLinks.inert = false;
  destination.hidden = true;
  previousPin.focus({ preventScroll: true });
}

returnRoom.addEventListener("click", resetRoom);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && roomLinks.inert && !catalog.open) resetRoom();
});
