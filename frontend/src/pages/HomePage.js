// src/pages/HomePage.js
import React from "react";
import Header from "../components/Header";

function HomePage() {
  return (
    <div>
      <Header />
      <div>
        <h1>Chào mừng đến trang chủ!</h1>
        <p>Bạn đã đăng nhập thành công.</p>
      </div>
    </div>
  );
}

export default HomePage;
