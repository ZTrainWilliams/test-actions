const request = require("request");
const dayjs = require("dayjs");
const cheerio = require("cheerio");

const weworkKey = process.env.PRODUCT_MAN_WEBHOOK_KEY;
const webhook = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${weworkKey}`;
// 咨询地址
const productNewsUrl = "https://www.woshipm.com/api2/app/article/popular/daily";
const yunyingUrl = "https://www.yunyingpai.com/";
const csdnBlogUrl =
  "https://blog.csdn.net/phoenix/web/blog/hot-rank?page=0&pageSize=25&type=";
const frontNewsUrl = "https://front-end-rss.vercel.app";
const testUtl = "https://blog.csdn.net/nav/test";
const krUrl36 = "https://36kr.com/";

// 排序
const sortDate = (arr) => {
  return arr.sort((a, b) => {
    return a.time < b.time ? 1 : -1;
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
  "offer",
  "工资",
];
const hasAds = (title) => {
  return title && adsKeyWords.some((text) => title.indexOf(text) !== -1);
};

const curDate = dayjs().format("YYYY-MM-DD");
let sliceIndex = 3; //文章数量

const getNews = () => {
  const promiseAll = Promise.all([
    getProductNews(),
    getYunyingNews(),
//     getCsdnBlogNews(),
    getFrontNews(),
    getTestNews(),
  ]);
  promiseAll
    .then((res) => {
      console.log('res', JSON.stringify(res))
      sendNews(res);
    })
    .catch((err) => {
      console.log(err);
    });
};

function getTradeNews() {
  return new Promise((resolve, reject) => {
    request.get(krUrl36, (err, res, body) => {
      if (!err) {
        const $ = cheerio.load(body);
        const newsDom = $(".kr-home-flow-list");
        const newList = [];
        newsDom[0].children.forEach((item) => {
          const dom = $(item);
          const title = dom.find(".article-item-title").text();
          title &&
            !hasAds(title) &&
            newList.push({
              type: "36kr",
              time: dom.find(".kr-flow-bar-time").text(),
              title: dom.find(".article-item-title").text(),
              link: dom.find(".article-item-title").attr("href"),
              description: dom.find(".article-item-description").text(),
              them: dom.find(".kr-flow-bar-motif").text(),
              articleAuthor: dom.find(".kr-flow-bar-motif a").text(),
            });
        });
        const result = {
          title: "行业",
          type: "trade",
          list: sortDate(newList).slice(0, sliceIndex),
        };
        resolve(result);
      } else {
        reject(null);
        console.error(err);
      }
    });
  });
}

// 获取产品咨询
function getProductNews() {
  return new Promise((resolve, reject) => {
    request.get(productNewsUrl, (err, res, body) => {
      console.log('getProductNews-body', body)
      const data = JSON.parse(body);
      if (!err && data.CODE == 200) {
        const result = [];
        data.RESULT.forEach((o) => {
          const item = o.data;
          if (item && !hasAds(item.articleTitle)) {
            result.push({
              type: "woshipm",
              time: dayjs(item.publishTime).format("YYYY-MM-DD"),
              title: item.articleTitle,
              link: `https://www.woshipm.com/${item.type}/${item.id}.html`,
              description: item.description || "",
              articleAuthor: item.articleAuthor,
              them: "",
            });
          }
        });
        resolve({
          title: "产品",
          type: "product",
          list: sortDate(result).slice(0, sliceIndex),
        });
      } else {
        console.error(err);
        reject(null);
      }
    });
  });
}

// 获取运营咨询
function getYunyingNews() {
  return new Promise((resolve, reject) => {
    request.get(yunyingUrl, (err, res, body) => {
      console.log('getYunyingNews-body', body)

      // 403?
      if (!err) {
        const $ = cheerio.load(body);
        const newsDom = $(".y-post-list");
        let newList = [];

        newsDom[0]?.children.forEach((item) => {
          const dom = $(item);
          const title = dom.find(".y-title-new a").text();
          const articleAuthor = dom.find(".y-meta-new .author").text();

          title &&
            articleAuthor.indexOf("课堂") === -1 &&
            articleAuthor.indexOf("人人都是产品经理") === -1 &&
            !hasAds(title) &&
            newList.push({
              type: "yunying",
              time: curDate,
              title: title,
              link: dom.find(".y-title-new a").attr("href"),
              description: dom.find(".y-snipper-new").text(),
              them: dom.find(".middotDivider a").text(),
              articleAuthor,
              viewCount: 0,
            });
        });
        const result = {
          title: "运营",
          type: "operations",
          list: newList.slice(0, sliceIndex),
        };
        resolve(result);
      } else {
        console.error(err);
        reject(null);
      }
    });
  });
}

// 获取前端咨询
function getFrontNews() {
  return new Promise((resolve, reject) => {
    request.get(frontNewsUrl, (err, res, body) => {
      if (!err && res.statusCode == 200) {
        const $ = cheerio.load(body);
        const newsList = $("script");
        const regData = /LINKS_DATA[\s]*?=[\s]*?/;
        const reg = /[\;][\n]*[\s]*?$/; //去掉尾部分号
        let sendList = []; //存储推送列表
        const rangeTime = [
          dayjs().subtract(10, "day").format("YYYY-MM-DD"),
          dayjs().format("YYYY-MM-DD"),
        ];
        newsList.map((item) => {
          //取数据LINKS_DATA变量值
          if (newsList[item].children[0]?.data.split(regData)?.[1]) {
            //格式化数据
            const jsonStr = newsList[item].children[0]?.data
              .split(regData)?.[1]
              .split(reg)[0];
            const jsonData = JSON.parse(jsonStr);
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
        const result = [];
        sendList.forEach((item) => {
          if (!hasAds(item.articleTitle)) {
            result.push({
              type: "front",
              time: item.date,
              title: item.title,
              link: item.link,
              description: "",
              articleAuthor: item.source,
              them: "",
            });
          }
        });
        resolve({
          title: "前端",
          type: "front",
          list: sortDate(result).slice(0, sliceIndex),
        });
      } else {
        console.error(err);
        reject(null);
      }
    });
  });
}

// 获取后端咨询
function getCsdnBlogNews() {
  return new Promise((resolve, reject) => {
    request.get(csdnBlogUrl, (err, res, body) => {
      console.log('getCsdnBlogNews-body', err, res, body)
      const data = JSON.parse(body);
      if (!err && data.code == 200) {
        const newList = [];
        data.data.forEach((item) => {
          if (item && !hasAds(item.articleTitle)) {
            newList.push({
              type: "backend ",
              time: item.period?.slice(0, -3),
              title: item.articleTitle,
              link: item.articleDetailUrl,
              description: item.description || "",
              articleAuthor: item.nickName,
              them: "",
              viewCount: item.viewCount,
            });
          }
        });
        const result = {
          title: "后端",
          type: "backend",
          list: newList
            .sort((a, b) => b.viewCount - a.viewCount)
            .slice(0, sliceIndex),
        };
        resolve(result);
      } else {
        console.error(err);
        reject(null);
      }
    });
  });
}

// 获取测试咨询
function getTestNews() {
  return new Promise((resolve, reject) => {
    request(testUtl,{
      method: 'get',
      timeout: 25000
    }, (err, res, body) => {
      console.log('getTestNews-body', body)

      if (!err) {
        const $ = cheerio.load(body);
        const newsDom = $(".blog-content .Community");
        let newList = [];
        newsDom[0]?.children.forEach((item) => {
          const dom = $(item);
          const title = dom.find(".blog-text").text();
          title &&
            !hasAds(title) &&
            newList.push({
              type: "test",
              time: curDate,
              title: title,
              link: dom.find(".content .blog").attr("href"),
              description: dom.find(".desc").text(),
              them: "",
              articleAuthor: dom
                .find(".operation-c a")
                .text()
                ?.replace("作者：", ""),
              viewCount: dom
                .find(".operation-b-img-active .num")
                .first()
                .text()
                ?.replace("赞", ""),
            });
        });
        const result = {
          title: "测试",
          type: "test",
          list: newList
            .sort((a, b) => b.viewCount - a.viewCount)
            .slice(0, sliceIndex),
        };
        resolve(result);
      } else {
        reject(null);
        console.error(err);
      }
    });
  });
}

function formatSendStr(list) {
  let str = "# 每日精选\n\n\n";

  list?.forEach((item) => {
    if (item && item.list?.length > 0) {
      str += `## ${item.title}`;
      item.list.slice(0, sliceIndex).map((item, index) => {
        str += `\n${index + 1}、[${item.title}](${item.link})`;
        //  <font color="comment" > ${item.time}  ${
        //   item.articleAuthor
        // }</font>
      });
      str += `\n\n\n`;
    }
  });

  return str;
}

//推送数据格式化
function formatSendData(list) {
  let markdownData = {
    msgtype: "markdown",
    markdown: {
      content: formatSendStr(list),
    },
  };
  let str = JSON.stringify(markdownData);
  console.log(str, str.length);
  if (str.length > 4096) {
    sliceIndex--;
    return formatSendData(list);
  } else {
    return str;
  }
}

//推送信息
function sendNews(data) {
  request.post(
    webhook,
    {
      body: formatSendData(data),
      headers: {
        "Content-Type": "application/json",
      },
    },
    function (err, resp, body) {
      if (err) {
        console.error(err);
      } else {
        console.log(body);
      }
    }
  );
}

getNews();
