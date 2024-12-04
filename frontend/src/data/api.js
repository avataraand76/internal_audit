// frontend/src/data/api.js
//////local host//////
let API_URL = "";

if (window.location.hostname === "localhost") {
  API_URL = "http://localhost:8081"; // localhost
} else if (window.location.hostname === "192.168.1.61") {
  API_URL = "http://192.168.1.61:8081"; // for mobile test cty
} else if (window.location.hostname === "192.168.1.167") {
  API_URL = "http://192.168.1.167:8081"; // for mobile test personal
}
//////local host//////

//////VLH//////
// let API_URL = "https://serverksnb.vietlonghung.com.vn";
//////VLH//////

//////CT//////
// let API_URL = "https://serverksnb.congtien.com.vn";
//////CT//////

export default API_URL;
