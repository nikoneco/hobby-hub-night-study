const lighting = document.querySelector("#lighting");
const openCatalog = document.querySelector("#open-catalog");
const catalog = document.querySelector("#catalog");
const room = document.querySelector(".room");
const roomLinks = document.querySelector(".room-links");
const destination = document.querySelector("#destination");
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
  if (room.dataset.view || !parallax.matches || !motion.matches) return;

  const bounds = room.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width - 0.5;
  const y = (event.clientY - bounds.top) / bounds.height - 0.5;
  room.style.setProperty("--room-x", `${(x * 12).toFixed(2)}px`);
  room.style.setProperty("--room-y", `${(y * 10).toFixed(2)}px`);
});

room.addEventListener("pointerleave", resetParallax);

roomLinks.addEventListener("click", (event) => {
  const pin = event.target.closest("button[data-stop]");
  if (!pin) return;

  previousPin = pin;
  const stop = pin.dataset.stop;
  const app = document.getElementById(`app-${stop}`);

  resetParallax();
  room.classList.remove("returns-to-wide");
  room.dataset.view = stop;
  roomLinks.inert = true;
  destinationTitle.textContent = pin.textContent.trim();
  destinationDescription.textContent = descriptions[stop];
  launch.href = app.href;
  destination.hidden = false;
  destinationTitle.focus({ preventScroll: true });

  if (smallScreen.matches) {
    room.scrollIntoView({ behavior: motion.matches ? "smooth" : "instant", block: "start" });
  }
});

function resetRoom() {
  room.classList.add("returns-to-wide");
  delete room.dataset.view;
  roomLinks.inert = false;
  destination.hidden = true;
  previousPin.focus({ preventScroll: true });
}

returnRoom.addEventListener("click", resetRoom);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && room.dataset.view && !catalog.open) resetRoom();
});
