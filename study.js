const lighting = document.querySelector("#lighting");
const openCatalog = document.querySelector("#open-catalog");
const catalog = document.querySelector("#catalog");
const room = document.querySelector(".room");
const roomLinks = document.querySelector(".room-links");
const bookshelfCamera = room.querySelector(".bookshelf-camera");
const bookshelfArrival = room.querySelector(".bookshelf-arrival");
const bookshelfArt = [...room.querySelectorAll(".bookshelf-camera img, .bookshelf-lamp img")];
const destination = document.querySelector("#destination");
const destinationContent = destination.querySelector(".destination-content");
const destinationTitle = document.querySelector("#destination-title");
const destinationDescription = document.querySelector("#destination-description");
const launch = document.querySelector("#destination-launch");
const returnRoom = document.querySelector("#return-room");
const motion = matchMedia("(prefers-reduced-motion: no-preference)");
const parallax = matchMedia("(hover: hover) and (pointer: fine)");
const smallScreen = matchMedia("(max-width: 780px)");

const descriptions = {
  bookshelf: "蔵書や資料を、棚を眺めるように探せる自分だけの図書館。",
  terminal: "朝のバス、天気、電車の運行状況をひとつの画面で確認。",
  window: "地図で月や星の位置を調べて、撮影場所と時間を決める。"
};

let previousPin;
let bookshelfTravel;
let bookshelfWait;

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

function finishBookshelfTravel() {
  bookshelfTravel = undefined;
  room.dataset.bookshelfScene = "arrived";
  showDestinationContent();
}

function openBookshelfScene(allowTravel) {
  room.dataset.view = "bookshelf";
  if (!isLoaded(bookshelfArrival)) return false;

  room.dataset.bookshelfScene = "arrived";
  if (!allowTravel) return false;

  room.dataset.bookshelfScene = "moving";
  const travel = bookshelfCamera.getAnimations().find(({ animationName }) => animationName === "bookshelf-arrival");
  if (!travel) {
    room.dataset.bookshelfScene = "arrived";
    return false;
  }

  bookshelfTravel = travel;
  travel.finished.then(() => {
    if (bookshelfTravel === travel) finishBookshelfTravel();
  }, () => {
    // Returning to the room cancels the animation.
  });
  return true;
}

function clearBookshelfWait() {
  clearTimeout(bookshelfWait);
  bookshelfWait = undefined;
}

function continueBookshelfWait(timedOut = false) {
  if (bookshelfWait === undefined) return;

  const ready = bookshelfArt.every(isLoaded);
  if (!timedOut && motion.matches && !ready && !bookshelfArt.some(hasFailed)) return;

  clearBookshelfWait();
  if (!openBookshelfScene(!timedOut && motion.matches && ready)) showDestinationContent();
}

function selectBookshelf() {
  const ready = bookshelfArt.every(isLoaded);
  if (!motion.matches || ready || bookshelfArt.some(hasFailed)) {
    return openBookshelfScene(motion.matches && ready);
  }

  const wait = setTimeout(() => {
    if (bookshelfWait === wait) continueBookshelfWait(true);
  }, 2500);
  bookshelfWait = wait;
  return true;
}

for (const image of bookshelfArt) {
  image.addEventListener("load", () => continueBookshelfWait());
  image.addEventListener("error", () => continueBookshelfWait());
}

motion.addEventListener("change", () => {
  if (motion.matches) return;
  if (bookshelfTravel) finishBookshelfTravel();
  continueBookshelfWait();
});

roomLinks.addEventListener("click", (event) => {
  const pin = event.target.closest("button[data-stop]");
  if (!pin || roomLinks.inert) return;

  previousPin = pin;
  const stop = pin.dataset.stop;
  const app = document.getElementById(`app-${stop}`);

  resetParallax();
  room.classList.remove("returns-to-wide");
  roomLinks.inert = true;
  destinationTitle.textContent = pin.textContent.trim();
  destinationDescription.textContent = descriptions[stop];
  launch.href = app.href;
  destination.dataset.stop = stop;

  if (stop !== "bookshelf") room.dataset.view = stop;
  const waitingForBookshelf = stop === "bookshelf" && selectBookshelf();
  destinationContent.inert = waitingForBookshelf;
  destination.hidden = false;
  (waitingForBookshelf ? returnRoom : destinationTitle).focus({ preventScroll: true });

  if (smallScreen.matches) {
    room.scrollIntoView({ behavior: motion.matches ? "smooth" : "instant", block: "start" });
  }
});

function resetRoom() {
  clearBookshelfWait();
  bookshelfTravel?.cancel();
  bookshelfTravel = undefined;
  room.classList.add("returns-to-wide");
  delete room.dataset.bookshelfScene;
  delete room.dataset.view;
  roomLinks.inert = false;
  destination.hidden = true;
  previousPin.focus({ preventScroll: true });
}

returnRoom.addEventListener("click", resetRoom);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && roomLinks.inert && !catalog.open) resetRoom();
});
