const cursor = document.querySelector(".cursor");
const searchBar = document.querySelector(".map-search");

//app styles
document.addEventListener("mousemove", function (e) {
  // console.log(e.clientX);
  cursor.classList.add("cursor-active");
  cursor.style.top = `${e.clientY}px`;
  cursor.style.left = `${e.clientX}px`;
});

document.addEventListener("mouseleave", function (e) {
  cursor.classList.remove("cursor-active");
});

searchBar.addEventListener("mouseover", function (e) {
  cursor.classList.add("cursor-input");
});

searchBar.addEventListener("mouseleave", function (e) {
  cursor.classList.remove("cursor-input");
});
