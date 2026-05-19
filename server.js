const express = require("express");
const axios = require("axios");

const app = express();

const PORT = process.env.PORT || 3000;

// ===== CONFIG =====
const API_BASE = "https://wtxmd52.tele68.com";

const JWT_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb2RlIjowLCJtZXNzYWdlIjoiU3VjY2VzcyIsIm5pY2tOYW1lIjoic2hvcHRvb2x0YWl4aXUiLCJhY2Nlc3NUb2tlbiI6ImM0ZDAyOGM3YmQ2MDUzZmNlOTIxZDA1MjdiNzQyNzc3IiwiaXNMb2dpbiI6dHJ1ZSwibW9uZXkiOjc5LCJpZCI6IjgwMTgxMDIiLCJ1c2VybmFtZSI6InZpZXQxMjExMSIsImlhdCI6MTc3OTE5MjQ1OCwiZXhwIjoxNzc5MjIxMjU4fQ.C_8SYvqM3RgRvW20mp7cLfpgXoh4yDAs3tH-9RCmvTE";

const ACCESS_TOKEN = "c4d028c7bd6053fce921d0527b742777";

// ===== LƯU 10000 PHIÊN =====
const history = [];
const MAX_HISTORY = 10000;

// ===== REQUEST HEADER =====
const headers = {
  Authorization: `Bearer ${JWT_TOKEN}`,
  accesstoken: ACCESS_TOKEN,
  "Content-Type": "application/json",
};

// ===== HÀM DỰ ĐOÁN =====
function predict(historyData) {
  if (!historyData.length) {
    return {
      prediction: "ĐANG PHÂN TÍCH",
      confidence: "0%",
    };
  }

  let tai = 0;
  let xiu = 0;

  historyData.slice(0, 100).forEach((item) => {
    if (item.total >= 11) tai++;
    else xiu++;
  });

  const prediction = tai >= xiu ? "TÀI" : "XỈU";

  const confidence = (
    (Math.max(tai, xiu) / (tai + xiu)) *
    100
  ).toFixed(2);

  return {
    prediction,
    confidence: confidence + "%",
    tai,
    xiu,
  };
}

// ===== LẤY DỮ LIỆU =====
async function fetchData() {
  try {
    const res = await axios.get(
      `${API_BASE}/api/webapi/GetNoaverageEmerdList`,
      {
        headers,
      }
    );

    const result = res.data;

    if (!result || !result.data || !result.data.list) {
      console.log("Không có dữ liệu");
      return;
    }

    const list = result.data.list;

    list.forEach((item) => {
      const exists = history.find(
        (x) => x.issueNumber === item.issueNumber
      );

      if (!exists) {
        const total =
          Number(item.n1) +
          Number(item.n2) +
          Number(item.n3);

        history.unshift({
          issueNumber: item.issueNumber,
          n1: item.n1,
          n2: item.n2,
          n3: item.n3,
          total,
          result: total >= 11 ? "TÀI" : "XỈU",
          time: Date.now(),
        });

        console.log(
          `Phiên ${item.issueNumber} | ${total} | ${
            total >= 11 ? "TÀI" : "XỈU"
          }`
        );
      }
    });

    // ===== GIỮ 10000 PHIÊN =====
    if (history.length > MAX_HISTORY) {
      history.splice(MAX_HISTORY);
    }
  } catch (err) {
    console.log("Lỗi:", err.message);
  }
}

// ===== AUTO UPDATE =====
setInterval(fetchData, 2000);

fetchData();

// ===== API CHÍNH =====
app.get("/", (req, res) => {
  const pred = predict(history);

  res.json({
    status: true,
    totalSession: history.length,
    prediction: pred.prediction,
    confidence: pred.confidence,
    tai: pred.tai,
    xiu: pred.xiu,
    latest: history[0] || null,
    history: history.slice(0, 50),
  });
});

// ===== FULL 10000 =====
app.get("/all", (req, res) => {
  res.json({
    total: history.length,
    data: history,
  });
});

// ===== CHECK =====
app.get("/check", (req, res) => {
  res.json({
    api: API_BASE,
    token: "ACTIVE",
    status: "RUNNING",
    total: history.length,
  });
});

// ===== START =====
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});