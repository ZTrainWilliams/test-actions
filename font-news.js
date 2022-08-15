const request = require("request");
const cheerio = require("cheerio");
const path = require("path");
const fs = require("fs-extra");
const dayjs = require("dayjs");

const FONT_WECOM_WEBHOOK_KEY = process.argv[2];

const hasBeenSent = path.join(__dirname, "./hasBeenSent.json");

const webhook = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${FONT_WECOM_WEBHOOK_KEY}`;

// 前端咨询地址
const newsUrl = "https://front-end-rss.vercel.app";

//记录已经推送的最新列表
let hadSendData = [];

// 排序
const sortDate = (arr) => {
  return arr.sort((a, b) => {
    return a.date < b.date ? 1 : -1;
  });
};

const adsKeyWords = [
  "招聘",
  "月薪",
  "年薪",
  "跳槽",
  "面试",
  "春招",
  "秋招",
  "面经",
  "福利",
];
const hasAds = (title) => {
  return adsKeyWords.some((text) => title.indexOf(text) !== -1);
};

//读取处理需要推送数据
async function handleBody(body) {
  try {
    const day = dayjs();
    const rangeTime = [
      day.subtract(10, "day").format("YYYY-MM-DD"),
      day.format("YYYY-MM-DD"),
    ];

    const $ = cheerio.load(body);
    const newsList = $("script");
    const regData = /LINKS_DATA[\s]*?=[\s]*?/;
    // eslint-disable-next-line no-useless-escape
    const reg = /[\;][\n]*[\s]*?$/; //去掉尾部分号
    let sendList = []; //存储推送列表

    newsList.map((item) => {
      //取数据LINKS_DATA变量值
      if (newsList[item].children[0]?.data.split(regData)?.[1]) {
        //格式化数据
        const jsonStr = newsList[item].children[0]?.data
          .split(regData)?.[1]
          .split(reg)[0];
        const jsonData = JSON.parse(jsonStr);
        // fs.writeJsonSync(newsDataPath, jsonData)
        jsonData.map((it) => {
          it.items.map((l) => {
            if (l.date >= rangeTime[0] && l.date <= rangeTime[1]) {
              l["source"] = it.title;
              sendList.push(l);
            }
          });
        });
      }
    });
    sendList = sortDate(sendList);
    //存在内存中就不读取文件
    if ((await fs.pathExists(hasBeenSent)) && hadSendData.length <= 0) {
      try {
        hadSendData = (await fs.readJson(hasBeenSent)) || [];
      } catch (error) {
        console.error(error);
      }
    }
    //过滤已发送或者日期相对较旧
    sendList = sendList.filter((item) => {
      let isExit = false;
      hadSendData.map((hs) => {
        if (
          (hs.title === item.title && hs.source === item.source) ||
          item.date < hs.date
        ) {
          isExit = true;
        }
      });
      if (hasAds(item.title)) {
        isExit = true;
      }
      return !isExit;
    });

    if (sendList.length > 0) {
      console.log("sendList", sendList);
      sendNews(sendList);
      hadSendData = [...sendList];
      fs.writeJsonSync(hasBeenSent, hadSendData);
    }
  } catch (error) {
    console.error(error);
  }
}

function getNews() {
  request.get(newsUrl, (err, res, body) => {
    console.log(err, res, body);
    if (!err && res.statusCode == 200) {
      handleBody(body);
    } else {
      console.error(err);
    }
  });
}

//推送数据格式化
function formatSendData(data) {
  let str = "# 前端资讯\n\n";
  data.map((item, index) => {
    str += `\n${index + 1}、[${item.title}](${
      item.link
    })    <font color="comment" >${item.date}  ${item.source}</font>\n\n`;
  });

  str += `\n[>>查看更多](${newsUrl})  `;

  return {
    msgtype: "markdown",
    markdown: {
      content: str,
    },
  };
}

//推送信息
function sendNews(data) {
  request.post(
    webhook,
    {
      body: JSON.stringify(formatSendData(data)),
      headers: {
        "Content-Type": "application/json",
      },
    },
    function (err, resp, body) {
      if (err) {
        console.error(err);
      }
    }
  );
}

getNews(FONT_WECOM_WEBHOOK_KEY);
