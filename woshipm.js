const request = require("request");
const dayjs = require("dayjs");

const weworkKey = process.env.PRODUCT_MAN_WEBHOOK_KEY;
const webhook = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${weworkKey}`;
// 咨询地址
const newsUrl = "https://www.woshipm.com/api2/app/article/popular/daily";

// 排序
const sortDate = (arr) => {
  return arr.sort((a, b) => {
    return a.publishTime < b.publishTime ? 1 : -1;
  });
};

const adsKeyWords = [
  "招聘",
  "加薪",
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
    const rangeTime = [
      Date.now() - 10 * 24 * 60 * 60 * 1000,
      Date.now(),
    ];

    const newsList = [];
    let sendList = []; //存储推送列表
    body.map((item) => {
      let l = item.data
      // console.log(item)
      if (l && l.publishTime >= rangeTime[0] && l.publishTime <= rangeTime[1] && !hasAds(l.articleTitle)) {
        newsList.push(l)
      }
    })

    sendList = sortDate(newsList);

    if (sendList.length > 0) {
      sendNews(sendList.slice(0, 10));
    }
  } catch (error) {
    console.error(error);
  }
}

function getNews() {
  request.get(newsUrl, (err, res, body) => {
    const data = JSON.parse(body)
    if (!err && data.CODE == 200) {
      handleBody(data.RESULT);
    } else {
      console.error(err);
    }
  });
}

//推送数据格式化
function formatSendData(data) {
  let str = "# 人人都是产品经理\n\n";
  data.map((item, index) => {
    str += `\n${index + 1}、[${item.articleTitle}](https://www.woshipm.com/${item.type
      }/${item.id}.html)    <font color="comment" >${dayjs(item.publishTime).format('YYYY-MM-DD')}  ${item.articleAuthor}</font>\n\n`;
  });

  str += `\n[>>查看更多](https://www.woshipm.com/)  `;

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

getNews();
