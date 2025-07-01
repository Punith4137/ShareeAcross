// js/main.js
function toggleInfo() {
  document.getElementById("info").classList.toggle("visible");
  document.getElementById("contact").classList.remove("visible");
}

function toggleContact() {
  document.getElementById("contact").classList.toggle("visible");
  document.getElementById("info").classList.remove("visible");
}
