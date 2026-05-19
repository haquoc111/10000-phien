const express = require("express");
const axios = require("axios");

const app = express();

const PORT = process.env.PORT || 3000;

// ================= CONFIG =================

const API_BASE = "https://wtxmd52.tele68.com";

const JWT_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb2RlIjowLCJtZXNzYWdlIjoiU3VjY2VzcyIsIm5pY2tOYW1lIjoic2hvcHRvb2x0YWl4aXUiLCJhY2Nlc3NUb2tlbiI6ImM0ZDAyOGM3YmQ2MDUzZmNlOTIxZDA1MjdiNzQyNzc3IiwiaXNMb2dpbiI6dHJ1ZSwibW9uZXkiOjc5LCJpZCI6IjgwMTgxMDIiLCJ1c2VybmFtZSI6InZpZXQxMjExMSIsImlhdCI6MTc3OTE5MjQ1OCwiZXhwIjoxNzc5MjIxMjU4fQ.C_8SYvqM3RgRvW20mp7cLfpgXoh4yDAs3tH-9RCmvTE";

const ACCESS_TOKEN =
  "c4d028c7bd6053fce921d0527b742777";

// ================= STORAGE =================

const history = [];
const MAX_HISTORY = 10000;

// ================= HEADERS =================

const headers = {
  Authorization: `Bearer ${JWT_TOKEN}`,
  accesstoken: ACCESS_TOKEN,
  "Content-Type": "application/json",
};

// ================= PREDICT =================

function predict() {
  let tai = 0;
  let xiu = 0;

  history.slice(0, 100).forEach((item) => {
    if (item.total >= 11) tai++;
    else xiu++;
  });

  return {
    prediction: tai >= xiu ? "TÀI" : "XỈU",
    tai,
    xiu,
  };
}

// ================= FETCH DATA =================

async function fetchData() {
  try {
    const url =
      API_BASE + "/api/webapi/GetNoaverageEmerdList";

    const response = await axios.post(
      url,
      {
        pageSize: 10,
        pageNo: 1,
        typeId: 1,
        language: 0,
      },
      {
        headers,
      }
    );

    const raw = response.data;

    console.log("RAW:");
    console.log(JSON.stringify(raw));

    const list =
      raw?.data?.list ||
      raw?.data ||
      raw?.list ||
      [];

    if (!Array.isArray(list)) {
      console.log("Không có list");
      return;
    }

    list.forEach((item) => {
      const issue =
        item.issueNumber ||
        item.issue ||
        item.expect ||
        item.gameId;

      if (!issue) return;

      const exists = history.find(
        (x) => x.issue === issue
      );

      if (exists) return;

      const code =
        item.openCode ||
        item.opencode ||
        item.number ||
        "1,1,1";

      const split = code
        .toString()
        .split(",");

      const n1 = Number(split[0]) || 1;
      const n2 = Number(split[1]) || 1;
      const n3 = Number(split[2]) || 1;

      const total = n1 + n2 + n3;

      history.unshift({
        issue,
        dice: [n1, n2, n3],
        total,
        result: total >= 11 ? "TÀI" : "XỈU",
        time: Date.now(),
      });

      console.log(
        `NEW: ${issue} | ${n1}-${n2}-${n3} | ${total}`
      );
    });

    // ===== GIỮ 10000 PHIÊN =====

    if (history.length > MAX_HISTORY) {
      history.splice(MAX_HISTORY);
    }
  } catch (err) {
    console.log("ERROR:");

    if (err.response) {
      console.log(err.response.status);
      console.log(err.response.data);
    } else {
      console.log(err.message);
    }
  }
}

// ================= AUTO RUN =================

setInterval(fetchData, 3000);

fetchData();

// ================= ROUTES =================

app.get("/", (req, res) => {
  const p = predict();

  res.json({
    status: "running",
    total: history.length,
    prediction: p.prediction,
    tai: p.tai,
    xiu: p.xiu,
    latest: history[0] || null,
    history: history.slice(0, 20),
  });
});

app.get("/all", (req, res) => {
  res.json({
    total: history.length,
    data: history,
  });
});

app.get("/check", (req, res) => {
  res.json({
    status: "online",
    api: API_BASE,
    total: history.length,
    last: history[0] || null,
  });
});

// ================= START =================

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});