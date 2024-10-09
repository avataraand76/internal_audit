// frontend/src/data/api.js
let API_URL = "";

if (window.location.hostname === "localhost") {
  API_URL = "http://localhost:8081"; // localhost
} else if (window.location.hostname === "192.168.1.60") {
  API_URL = "http://192.168.1.60:8081"; // for mobile test cty
}
// else {
//   API_URL = "http://192.168.1.167:8081"; // for mobile test personal
// }

export default API_URL;
