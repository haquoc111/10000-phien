const express = require("express");
const axios = require("axios");

const app = express();

const PORT = process.env.PORT || 3000;

const API_BASE = "https://wtxmd52.tele68.com";

const JWT_TOKEN =
  "YOUR_JWT_TOKEN";

const ACCESS_TOKEN =
  "YOUR_ACCESS_TOKEN";

// ===== LƯU 10000 PHIÊN =====
const history = [];
const MAX_HISTORY = 10000;

// ===== HEADER =====
const headers = {
  Authorization: `Bearer ${JWT_TOKEN}`,
  accesstoken: ACCESS_TOKEN,
  "Content-Type": "application/json",
};

// ===== DANH SÁCH API THỬ =====
const endpoints = [
  "/api/webapi/GetNoaverageEmerdList",
  "/api/webapi/GetGameIssue",
  "/api/webapi/GetK3Issue",
  "/api/webapi/GetK3Trend",
  "/api/webapi/GetGameResult",
];

// ===== DỰ ĐOÁN =====
function predict() {
  let tai = 0;
  let xiu = 0;

  history.slice(0, 100).forEach((i) => {
    if (i.total >= 11) tai++;
    else xiu++;
  });

  return {
    prediction: tai >= xiu ? "TÀI" : "XỈU",
    tai,
    xiu,
  };
}

// ===== FETCH =====
async function fetchData() {
  for (const endpoint of endpoints) {
    try {
      const url = API_BASE + endpoint;

      console.log("Đang thử:", url);

      const res = await axios.get(url, {
        headers,
      });

      const data = res.data;

      console.log("SUCCESS:", endpoint);

      if (!data) continue;

      const list =
        data?.data?.list ||
        data?.list ||
        data?.data ||
        [];

      if (!Array.isArray(list)) continue;

      list.forEach((item) => {
        const issue =
          item.issueNumber ||
          item.issue ||
          item.gameId ||
          Date.now();

        const exists = history.find(
          (x) => x.issue === issue
        );

        if (!exists) {
          const n1 = Number(item.n1 || item.num1 || 1);
          const n2 = Number(item.n2 || item.num2 || 1);
          const n3 = Number(item.n3 || item.num3 || 1);

          const total = n1 + n2 + n3;

          history.unshift({
            issue,
            n1,
            n2,
            n3,
            total,
            result: total >= 11 ? "TÀI" : "XỈU",
            time: Date.now(),
          });

          console.log(
            `Phiên ${issue} | ${total}`
          );
        }
      });

      if (history.length > MAX_HISTORY) {
        history.splice(MAX_HISTORY);
      }

      return;
    } catch (err) {
      console.log(
        "FAIL:",
        endpoint,
        err.response?.status || err.message
      );
    }
  }
}

// ===== AUTO =====
setInterval(fetchData, 3000);

fetchData();

// ===== HOME =====
app.get("/", (req, res) => {
  const p = predict();

  res.json({
    status: "running",
    total: history.length,
    prediction: p.prediction,
    tai: p.tai,
    xiu: p.xiu,
    latest: history[0] || null,
  });
});

// ===== ALL =====
app.get("/all", (req, res) => {
  res.json(history);
});

// ===== START =====
app.listen(PORT, () => {
  console.log("Server running:", PORT);
});